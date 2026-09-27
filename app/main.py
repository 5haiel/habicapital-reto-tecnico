from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import Session, select

from app.core.config import settings
from app.db import create_db_and_tables, engine
from app.models import Account


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
    create_db_and_tables()
    seed_external_account()
    yield


app = FastAPI(title="HabiCapital - Reto Técnico", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
