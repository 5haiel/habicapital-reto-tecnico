from fastapi import APIRouter
from sqlmodel import select

from app.deps import SessionDep
from app.models import Account
from app.routers.serializers import movements_to_read
from app.schemas import AccountCreate, AccountRead, MovementRead
from app.services import ledger

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=AccountRead, status_code=201)
def create_account(payload: AccountCreate, session: SessionDep) -> Account:
    account = Account(name=payload.name)
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.get("", response_model=list[AccountRead])
def list_accounts(session: SessionDep) -> list[Account]:
    # `external` is an internal implementation detail (see decisions.md),
    # not a real user-facing account — never listed via the API.
    return list(
        session.exec(
            select(Account).where(Account.is_external == False).order_by(Account.name)
        ).all()
    )


@router.get("/{account_id}", response_model=AccountRead)
def read_account(account_id: int, session: SessionDep) -> Account:
    return ledger.get_account(session, account_id)


@router.get("/{account_id}/movements", response_model=list[MovementRead])
def read_account_movements(account_id: int, session: SessionDep) -> list[MovementRead]:
    movements = ledger.get_movements_for_account(session, account_id)
    return movements_to_read(session, movements)
