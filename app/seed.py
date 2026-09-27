"""Demo data for local runs, the video and the interview.

    uv run python -m app.seed            # adds demo users if missing
    uv run python -m app.seed --reset    # wipes ALL data first (local only)

Goes through the same services as the API (auth.register, ledger.deposit,
ledger.transfer, expenses.*), so demo data obeys every money rule and the
ledger still sums to zero.
"""

import sys

from sqlmodel import Session, SQLModel

from app.core.config import settings
from app.db import engine
from app.main import seed_external_account
from app.models import Account
from app.services import auth, expenses, ledger

DEMO_PASSWORD = "habicapital123"
DEMO_USERS = [
    ("Ana Gómez", "ana@demo.co"),
    ("Beto Ramírez", "beto@demo.co"),
    ("Carla Díaz", "carla@demo.co"),
]


def _reset(session: Session) -> None:
    for table in reversed(SQLModel.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    session.add(Account(name=settings.external_account_name, is_external=True))
    session.commit()


def seed(reset: bool = False) -> None:
    with Session(engine) as session:
        if reset:
            _reset(session)
        else:
            seed_external_account()

        if auth.get_user_by_email(session, DEMO_USERS[0][1]) is not None:
            print("Los usuarios demo ya existen; nada que hacer.")
            return

        ana, beto, carla = (
            auth.register(session, name=name, email=email, password=DEMO_PASSWORD)
            for name, email in DEMO_USERS
        )
        a, b, c = ana.account_id, beto.account_id, carla.account_id

        def deposit(account_id: int, amount: int, key: str, tag: str) -> None:
            ledger.deposit(
                session,
                to_account_id=account_id,
                amount=amount,
                idempotency_key=f"seed-{key}",
                tag_name=tag,
            )

        def transfer(src: int, dst: int, amount: int, key: str, **kw) -> None:
            ledger.transfer(
                session,
                from_account_id=src,
                to_account_id=dst,
                amount=amount,
                idempotency_key=f"seed-{key}",
                **kw,
            )

        # Amounts in cents (COP): 1.500.000,00 = 150_000_000
        deposit(a, 150_000_000, "dep-ana", "salario")
        deposit(b, 80_000_000, "dep-beto", "salario")
        deposit(c, 60_000_000, "dep-carla", "clases")

        transfer(b, a, 12_000_000, "tr-1", description="Mercado", tag_name="casa")
        transfer(
            a, c, 4_500_000, "tr-2", description="Clase de inglés", tag_name="clases"
        )

        # Ana paid the birthday dinner; Beto already paid his part, Carla hasn't.
        dinner = expenses.create_expense(
            session,
            payer_account_id=a,
            shares=[(b, 8_500_000), (c, 8_500_000)],
            description="Cena de cumpleaños",
            tag_name="cena",
        )
        beto_share = next(
            s
            for s in expenses.get_expense_shares(session, dinner.id)
            if s.account_id == b
        )
        expenses.settle_share(
            session, expense_id=dinner.id, share_id=beto_share.id, acting_account_id=b
        )

        # Carla paid the internet bill; Ana owes her part (a pending request
        # waiting on Ana's home screen).
        expenses.create_expense(
            session,
            payer_account_id=c,
            shares=[(a, 6_000_000)],
            description="Internet del apartamento",
            tag_name="servicios",
        )

    print(f"Usuarios demo creados (contraseña: {DEMO_PASSWORD}):")
    for name, email in DEMO_USERS:
        print(f"  {name:<14} {email}")


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
