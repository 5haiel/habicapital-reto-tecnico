from sqlalchemy import func
from sqlmodel import select

from app.models import Account, LedgerEntry


def _create_account(client, name: str) -> int:
    return client.post("/accounts", json={"name": name}).json()["id"]


def _deposit(client, account_id: int, amount: int, key: str, tag: str | None = None):
    return client.post(
        "/movements/deposit",
        json={"to_account_id": account_id, "amount": amount, "tag": tag},
        headers={"Idempotency-Key": key},
    )


def _transfer(
    client, from_id: int, to_id: int, amount: int, key: str, tag: str | None = None
):
    return client.post(
        "/movements/transfer",
        json={
            "from_account_id": from_id,
            "to_account_id": to_id,
            "amount": amount,
            "tag": tag,
        },
        headers={"Idempotency-Key": key},
    )


def test_deposit_credits_account(client):
    ana = _create_account(client, "Ana")
    response = _deposit(client, ana, 10_000, "dep-1", tag="salario")
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "deposit"
    assert body["amount"] == 10_000
    assert body["tag"] == "salario"

    balance = client.get(f"/accounts/{ana}").json()["balance"]
    assert balance == 10_000


def test_transfer_moves_balance_between_accounts(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    _deposit(client, ana, 10_000, "dep-1")

    response = _transfer(client, ana, beto, 3_000, "tr-1", tag="cena")
    assert response.status_code == 201

    assert client.get(f"/accounts/{ana}").json()["balance"] == 7_000
    assert client.get(f"/accounts/{beto}").json()["balance"] == 3_000


def test_transfer_with_insufficient_funds_is_rejected_with_no_side_effects(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    _deposit(client, ana, 1_000, "dep-1")

    response = _transfer(client, ana, beto, 5_000, "tr-1")
    assert response.status_code == 422

    # No partial effects: balances untouched, no movement recorded.
    assert client.get(f"/accounts/{ana}").json()["balance"] == 1_000
    assert client.get(f"/accounts/{beto}").json()["balance"] == 0
    history_keys = {
        m["idempotency_key"] for m in client.get(f"/accounts/{ana}/movements").json()
    }
    assert "tr-1" not in history_keys


def test_transfer_to_same_account_is_rejected(client):
    ana = _create_account(client, "Ana")
    _deposit(client, ana, 1_000, "dep-1")
    response = _transfer(client, ana, ana, 500, "tr-1")
    assert response.status_code == 422


def test_transfer_cannot_touch_external_account_directly(client, session):
    ana = _create_account(client, "Ana")
    external = session.exec(select(Account).where(Account.is_external == True)).first()

    response = _transfer(client, external.id, ana, 100, "tr-1")
    assert response.status_code == 422


def test_retrying_same_idempotency_key_does_not_duplicate_transfer(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    _deposit(client, ana, 10_000, "dep-1")

    first = _transfer(client, ana, beto, 3_000, "tr-1")
    second = _transfer(client, ana, beto, 3_000, "tr-1")

    assert first.json()["id"] == second.json()["id"]
    assert client.get(f"/accounts/{ana}").json()["balance"] == 7_000
    assert client.get(f"/accounts/{beto}").json()["balance"] == 3_000


def test_account_history_returns_movements_newest_first(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    _deposit(client, ana, 10_000, "dep-1")
    _transfer(client, ana, beto, 1_000, "tr-1")
    _transfer(client, ana, beto, 1_000, "tr-2")

    history = client.get(f"/accounts/{ana}/movements").json()
    keys_in_order = [m["idempotency_key"] for m in history]
    assert keys_in_order == ["tr-2", "tr-1", "dep-1"]


def test_ledger_always_sums_to_zero_across_the_whole_system(client, session):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    carla = _create_account(client, "Carla")
    _deposit(client, ana, 10_000, "dep-1")
    _deposit(client, beto, 5_000, "dep-2")
    _transfer(client, ana, beto, 2_000, "tr-1")
    _transfer(client, beto, carla, 1_500, "tr-2")

    total = session.execute(
        select(func.coalesce(func.sum(LedgerEntry.amount), 0))
    ).scalar_one()
    assert total == 0
