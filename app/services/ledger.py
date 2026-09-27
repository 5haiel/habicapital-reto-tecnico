"""Business logic for moving money. Every write in this module happens
inside a single DB transaction with row-level locking — this is the code
that has to guarantee the system never loses a peso.
"""

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import Account, LedgerEntry, Movement, MovementType, Tag
from app.services.errors import (
    AccountNotFoundError,
    ExternalAccountRestrictedError,
    IdempotencyKeyConflictError,
    InsufficientFundsError,
    MoneySafetyInvariantError,
    SameAccountError,
)


def get_account(session: Session, account_id: int) -> Account:
    account = session.get(Account, account_id)
    if account is None:
        raise AccountNotFoundError(account_id)
    return account


def _get_account_locked(session: Session, account_id: int) -> Account:
    account = session.exec(
        select(Account).where(Account.id == account_id).with_for_update()
    ).first()
    if account is None:
        raise AccountNotFoundError(account_id)
    return account


def get_external_account_id(session: Session) -> int:
    # Selects only the `id` column, not the mapped Account entity. This is
    # deliberate: if this loaded a full Account object into the session's
    # identity map now, a LATER `_get_account_locked` call for that same row
    # (inside _execute_movement, moments later) would find it already
    # present and — per SQLAlchemy's default identity-map behavior — return
    # that SAME cached object without refreshing its attributes from the
    # fresh locked read. The DB lock would still be acquired correctly, but
    # `account.balance` in Python would keep showing the stale value read
    # here, defeating the lock. Selecting a bare column sidesteps that
    # entirely: no ORM entity, nothing to go stale. See decisions.md.
    account_id = session.exec(
        select(Account.id).where(Account.is_external == True)
    ).first()
    if account_id is None:
        raise RuntimeError("External account was not seeded on startup")
    return account_id


def get_or_create_tag(session: Session, name: str | None) -> Tag | None:
    if name is None:
        return None
    clean_name = name.strip()
    if not clean_name:
        return None
    tag = session.exec(select(Tag).where(Tag.name == clean_name)).first()
    if tag is None:
        tag = Tag(name=clean_name)
        session.add(tag)
        session.flush()  # assign tag.id without committing yet
    return tag


def find_movement_by_idempotency_key(session: Session, key: str) -> Movement | None:
    return session.exec(select(Movement).where(Movement.idempotency_key == key)).first()


def _replay_or_conflict(
    existing: Movement,
    *,
    type: MovementType,
    from_account_id: int,
    to_account_id: int,
    amount: int,
) -> Movement:
    """A key that was already processed returns the original movement — but
    only if it describes the same operation. A reused key with a different
    payload is a client bug, and silently returning the old movement would
    make the client believe the new operation happened.
    """
    same_operation = (
        existing.type == type
        and existing.from_account_id == from_account_id
        and existing.to_account_id == to_account_id
        and existing.amount == amount
    )
    if not same_operation:
        raise IdempotencyKeyConflictError()
    return existing


