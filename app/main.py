from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session, select

from app.core.config import settings
from app.db import engine
from app.models import Account
from app.routers import accounts, expenses, movements, tags
from app.services.errors import (
    AccountNotFoundError,
    DomainError,
    ExpenseNotFoundError,
    ExpenseShareNotFoundError,
    ExternalAccountRestrictedError,
    InsufficientFundsError,
    MoneySafetyInvariantError,
    SameAccountError,
)

# Maps each domain error to the HTTP status that represents it. 404 for a
# missing resource; 422 for a request that is well-formed but violates a
# business rule; 500 for MoneySafetyInvariantError specifically, because
# that one means the application's own pre-checks let something through
# that the database then had to reject — that is a bug, not a client error,
# and should not be reported as if the client did something wrong.
_DOMAIN_ERROR_STATUS: dict[type[DomainError], int] = {
    AccountNotFoundError: 404,
    ExpenseNotFoundError: 404,
    ExpenseShareNotFoundError: 404,
    InsufficientFundsError: 422,
    SameAccountError: 422,
    ExternalAccountRestrictedError: 422,
    MoneySafetyInvariantError: 500,
}


def seed_external_account() -> None:
    with Session(engine) as session:
        existing = session.exec(
            select(Account).where(Account.is_external == True)
        ).first()
        if existing is None:
            session.add(Account(name=settings.external_account_name, is_external=True))
            session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is owned by Alembic migrations (`uv run alembic upgrade head`),
    # not created here — the app assumes the schema already exists, the way
    # it would against a real production database.
    seed_external_account()
    yield


app = FastAPI(title="HabiCapital - Reto Técnico", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DomainError)
def handle_domain_error(request: Request, exc: DomainError) -> JSONResponse:
    status_code = _DOMAIN_ERROR_STATUS.get(type(exc), 400)
    return JSONResponse(status_code=status_code, content={"detail": str(exc)})


app.include_router(accounts.router)
app.include_router(movements.router)
app.include_router(tags.router)
app.include_router(expenses.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
