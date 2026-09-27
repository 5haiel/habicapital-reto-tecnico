from typing import Annotated

from fastapi import APIRouter, Header

from app.deps import SessionDep
from app.routers.serializers import movement_to_read
from app.schemas import DepositRequest, MovementRead, TransferRequest
from app.services import ledger

router = APIRouter(prefix="/movements", tags=["movements"])

# Idempotency-Key travels as a header (not in the request body), following
# the same convention as Stripe/most payment APIs: it identifies the HTTP
# request attempt, not a field of the business payload, and a client
# retrying the exact same request after a timeout resends the same header.
IdempotencyKeyHeader = Annotated[str, Header(alias="Idempotency-Key", min_length=1)]


@router.post("/deposit", response_model=MovementRead, status_code=201)
def create_deposit(
    payload: DepositRequest, session: SessionDep, idempotency_key: IdempotencyKeyHeader
) -> MovementRead:
    movement = ledger.deposit(
        session,
        to_account_id=payload.to_account_id,
        amount=payload.amount,
        idempotency_key=idempotency_key,
        description=payload.description,
        tag_name=payload.tag,
    )
    return movement_to_read(session, movement)


@router.post("/transfer", response_model=MovementRead, status_code=201)
def create_transfer(
    payload: TransferRequest, session: SessionDep, idempotency_key: IdempotencyKeyHeader
) -> MovementRead:
    movement = ledger.transfer(
        session,
        from_account_id=payload.from_account_id,
        to_account_id=payload.to_account_id,
        amount=payload.amount,
        idempotency_key=idempotency_key,
        description=payload.description,
        tag_name=payload.tag,
    )
    return movement_to_read(session, movement)