def _execute_movement(
    session: Session,
    *,
    type: MovementType,
    from_account_id: int,
    to_account_id: int,
    amount: int,
    idempotency_key: str,
    description: str | None,
    tag_name: str | None,
    skip_balance_check_for_external: bool,
    from_must_not_be_external: bool,
    to_must_not_be_external: bool,
) -> Movement:
    # Cheap, lock-free early exit: a retried request with a key we've
    # already processed returns the original result instead of moving
    # money twice.
    existing = find_movement_by_idempotency_key(session, idempotency_key)
    if existing is not None:
        return _replay_or_conflict(
            existing,
            type=type,
            from_account_id=from_account_id,
            to_account_id=to_account_id,
            amount=amount,
        )

    if from_account_id == to_account_id:
        raise SameAccountError()

    # Lock both accounts in a fixed order (ascending id), never in the
    # request's from->to order. Two concurrent transfers between the same
    # pair of accounts in opposite directions (A->B and B->A) would
    # otherwise each hold one lock and wait on the other — a deadlock.
    # Locking by a total order everyone agrees on prevents that.
    #
    # Deliberately the ONLY place either account is loaded in this session:
    # callers (deposit/transfer) must not pre-fetch these accounts
    # themselves. Loading an Account via an unlocked query and then loading
    # the same row again here with FOR UPDATE would acquire the DB lock
    # correctly but return the earlier, stale cached object from the
    # session's identity map instead of the fresh one — see
    # get_external_account_id's docstring for why.
    ordered_ids = sorted({from_account_id, to_account_id})
    locked_by_id = {
        acc_id: _get_account_locked(session, acc_id) for acc_id in ordered_ids
    }
    from_account = locked_by_id[from_account_id]
    to_account = locked_by_id[to_account_id]

    if from_must_not_be_external and from_account.is_external:
        raise ExternalAccountRestrictedError()
    if to_must_not_be_external and to_account.is_external:
        raise ExternalAccountRestrictedError()

    exempt_from_balance_check = (
        skip_balance_check_for_external and from_account.is_external
    )
    if not exempt_from_balance_check and from_account.balance < amount:
        raise InsufficientFundsError(from_account_id, amount, from_account.balance)

    tag = get_or_create_tag(session, tag_name)

    movement = Movement(
        type=type,
        from_account_id=from_account_id,
        to_account_id=to_account_id,
        amount=amount,
        description=description,
        tag_id=tag.id if tag else None,
        idempotency_key=idempotency_key,
    )

    # Everything from here down — including the flush that assigns
    # movement.id — is inside the try block. The unique constraint on
    # idempotency_key can be violated as early as this flush (an INSERT is
    # sent immediately), not only at the final commit, so the except below
    # has to cover both.
    try:
        session.add(movement)
        session.flush()  # assigns movement.id, needed by the ledger entries below

        session.add(
            LedgerEntry(
                movement_id=movement.id, account_id=from_account_id, amount=-amount
            )
        )
        session.add(
            LedgerEntry(
                movement_id=movement.id, account_id=to_account_id, amount=amount
            )
        )

        from_account.balance -= amount
        to_account.balance += amount
        session.add(from_account)
        session.add(to_account)

        session.commit()
    except IntegrityError as exc:
        session.rollback()
        # Two plausible causes land here:
        #  (a) a concurrent request with the same idempotency_key committed
        #      first (unique constraint on Movement.idempotency_key) — that
        #      is idempotency working as designed, so we recover and return
        #      the winner's Movement instead of erroring.
        #  (b) a real CHECK-constraint violation (e.g. balance would go
        #      negative) that our application-level check above should have
        #      caught but didn't — that means there's a bug, and it must
        #      fail loudly rather than be swallowed as a "duplicate".
        retry_existing = find_movement_by_idempotency_key(session, idempotency_key)
        if retry_existing is not None:
            return _replay_or_conflict(
                retry_existing,
                type=type,
                from_account_id=from_account_id,
                to_account_id=to_account_id,
                amount=amount,
            )
        raise MoneySafetyInvariantError(str(exc)) from exc

    session.refresh(movement)
    return movement


def deposit(
    session: Session,
    *,
    to_account_id: int,
    amount: int,
    idempotency_key: str,
    description: str | None = None,
    tag_name: str | None = None,
) -> Movement:
    external_id = get_external_account_id(session)
    return _execute_movement(
        session,
        type=MovementType.deposit,
        from_account_id=external_id,
        to_account_id=to_account_id,
        amount=amount,
        idempotency_key=idempotency_key,
        description=description,
        tag_name=tag_name,
        skip_balance_check_for_external=True,
        from_must_not_be_external=False,  # the deposit source IS external, on purpose
        to_must_not_be_external=True,
    )


def transfer(
    session: Session,
    *,
    from_account_id: int,
    to_account_id: int,
    amount: int,
    idempotency_key: str,
    description: str | None = None,
    tag_name: str | None = None,
) -> Movement:
    return _execute_movement(
        session,
        type=MovementType.transfer,
        from_account_id=from_account_id,
        to_account_id=to_account_id,
        amount=amount,
        idempotency_key=idempotency_key,
        description=description,
        tag_name=tag_name,
        skip_balance_check_for_external=False,
        from_must_not_be_external=True,
        to_must_not_be_external=True,
    )


def get_balance(session: Session, account_id: int) -> int:
    return get_account(session, account_id).balance


def get_movements_for_account(session: Session, account_id: int) -> list[Movement]:
    get_account(session, account_id)  # raises AccountNotFoundError if missing
    return list(
        session.exec(
            select(Movement)
            .where(
                (Movement.from_account_id == account_id)
                | (Movement.to_account_id == account_id)
            )
            .order_by(Movement.created_at.desc())
        ).all()
    )
