"""Proves the CHECK constraints are a real safety net, not just decoration:
writes a negative balance directly with raw SQL, completely bypassing
app/services/ledger.py, and confirms Postgres itself rejects it. If the
application-level check in ledger.py ever has a bug, this is what actually
stands between a bug and a lost peso.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.models import Account


def test_negative_balance_is_rejected_by_the_database_itself(session):
    account = Account(name="Test", balance=100)
    session.add(account)
    session.commit()
    session.refresh(account)

    with pytest.raises(IntegrityError, match="ck_account_balance_non_negative"):
        session.execute(
            text("UPDATE account SET balance = -1 WHERE id = :id"), {"id": account.id}
        )
        session.commit()
    session.rollback()


def test_zero_or_negative_movement_amount_is_rejected_by_the_database(session):
    account = Account(name="Test", balance=100)
    external = session.exec(select(Account).where(Account.is_external == True)).first()
    session.add(account)
    session.commit()
    session.refresh(account)

    with pytest.raises(IntegrityError, match="ck_movement_amount_positive"):
        session.execute(
            text(
                "INSERT INTO movement "
                "(type, from_account_id, to_account_id, amount, idempotency_key, created_at) "
                "VALUES ('transfer', :from_id, :to_id, 0, 'bad-amount', now())"
            ),
            {"from_id": external.id, "to_id": account.id},
        )
        session.commit()
    session.rollback()
