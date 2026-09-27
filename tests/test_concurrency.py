"""These tests intentionally bypass the `client`/`session` fixtures and open
one independent `Session` (one real Postgres connection) per thread, calling
the service layer directly. That is the only way to actually exercise row
locking and the idempotency race — a single shared connection would just
serialize everything and prove nothing.
"""

from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager

from sqlalchemy import func, select
from sqlmodel import Session, SQLModel

from app.models import Account, ExpenseShare, LedgerEntry
from app.services import expenses, ledger
from app.services.errors import InsufficientFundsError


@contextmanager
def _fresh_accounts(test_engine, **initial_balances: int) -> Iterator[dict[str, int]]:
    """Wipes all tables and creates `external` plus one account per kwarg,
    funded to the given balance via a real deposit. Returns a name->id map.
    """
    with Session(test_engine) as s:
        for table in reversed(SQLModel.metadata.sorted_tables):
            s.execute(table.delete())
        s.commit()
        s.add(Account(name="external", is_external=True))
        s.commit()

        ids: dict[str, int] = {}
        for name in initial_balances:
            acc = Account(name=name)
            s.add(acc)
            s.commit()
            s.refresh(acc)
            ids[name] = acc.id

        for name, amount in initial_balances.items():
            if amount:
                ledger.deposit(
                    s,
                    to_account_id=ids[name],
                    amount=amount,
                    idempotency_key=f"fund-{name}",
                )

    yield ids


def test_concurrent_transfers_never_overdraw_the_source_account(test_engine):
    with _fresh_accounts(test_engine, source=10_000, dest=0) as ids:
        source_id, dest_id = ids["source"], ids["dest"]

        def attempt(i: int) -> str:
            with Session(test_engine) as s:
                try:
                    ledger.transfer(
                        s,
                        from_account_id=source_id,
                        to_account_id=dest_id,
                        amount=1_000,
                        idempotency_key=f"race-{i}",
                    )
                    return "ok"
                except InsufficientFundsError:
                    return "insufficient"

        with ThreadPoolExecutor(max_workers=20) as pool:
            results = list(pool.map(attempt, range(20)))

        # Exactly 10 transfers of 1000 fit in a balance of 10000. If locking
        # didn't work, more than 10 could succeed and the source would go
        # negative.
        assert results.count("ok") == 10
        assert results.count("insufficient") == 10

        with Session(test_engine) as verify:
            source = verify.get(Account, source_id)
            dest = verify.get(Account, dest_id)
            assert source.balance == 0
            assert dest.balance == 10_000
            assert source.balance >= 0  # the invariant that actually matters

            total_ledger = verify.execute(
                select(func.coalesce(func.sum(LedgerEntry.amount), 0))
            ).scalar_one()
            assert total_ledger == 0


def test_no_deadlock_on_opposite_direction_concurrent_transfers(test_engine):
    """Two transfers in opposite directions between the same pair of
    accounts, fired at the same time, must not deadlock. This is what the
    fixed lock ordering (always lock by ascending account id, never by
    from->to order) exists to prevent — see decisions.md.
    """
    with _fresh_accounts(test_engine, x=5_000, y=5_000) as ids:
        x_id, y_id = ids["x"], ids["y"]

        def x_to_y() -> None:
            with Session(test_engine) as s:
                ledger.transfer(
                    s,
                    from_account_id=x_id,
                    to_account_id=y_id,
                    amount=100,
                    idempotency_key="xy",
                )

        def y_to_x() -> None:
            with Session(test_engine) as s:
                ledger.transfer(
                    s,
                    from_account_id=y_id,
                    to_account_id=x_id,
                    amount=100,
                    idempotency_key="yx",
                )

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(x_to_y), pool.submit(y_to_x)]
            # If the lock ordering were wrong, Postgres would eventually
            # detect the deadlock itself and raise — but we also bound it
            # with a timeout so a real hang fails the test instead of
            # stalling the suite.
            for future in futures:
                future.result(timeout=10)

        with Session(test_engine) as verify:
            assert verify.get(Account, x_id).balance == 5_000
            assert verify.get(Account, y_id).balance == 5_000


def test_concurrent_identical_requests_settle_to_a_single_movement(test_engine):
    """Simulates a client that retries the exact same request (same
    Idempotency-Key) before the first attempt's response comes back —
    several requests genuinely in flight at once, not sequential retries.
    """
    with _fresh_accounts(test_engine, source=5_000, dest=0) as ids:
        source_id, dest_id = ids["source"], ids["dest"]

        def attempt(_: int) -> int:
            with Session(test_engine) as s:
                movement = ledger.transfer(
                    s,
                    from_account_id=source_id,
                    to_account_id=dest_id,
                    amount=500,
                    idempotency_key="duplicate-key",
                )
                return movement.id

        with ThreadPoolExecutor(max_workers=8) as pool:
            movement_ids = list(pool.map(attempt, range(8)))

        assert (
            len(set(movement_ids)) == 1
        )  # every attempt resolved to the same Movement

        with Session(test_engine) as verify:
            # Debited exactly once, not 8 times.
            assert verify.get(Account, source_id).balance == 4_500
            assert verify.get(Account, dest_id).balance == 500


def test_concurrent_settle_of_the_same_share_pays_it_exactly_once(test_engine):
    """settle_share() has no explicit lock on ExpenseShare — it relies on
    the deterministic idempotency key it hands to ledger.transfer (derived
    from share_id) to make concurrent settlement attempts converge on a
    single real transfer. See expenses.py's settle_share docstring for why
    a lock here wouldn't actually help (ledger.transfer commits its own
    transaction internally). This test is what actually backs that claim.
    """
    with _fresh_accounts(test_engine, payer=0, debtor=5_000) as ids:
        payer_id, debtor_id = ids["payer"], ids["debtor"]

        with Session(test_engine) as s:
            expense = expenses.create_expense(
                s, payer_account_id=payer_id, shares=[(debtor_id, 1_500)]
            )
            share_id = expenses.get_expense_shares(s, expense.id)[0].id
            expense_id = expense.id

        def attempt(_: int) -> int:
            with Session(test_engine) as s:
                share = expenses.settle_share(
                    s,
                    expense_id=expense_id,
                    share_id=share_id,
                    acting_account_id=debtor_id,
                )
                return share.settlement_movement_id

        with ThreadPoolExecutor(max_workers=8) as pool:
            movement_ids = list(pool.map(attempt, range(8)))

        assert len(set(movement_ids)) == 1  # every attempt agrees on the same Movement

        with Session(test_engine) as verify:
            assert verify.get(Account, debtor_id).balance == 3_500  # debited once
            assert verify.get(Account, payer_id).balance == 1_500  # credited once
            share = verify.get(ExpenseShare, share_id)
            assert share.status.value == "paid"

            total_ledger = verify.execute(
                select(func.coalesce(func.sum(LedgerEntry.amount), 0))
            ).scalar_one()
            assert total_ledger == 0
