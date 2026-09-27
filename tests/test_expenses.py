from tests.helpers import signup


def test_create_expense_computes_total_and_names(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    carla = signup(make_client, "Carla")

    response = ana.create_expense(
        [(beto, 1500), (carla, 1500)], tag="salida con amigos"
    )
    assert response.status_code == 201
    body = response.json()
    assert body["total_amount"] == 3000
    assert body["payer_account_id"] == ana.account_id
    assert body["payer_name"] == "Ana"
    assert body["tag"] == "salida con amigos"
    assert {s["account_name"] for s in body["shares"]} == {"Beto", "Carla"}
    assert all(s["status"] == "pending" for s in body["shares"])


def test_expense_rejects_payer_as_participant(make_client):
    ana = signup(make_client, "Ana")
    response = ana.create_expense([(ana, 1500)])
    assert response.status_code == 422
    assert response.json()["code"] == "invalid_expense_participants"


def test_expense_rejects_duplicate_participants(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    response = ana.create_expense([(beto, 500), (beto, 700)])
    assert response.status_code == 422


def test_expense_rejects_unknown_participant(make_client):
    ana = signup(make_client, "Ana")
    response = ana.create_expense([(999_999, 500)])
    assert response.status_code == 404


def test_settling_a_share_transfers_money_to_the_payer(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    beto.deposit(5_000, "d1")

    expense = ana.create_expense([(beto, 1_500)]).json()
    share_id = expense["shares"][0]["id"]

    response = beto.settle(expense["id"], share_id)
    assert response.status_code == 200
    assert response.json()["status"] == "paid"
    assert response.json()["settlement_movement_id"] is not None

    assert ana.balance() == 1_500
    assert beto.balance() == 3_500


def test_settling_an_already_paid_share_is_a_no_op(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    beto.deposit(5_000, "d1")

    expense = ana.create_expense([(beto, 1_500)]).json()
    share_id = expense["shares"][0]["id"]

    first = beto.settle(expense["id"], share_id).json()
    second = beto.settle(expense["id"], share_id).json()

    assert first["settlement_movement_id"] == second["settlement_movement_id"]
    assert beto.balance() == 3_500  # debited once


def test_settling_a_share_with_insufficient_funds_is_rejected(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")  # never funded

    expense = ana.create_expense([(beto, 1_500)]).json()
    share_id = expense["shares"][0]["id"]

    response = beto.settle(expense["id"], share_id)
    assert response.status_code == 422
    shares = beto.client.get(f"/expenses/{expense['id']}").json()["shares"]
    assert shares[0]["status"] == "pending"


def test_settling_a_share_that_does_not_belong_to_the_expense_returns_404(
    make_client,
):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    beto.deposit(5_000, "d1")

    expense_1 = ana.create_expense([(beto, 500)]).json()
    expense_2 = ana.create_expense([(beto, 500)]).json()
    share_from_expense_2 = expense_2["shares"][0]["id"]

    response = beto.settle(expense_1["id"], share_from_expense_2)
    assert response.status_code == 404


def test_read_missing_expense_returns_404(make_client):
    ana = signup(make_client, "Ana")
    assert ana.client.get("/expenses/999999").status_code == 404


def test_list_expenses_returns_newest_first(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")

    first = ana.create_expense([(beto, 500)]).json()
    second = ana.create_expense([(beto, 700)]).json()

    ids_in_order = [e["id"] for e in ana.client.get("/expenses").json()]
    assert ids_in_order == [second["id"], first["id"]]


def test_settlement_movement_carries_the_expense_context(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    beto.deposit(5_000, "d1")
    expense = ana.create_expense([(beto, 1_500)], description="Cena", tag="cena").json()

    beto.settle(expense["id"], expense["shares"][0]["id"])

    (received,) = ana.client.get("/me/movements").json()
    assert received["description"] == "Parte de: Cena"
    assert received["tag"] == "cena"
