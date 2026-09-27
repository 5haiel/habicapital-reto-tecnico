"""Nobody can move, see or settle money that isn't theirs. With the old
open API, any of these was one request away for anyone who knew an id.
"""

from sqlalchemy import func
from sqlmodel import select

from app.models import LedgerEntry
from tests.helpers import signup


def test_transfer_source_is_always_the_logged_in_user(make_client):
    """A client that still sends `from_account_id` (e.g. a tampered request
    trying to spend someone else's balance) can't choose the source: the
    field is ignored and the money comes out of the caller's own account.
    """
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    mallory = signup(make_client, "Mallory")
    ana.deposit(10_000, "d1")
    mallory.deposit(500, "d2")

    response = mallory.client.post(
        "/movements/transfer",
        json={
            "from_account_id": ana.account_id,
            "to_account_id": beto.account_id,
            "amount": 5_000,
        },
        headers={"Idempotency-Key": "steal"},
    )

    assert response.status_code == 422  # Mallory only has 500
    assert ana.balance() == 10_000
    assert beto.balance() == 0


def test_cannot_settle_someone_elses_share(make_client):
    """Settling moves money out of the debtor's account, so only the debtor
    can do it — not the payer, not a third party.
    """
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    beto.deposit(5_000, "d1")
    expense = ana.create_expense([(beto, 1_500)]).json()
    share_id = expense["shares"][0]["id"]

    response = ana.settle(expense["id"], share_id)

    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"
    assert beto.balance() == 5_000
    assert ana.balance() == 0


def test_outsiders_cannot_see_or_touch_an_expense(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    mallory = signup(make_client, "Mallory")
    beto.deposit(5_000, "d1")
    expense = ana.create_expense([(beto, 1_500)]).json()
    share_id = expense["shares"][0]["id"]

    assert mallory.client.get("/expenses").json() == []
    # 404, not 403: an outsider can't even learn the expense exists.
    assert mallory.client.get(f"/expenses/{expense['id']}").status_code == 404
    assert mallory.settle(expense["id"], share_id).status_code == 404
    assert beto.balance() == 5_000


def test_participants_see_the_expense_they_are_part_of(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    expense = ana.create_expense([(beto, 1_500)]).json()

    assert [e["id"] for e in beto.client.get("/expenses").json()] == [expense["id"]]


def test_each_user_only_sees_their_own_history(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    carla = signup(make_client, "Carla")
    ana.deposit(10_000, "d1")
    ana.transfer(beto, 1_000, "t1")

    assert carla.client.get("/me/movements").json() == []
    assert len(beto.client.get("/me/movements").json()) == 1


def test_ledger_still_sums_to_zero_after_rejected_attacks(make_client, session):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    ana.deposit(10_000, "d1")
    beto.deposit(3_000, "d2")
    expense = ana.create_expense([(beto, 1_500)]).json()
    ana.settle(expense["id"], expense["shares"][0]["id"])  # forbidden
    beto.transfer(ana, 99_999, "too-much")  # insufficient funds
    beto.settle(expense["id"], expense["shares"][0]["id"])  # legit

    total = session.execute(
        select(func.coalesce(func.sum(LedgerEntry.amount), 0))
    ).scalar_one()
    assert total == 0
    assert ana.balance() + beto.balance() == 13_000
