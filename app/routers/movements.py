from typing import Annotated

from fastapi import APIRouter, Header

from app.deps import CurrentUser, SessionDep
from app.routers.serializers import movement_to_read
from app.schemas import DepositRequest, MovementRead, TransferRequest
from app.services import ledger

router = APIRouter(prefix="/movements", tags=["movements"])

# Idempotency-Key travels as a header (not in the request body), following
# the same convention as Stripe/most payment APIs: it identifies the HTTP
# request attempt, not a field of the business payload, and a client
# retrying the exact same request after a timeout resends the same header.
IdempotencyKeyHeader = Annotated[
    str, Header(alias="Idempotency-Key", min_length=1, max_length=200)
]


def _scoped_key(account_id: int, client_key: str) -> str:
    # Keys are unique system-wide in the DB, but a client only owns its own
    # keys: namespacing by the acting account means one user can never
    # "replay" (and thereby read) another user's movement by sending their key.
    return f"acct-{account_id}:{client_key}"


@router.post("/deposit", response_model=MovementRead, status_code=201)
def create_deposit(
    payload: DepositRequest,
    user: CurrentUser,
    session: SessionDep,
    idempotency_key: IdempotencyKeyHeader,
) -> MovementRead:
    movement = ledger.deposit(
        session,
        to_account_id=user.account_id,
        amount=payload.amount,
        idempotency_key=_scoped_key(user.account_id, idempotency_key),
        description=payload.description,
        tag_name=payload.tag,
    )
    return movement_to_read(session, movement, viewer_account_id=user.account_id)


@router.post("/transfer", response_model=MovementRead, status_code=201)
def create_transfer(
    payload: TransferRequest,
    user: CurrentUser,
    session: SessionDep,
    idempotency_key: IdempotencyKeyHeader,
) -> MovementRead:
    movement = ledger.transfer(
        session,
        from_account_id=user.account_id,
        to_account_id=payload.to_account_id,
        amount=payload.amount,
        idempotency_key=_scoped_key(user.account_id, idempotency_key),
        description=payload.description,
        tag_name=payload.tag,
    )
    return movement_to_read(session, movement, viewer_account_id=user.account_id)
