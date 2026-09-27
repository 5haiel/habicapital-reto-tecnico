def _create_account(client, name: str) -> int:
    return client.post("/accounts", json={"name": name}).json()["id"]


def _deposit(client, account_id: int, amount: int, key: str):
    return client.post(
        "/movements/deposit",
        json={"to_account_id": account_id, "amount": amount},
        headers={"Idempotency-Key": key},
    )


def _create_expense(client, payer_id: int, shares: list[dict], tag: str | None = None):
    return client.post(
        "/expenses",
        json={"payer_account_id": payer_id, "shares": shares, "tag": tag},
    )


def test_create_expense_computes_total_from_shares(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    carla = _create_account(client, "Carla")

    response = _create_expense(
        client,
        ana,
        [
            {"account_id": beto, "amount_owed": 1500},
            {"account_id": carla, "amount_owed": 1500},
        ],
        tag="salida con amigos",
    )
    assert response.status_code == 201
    body = response.json()
    assert body["total_amount"] == 3000
    assert body["tag"] == "salida con amigos"
    assert {s["account_id"] for s in body["shares"]} == {beto, carla}
    assert all(s["status"] == "pending" for s in body["shares"])


def test_settling_a_share_transfers_money_to_the_payer(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    _deposit(client, beto, 5_000, "d1")

    expense = _create_expense(
        client, ana, [{"account_id": beto, "amount_owed": 1_500}]
    ).json()
    share_id = expense["shares"][0]["id"]

    response = client.post(f"/expenses/{expense['id']}/shares/{share_id}/settle")
    assert response.status_code == 200
    assert response.json()["status"] == "paid"
    assert response.json()["settlement_movement_id"] is not None

    assert client.get(f"/accounts/{ana}").json()["balance"] == 1_500
    assert client.get(f"/accounts/{beto}").json()["balance"] == 3_500


def test_settling_an_already_paid_share_is_a_no_op(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    _deposit(client, beto, 5_000, "d1")

    expense = _create_expense(
        client, ana, [{"account_id": beto, "amount_owed": 1_500}]
    ).json()
    share_id = expense["shares"][0]["id"]

    first = client.post(f"/expenses/{expense['id']}/shares/{share_id}/settle").json()
    second = client.post(f"/expenses/{expense['id']}/shares/{share_id}/settle").json()

    assert first["settlement_movement_id"] == second["settlement_movement_id"]
    assert client.get(f"/accounts/{beto}").json()["balance"] == 3_500  # debited once


def test_settling_a_share_with_insufficient_funds_is_rejected(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")  # never funded

    expense = _create_expense(
        client, ana, [{"account_id": beto, "amount_owed": 1_500}]
    ).json()
    share_id = expense["shares"][0]["id"]

    response = client.post(f"/expenses/{expense['id']}/shares/{share_id}/settle")
    assert response.status_code == 422
    assert (
        client.get(f"/expenses/{expense['id']}").json()["shares"][0]["status"]
        == "pending"
    )


def test_settling_a_share_that_does_not_belong_to_the_expense_returns_404(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")
    carla = _create_account(client, "Carla")

    expense_1 = _create_expense(
        client, ana, [{"account_id": beto, "amount_owed": 500}]
    ).json()
    expense_2 = _create_expense(
        client, ana, [{"account_id": carla, "amount_owed": 500}]
    ).json()
    share_from_expense_2 = expense_2["shares"][0]["id"]

    response = client.post(
        f"/expenses/{expense_1['id']}/shares/{share_from_expense_2}/settle"
    )
    assert response.status_code == 404


def test_read_missing_expense_returns_404(client):
    response = client.get("/expenses/999999")
    assert response.status_code == 404


def test_list_expenses_returns_newest_first(client):
    ana = _create_account(client, "Ana")
    beto = _create_account(client, "Beto")

    first = _create_expense(
        client, ana, [{"account_id": beto, "amount_owed": 500}]
    ).json()
    second = _create_expense(
        client, ana, [{"account_id": beto, "amount_owed": 700}]
    ).json()

    ids_in_order = [e["id"] for e in client.get("/expenses").json()]
    assert ids_in_order == [second["id"], first["id"]]
