def test_create_account(client):
    response = client.post("/accounts", json={"name": "Ana"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ana"
    assert body["balance"] == 0
    assert body["is_external"] is False


def test_read_account(client):
    created = client.post("/accounts", json={"name": "Ana"}).json()
    response = client.get(f"/accounts/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_read_missing_account_returns_404(client):
    response = client.get("/accounts/999999")
    assert response.status_code == 404


def test_list_accounts_excludes_external(client):
    client.post("/accounts", json={"name": "Ana"})
    client.post("/accounts", json={"name": "Beto"})
    response = client.get("/accounts")
    assert response.status_code == 200
    names = {a["name"] for a in response.json()}
    assert names == {"Ana", "Beto"}
    assert "external" not in names
