from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class MovementType(str, Enum):
    deposit = "deposit"
    transfer = "transfer"


class ExpenseShareStatus(str, Enum):
    pending = "pending"
    paid = "paid"


class Account(SQLModel, table=True):
    """A balance holder. `balance` is a cached projection kept in sync with
    LedgerEntry inside the same DB transaction — the ledger is the source of
    truth, this column exists for fast reads and as a DB-level safety net
    (CHECK balance >= 0) against ever going negative.
    """

    __tablename__ = "account"
    __table_args__ = (
        CheckConstraint(
            "is_external OR balance >= 0", name="ck_account_balance_non_negative"
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    name: str
    balance: int = Field(default=0)  # cents
    is_external: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)


class User(SQLModel, table=True):
    """Identity of a person, kept separate from Account on purpose: Account
    is the ledger's balance holder (and `external` has no owner), User is
    who can log in and act on exactly one Account.
    """

    __tablename__ = "app_user"  # `user` is a reserved word in Postgres

    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)  # always stored lowercased
    password_hash: str
    account_id: int = Field(foreign_key="account.id", unique=True)
    created_at: datetime = Field(default_factory=utcnow)


class Tag(SQLModel, table=True):
    __tablename__ = "tag"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=utcnow)


class Movement(SQLModel, table=True):
    """One business operation (a deposit or a transfer). Always produces
    exactly two LedgerEntry rows (one debit, one credit) that must sum to 0.
    """

    __tablename__ = "movement"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_movement_amount_positive"),
    )

    id: int | None = Field(default=None, primary_key=True)
    type: MovementType
    from_account_id: int = Field(foreign_key="account.id")
    to_account_id: int = Field(foreign_key="account.id")
    amount: int  # cents
    description: str | None = Field(default=None)
    tag_id: int | None = Field(default=None, foreign_key="tag.id")
    idempotency_key: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=utcnow)


class LedgerEntry(SQLModel, table=True):
    """Immutable audit trail. Never updated or deleted. `amount` is signed:
    positive = credit to account_id, negative = debit from account_id.
    """

    __tablename__ = "ledger_entry"

    id: int | None = Field(default=None, primary_key=True)
    movement_id: int = Field(foreign_key="movement.id")
    account_id: int = Field(foreign_key="account.id")
    amount: int  # cents, signed
    created_at: datetime = Field(default_factory=utcnow)


class Expense(SQLModel, table=True):
    """A group expense fronted by one account, split across others."""

    __tablename__ = "expense"

    id: int | None = Field(default=None, primary_key=True)
    payer_account_id: int = Field(foreign_key="account.id")
    total_amount: int  # cents
    description: str | None = Field(default=None)
    tag_id: int | None = Field(default=None, foreign_key="tag.id")
    created_at: datetime = Field(default_factory=utcnow)


class ExpenseShare(SQLModel, table=True):
    """One participant's portion of an Expense. Settling it creates a real
    Movement/LedgerEntry — this table only tracks the debt, it never moves
    money on its own.
    """

    __tablename__ = "expense_share"
    __table_args__ = (
        CheckConstraint("amount_owed > 0", name="ck_expense_share_amount_positive"),
    )

    id: int | None = Field(default=None, primary_key=True)
    expense_id: int = Field(foreign_key="expense.id")
    account_id: int = Field(foreign_key="account.id")
    amount_owed: int  # cents
    status: ExpenseShareStatus = Field(default=ExpenseShareStatus.pending)
    settlement_movement_id: int | None = Field(default=None, foreign_key="movement.id")
    created_at: datetime = Field(default_factory=utcnow)
