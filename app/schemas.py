from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import ExpenseShareStatus, MovementType

PasswordField = Field(min_length=8, max_length=128)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = PasswordField


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = PasswordField


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    account_id: int
    created_at: datetime


class UserPublic(BaseModel):
    """What other people can see about a user: enough to pick them as a
    recipient, never their balance or history.
    """

    account_id: int
    name: str
    email: str


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    balance: int
    created_at: datetime


class Counterparty(BaseModel):
    account_id: int
    name: str


class MovementRead(BaseModel):
    """A movement as seen from one account: `direction` and `counterparty`
    are relative to the viewer. `counterparty` is None for deposits (the
    other side is the internal `external` account, not a person).
    """

    id: int
    type: MovementType
    direction: Literal["in", "out"]
    amount: int
    counterparty: Counterparty | None
    description: str | None
    tag: str | None
    created_at: datetime


class DepositRequest(BaseModel):
    amount: int = Field(gt=0, description="Monto en centavos")
    description: str | None = Field(default=None, max_length=280)
    tag: str | None = Field(default=None, max_length=60)


class TransferRequest(BaseModel):
    """No `from_account_id`: the source is always the logged-in user's own
    account, taken from the session — never from the request.
    """

    to_account_id: int
    amount: int = Field(gt=0, description="Monto en centavos")
    description: str | None = Field(default=None, max_length=280)
    tag: str | None = Field(default=None, max_length=60)


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ExpenseShareCreate(BaseModel):
    account_id: int
    amount_owed: int = Field(gt=0)


class ExpenseCreate(BaseModel):
    """The payer is always the logged-in user."""

    shares: list[ExpenseShareCreate] = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=280)
    tag: str | None = Field(default=None, max_length=60)


class ExpenseShareRead(BaseModel):
    id: int
    account_id: int
    account_name: str
    amount_owed: int
    status: ExpenseShareStatus
    settlement_movement_id: int | None


class ExpenseRead(BaseModel):
    id: int
    payer_account_id: int
    payer_name: str
    total_amount: int
    description: str | None
    tag: str | None
    created_at: datetime
    shares: list[ExpenseShareRead]
