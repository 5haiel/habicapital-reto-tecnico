import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session, select

from app.core.config import settings
from app.db import engine
from app.models import Account
from app.routers import auth, expenses, me, movements, tags, users
from app.services.errors import DomainError, MoneySafetyInvariantError

logger = logging.getLogger(__name__)


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
    if isinstance(exc, MoneySafetyInvariantError):
        logger.error("Money-safety invariant violated: %s", exc.internal_detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code},
    )


@app.exception_handler(RequestValidationError)
def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # Same {detail, code} shape as domain errors so the client has a single
    # error contract; the raw field errors stay available under `errors`.
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Revisa los datos enviados.",
            "code": "validation_error",
            "errors": jsonable_encoder(exc.errors()),
        },
    )


app.include_router(auth.router)
app.include_router(me.router)
app.include_router(users.router)
app.include_router(movements.router)
app.include_router(tags.router)
app.include_router(expenses.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
