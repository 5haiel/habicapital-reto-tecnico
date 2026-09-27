"""Group expense splitting, built on top of the ledger service instead of
moving money on its own. An Expense/ExpenseShare only ever *tracks* a debt —
settling a share always goes through `ledger.transfer`, so the ledger stays
the single source of truth for money and this module never duplicates that
logic. See decisions.md, "Feature elegida: tags + split de gasto".
"""

from sqlmodel import Session, select

from app.models import Expense, ExpenseShare, ExpenseShareStatus
from app.services import ledger
from app.services.errors import ExpenseNotFoundError, ExpenseShareNotFoundError


def get_expense(session: Session, expense_id: int) -> Expense:
    expense = session.get(Expense, expense_id)
    if expense is None:
        raise ExpenseNotFoundError(expense_id)
    return expense


def list_expenses(session: Session) -> list[Expense]:
    return list(session.exec(select(Expense).order_by(Expense.created_at.desc())).all())


def get_expense_shares(session: Session, expense_id: int) -> list[ExpenseShare]:
    return list(
        session.exec(
            select(ExpenseShare).where(ExpenseShare.expense_id == expense_id)
        ).all()
    )


def create_expense(
    session: Session,
    *,
    payer_account_id: int,
    shares: list[tuple[int, int]],  # (account_id, amount_owed) pairs
    description: str | None = None,
    tag_name: str | None = None,
) -> Expense:
    # payer_account_id isn't locked/validated here on purpose: it is only
    # ever used later as the *destination* of a settlement transfer, and
    # `ledger.transfer` already validates and locks it properly at that
    # point (see decisions.md on why an unlocked pre-check would be a bug).
    total_amount = sum(amount for _, amount in shares)

    tag = ledger.get_or_create_tag(session, tag_name)

    expense = Expense(
        payer_account_id=payer_account_id,
        total_amount=total_amount,
        description=description,
        tag_id=tag.id if tag else None,
    )
    session.add(expense)
    session.flush()  # assigns expense.id

    for account_id, amount_owed in shares:
        session.add(
            ExpenseShare(
                expense_id=expense.id,
                account_id=account_id,
                amount_owed=amount_owed,
            )
        )

    session.commit()
    session.refresh(expense)
    return expense


def _get_share_or_404(session: Session, expense_id: int, share_id: int) -> ExpenseShare:
    share = session.get(ExpenseShare, share_id)
    if share is None or share.expense_id != expense_id:
        raise ExpenseShareNotFoundError(expense_id, share_id)
    return share


def settle_share(session: Session, *, expense_id: int, share_id: int) -> ExpenseShare:
    """Pays one participant's share of an expense: a real transfer from
    their account to the payer's account.

    No client-supplied Idempotency-Key here — unlike a generic transfer,
    "settle share #N" is idempotent by construction: the key handed to
    `ledger.transfer` is deterministic (derived from share_id), so however
    many times this is called — including genuinely concurrently — at most
    one transfer ever happens. That sidesteps a real composition problem:
    `ledger.transfer` commits its own transaction internally, so holding a
    lock on the ExpenseShare row across that call wouldn't actually protect
    anything (the lock would be released mid-operation, at transfer's own
    commit). Piggybacking on the ledger's own idempotency guarantee — proven
    under real concurrency in test_concurrency.py — is what actually closes
    the race, not a lock here.
    """
    expense = get_expense(session, expense_id)
    share = _get_share_or_404(session, expense_id, share_id)

    if share.status == ExpenseShareStatus.paid:
        return share  # already settled: a no-op, not an error

    movement = ledger.transfer(
        session,
        from_account_id=share.account_id,
        to_account_id=expense.payer_account_id,
        amount=share.amount_owed,
        idempotency_key=f"expense-share-settle-{share.id}",
        description=f"Pago de parte del gasto #{expense.id}",
        tag_name=None,
    )

    share.status = ExpenseShareStatus.paid
    share.settlement_movement_id = movement.id
    session.add(share)
    session.commit()
    session.refresh(share)
    return share
