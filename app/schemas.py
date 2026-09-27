from datetime import datetime

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


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    balance: int
    is_external: bool
    created_at: datetime


class MovementRead(BaseModel):
    id: int
    type: MovementType
    from_account_id: int
    to_account_id: int
    amount: int
    description: str | None
    tag: str | None
    idempotency_key: str
    created_at: datetime


class DepositRequest(BaseModel):
    to_account_id: int
    amount: int = Field(gt=0, description="Monto en centavos")
    description: str | None = Field(default=None, max_length=280)
    tag: str | None = Field(default=None, max_length=60)


class TransferRequest(BaseModel):
    from_account_id: int
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
    payer_account_id: int
    shares: list[ExpenseShareCreate] = Field(min_length=1)
    description: str | None = Field(default=None, max_length=280)
    tag: str | None = Field(default=None, max_length=60)


class ExpenseShareRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    amount_owed: int
    status: ExpenseShareStatus
    settlement_movement_id: int | None


class ExpenseRead(BaseModel):
    id: int
    payer_account_id: int
    total_amount: int
    description: str | None
    tag: str | None
    created_at: datetime
    shares: list[ExpenseShareRead]
