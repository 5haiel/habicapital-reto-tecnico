"""The logged-in user's own account. There is deliberately no endpoint that
takes an arbitrary account id: balances and history are only ever readable
by their owner.
"""

from fastapi import APIRouter

from app.deps import CurrentUser, SessionDep
from app.models import Account
from app.routers.serializers import movements_to_read
from app.schemas import AccountRead, MovementRead
from app.services import ledger

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/account", response_model=AccountRead)
def read_my_account(user: CurrentUser, session: SessionDep) -> Account:
    return ledger.get_account(session, user.account_id)


@router.get("/movements", response_model=list[MovementRead])
def read_my_movements(user: CurrentUser, session: SessionDep) -> list[MovementRead]:
    movements = ledger.get_movements_for_account(session, user.account_id)
    return movements_to_read(session, movements, viewer_account_id=user.account_id)
