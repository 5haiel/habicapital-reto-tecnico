from sqlalchemy import func
from sqlmodel import select

from app.models import Account, LedgerEntry, Movement
from tests.helpers import signup


def test_deposit_credits_my_account(make_client):
    ana = signup(make_client, "Ana")
    response = ana.deposit(10_000, "dep-1", tag="salario")
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "deposit"
    assert body["amount"] == 10_000
    assert body["tag"] == "salario"
    assert ana.balance() == 10_000


def test_deposit_requires_session(client):
    response = client.post(
        "/movements/deposit", json={"amount": 100}, headers={"Idempotency-Key": "k"}
    )
    assert response.status_code == 401


def test_transfer_moves_balance_between_accounts(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    ana.deposit(10_000, "dep-1")

    response = ana.transfer(beto, 3_000, "tr-1", tag="cena")
    assert response.status_code == 201
    assert response.json()["direction"] == "out"

    assert ana.balance() == 7_000
    assert beto.balance() == 3_000


def test_transfer_with_insufficient_funds_is_rejected_with_no_side_effects(
    make_client, session
):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    ana.deposit(1_000, "dep-1")

    response = ana.transfer(beto, 5_000, "tr-1")
    assert response.status_code == 422
    assert response.json()["code"] == "insufficient_funds"
    assert response.json()["detail"] == "Saldo insuficiente para esta operación."

    # No partial effects: balances untouched, no movement recorded.
    assert ana.balance() == 1_000
    assert beto.balance() == 0
    assert len(session.exec(select(Movement)).all()) == 1  # only the deposit


def test_transfer_to_myself_is_rejected(make_client):
    ana = signup(make_client, "Ana")
    ana.deposit(1_000, "dep-1")
    response = ana.transfer(ana, 500, "tr-1")
    assert response.status_code == 422
    assert response.json()["code"] == "same_account"


def test_transfer_to_missing_account_is_rejected(make_client):
    ana = signup(make_client, "Ana")
    ana.deposit(1_000, "dep-1")
    response = ana.transfer(999_999, 500, "tr-1")
    assert response.status_code == 404
    assert ana.balance() == 1_000


def test_transfer_cannot_target_external_account(make_client, session):
    ana = signup(make_client, "Ana")
    ana.deposit(1_000, "dep-1")
    external = session.exec(select(Account).where(Account.is_external == True)).one()

    response = ana.transfer(external.id, 100, "tr-1")
    assert response.status_code == 422
    assert ana.balance() == 1_000


def test_retrying_same_idempotency_key_does_not_duplicate_transfer(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    ana.deposit(10_000, "dep-1")

    first = ana.transfer(beto, 3_000, "tr-1")
    second = ana.transfer(beto, 3_000, "tr-1")

    assert first.json()["id"] == second.json()["id"]
    assert ana.balance() == 7_000
    assert beto.balance() == 3_000


def test_reusing_idempotency_key_for_a_different_amount_is_rejected(make_client):
    """Returning the original movement here would make the client believe
    the *new* 5.000 transfer happened, when nothing moved.
    """
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    ana.deposit(10_000, "dep-1")
    ana.transfer(beto, 3_000, "tr-1")

    response = ana.transfer(beto, 5_000, "tr-1")

    assert response.status_code == 422
    assert response.json()["code"] == "idempotency_key_conflict"
    assert ana.balance() == 7_000


def test_idempotency_keys_are_scoped_per_user(make_client):
    """Two users picking the same key are two different requests: Beto's
    transfer must really execute, and he must not get Ana's movement back.
    """
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    carla = signup(make_client, "Carla")
    ana.deposit(10_000, "same-key")
    beto.deposit(10_000, "same-key")

    ana_tr = ana.transfer(carla, 1_000, "tr-shared")
    beto_tr = beto.transfer(carla, 2_000, "tr-shared")

    assert beto_tr.status_code == 201
    assert beto_tr.json()["id"] != ana_tr.json()["id"]
    assert carla.balance() == 3_000


def test_history_returns_movements_newest_first(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    d = ana.deposit(10_000, "dep-1").json()["id"]
    t1 = ana.transfer(beto, 1_000, "tr-1").json()["id"]
    t2 = ana.transfer(beto, 1_000, "tr-2").json()["id"]

    history = ana.client.get("/me/movements").json()
    assert [m["id"] for m in history] == [t2, t1, d]


def test_ledger_always_sums_to_zero_across_the_whole_system(make_client, session):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    carla = signup(make_client, "Carla")
    ana.deposit(10_000, "dep-1")
    beto.deposit(5_000, "dep-2")
    ana.transfer(beto, 2_000, "tr-1")
    beto.transfer(carla, 1_500, "tr-2")

    total = session.execute(
        select(func.coalesce(func.sum(LedgerEntry.amount), 0))
    ).scalar_one()
    assert total == 0
