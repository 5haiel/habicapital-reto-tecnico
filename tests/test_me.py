from tests.helpers import signup


def test_my_account_starts_at_zero(make_client):
    ana = signup(make_client, "Ana")
    body = ana.client.get("/me/account").json()
    assert body == {**body, "id": ana.account_id, "name": "Ana", "balance": 0}


def test_my_account_requires_session(client):
    assert client.get("/me/account").status_code == 401
    assert client.get("/me/movements").status_code == 401


def test_old_open_account_endpoints_are_gone(make_client):
    ana = signup(make_client, "Ana")
    # Listing everyone's balances or reading an account by id is no longer
    # possible for anyone, logged in or not.
    assert ana.client.get("/accounts").status_code == 404
    assert ana.client.get(f"/accounts/{ana.account_id}").status_code == 404
    assert ana.client.post("/accounts", json={"name": "X"}).status_code == 404


def test_history_is_relative_to_the_viewer(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    ana.deposit(10_000, "dep-1", tag="salario")
    ana.transfer(beto, 3_000, "tr-1", tag="cena")

    ana_history = ana.client.get("/me/movements").json()
    beto_history = beto.client.get("/me/movements").json()

    sent, deposited = ana_history
    assert sent["direction"] == "out"
    assert sent["counterparty"] == {"account_id": beto.account_id, "name": "Beto"}
    assert sent["tag"] == "cena"
    assert deposited["type"] == "deposit"
    assert deposited["direction"] == "in"
    assert deposited["counterparty"] is None

    (received,) = beto_history
    assert received["id"] == sent["id"]
    assert received["direction"] == "in"
    assert received["counterparty"] == {"account_id": ana.account_id, "name": "Ana"}


def test_user_search_finds_others_without_exposing_balances(make_client):
    ana = signup(make_client, "Ana")
    signup(make_client, "Beto")
    signup(make_client, "Beatriz")

    results = ana.client.get("/users/search", params={"q": "be"}).json()

    assert {r["name"] for r in results} == {"Beto", "Beatriz"}
    assert all(set(r) == {"account_id", "name", "email"} for r in results)


def test_user_search_excludes_self_and_treats_wildcards_literally(make_client):
    ana = signup(make_client, "Ana")
    signup(make_client, "Beto")

    assert ana.client.get("/users/search", params={"q": "ana"}).json() == []
    assert ana.client.get("/users/search", params={"q": "%%"}).json() == []


def test_user_search_requires_session_and_a_query(make_client, client):
    assert client.get("/users/search", params={"q": "ana"}).status_code == 401
    ana = signup(make_client, "Ana")
    assert ana.client.get("/users/search", params={"q": "a"}).status_code == 422


def test_tags_only_lists_my_own(make_client):
    ana = signup(make_client, "Ana")
    beto = signup(make_client, "Beto")
    ana.deposit(1_000, "d1", tag="salario")
    beto.deposit(1_000, "d2", tag="deuda con Juan")

    assert [t["name"] for t in ana.client.get("/tags").json()] == ["salario"]
