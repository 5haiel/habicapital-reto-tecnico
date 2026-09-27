"""Test setup notes:

- Tests run against a real, separate Postgres database (`habicapital_test`)
  on the same local server as dev — not SQLite. The whole point of choosing
  Postgres for this project is real row-level locking and real CHECK
  constraints; a SQLite-backed test suite couldn't prove either.
- `test_engine` (session-scoped) creates that database once and builds the
  schema in it.
- `session` (function-scoped) truncates every table and reseeds the
  `external` account before each test, so tests don't leak state into each
  other despite sharing one long-lived database.
- Concurrency tests intentionally do NOT use the `session` fixture — a
  single `Session` holds one DB connection, so reusing it across threads
  would serialize everything and prove nothing. They open their own
  `Session(test_engine)` per thread instead, so each is a real, independent
  Postgres connection.
"""

from collections.abc import Callable, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlmodel import Session, SQLModel

from app.core.config import settings
from app.deps import get_session
from app.main import app
from app.models import Account

TEST_DB_NAME = "habicapital_test"


def _admin_url() -> str:
    base = settings.database_url.rsplit("/", 1)[0]
    return f"{base}/postgres"


def _test_db_url() -> str:
    base = settings.database_url.rsplit("/", 1)[0]
    return f"{base}/{TEST_DB_NAME}"


@pytest.fixture(scope="session")
def test_engine():
    admin_engine = create_engine(_admin_url(), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB_NAME}"))
        conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))
    admin_engine.dispose()

    engine = create_engine(_test_db_url(), pool_size=20, max_overflow=0)
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(test_engine) -> Generator[Session, None, None]:
    with Session(test_engine) as s:
        for table in reversed(SQLModel.metadata.sorted_tables):
            s.execute(table.delete())
        s.commit()
        s.add(Account(name="external", is_external=True))
        s.commit()
        yield s


@pytest.fixture
def make_client(session: Session) -> Generator[Callable[[], TestClient], None, None]:
    """Factory for independent clients — each has its own cookie jar, so
    each one can be logged in as a different user within the same test.
    """

    def get_session_override() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = get_session_override
    yield lambda: TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client(make_client) -> TestClient:
    return make_client()
