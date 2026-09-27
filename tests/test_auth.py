from datetime import UTC, datetime, timedelta

import jwt
from sqlmodel import select

from app.core.config import settings
from app.models import Account, User

COOKIE = settings.session_cookie_name


def _register(client, name="Ana", email="ana@example.com", password="clave-segura-1"):
    return client.post(
        "/auth/register", json={"name": name, "email": email, "password": password}
    )


def _login(client, email="ana@example.com", password="clave-segura-1"):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_register_creates_user_and_empty_account_and_starts_session(client, session):
    response = _register(client)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ana"
    assert body["email"] == "ana@example.com"
    assert "password" not in body and "password_hash" not in body
    assert COOKIE in response.cookies

    account = session.get(Account, body["account_id"])
    assert account.balance == 0
    assert account.name == "Ana"

    assert client.get("/auth/me").json()["id"] == body["id"]


def test_password_is_stored_hashed(client, session):
    _register(client)
    user = session.exec(select(User)).one()
    assert user.password_hash != "clave-segura-1"
    assert user.password_hash.startswith("$argon2")


def test_email_is_normalized_and_unique_case_insensitively(make_client):
    assert _register(make_client(), email="  Ana@Example.com ").status_code == 201

    response = _register(make_client(), email="ANA@example.com")
    assert response.status_code == 409
    assert response.json()["code"] == "email_already_registered"


def test_short_password_is_rejected_with_spanish_validation_error(client):
    response = _register(client, password="corta")
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert response.json()["detail"] == "Revisa los datos enviados."


def test_login_success_sets_session(make_client):
    _register(make_client())
    client = make_client()

    response = _login(client, email="ANA@example.com")

    assert response.status_code == 200
    assert client.get("/auth/me").json()["email"] == "ana@example.com"


def test_login_does_not_reveal_whether_email_exists(make_client):
    _register(make_client())

    wrong_password = _login(make_client(), password="otra-clave-99")
    unknown_email = _login(make_client(), email="nadie@example.com")

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()
    assert COOKIE not in wrong_password.cookies


def test_me_requires_session(client):
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


def test_tampered_token_is_rejected(client):
    user_id = _register(client).json()["id"]
    forged = jwt.encode(
        {"sub": str(user_id)},
        "an-attacker-guessed-secret-of-enough-length",
        algorithm="HS256",
    )
    client.cookies.set(COOKIE, forged)

    assert client.get("/auth/me").status_code == 401


def test_expired_token_is_rejected(client):
    user_id = _register(client).json()["id"]
    past = datetime.now(UTC) - timedelta(hours=1)
    expired = jwt.encode(
        {"sub": str(user_id), "iat": past - timedelta(hours=1), "exp": past},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    client.cookies.set(COOKIE, expired)

    assert client.get("/auth/me").status_code == 401


def test_logout_ends_session(client):
    _register(client)
    assert client.post("/auth/logout").status_code == 204
    assert client.get("/auth/me").status_code == 401


def test_update_profile_renames_user_and_their_account(client, session):
    account_id = _register(client).json()["account_id"]

    response = client.patch("/auth/me", json={"name": "Ana María"})

    assert response.status_code == 200
    assert response.json()["name"] == "Ana María"
    session.expire_all()
    assert session.get(Account, account_id).name == "Ana María"


def test_update_profile_cannot_take_someone_elses_email(make_client):
    _register(make_client(), name="Beto", email="beto@example.com")
    ana = make_client()
    _register(ana)

    response = ana.patch("/auth/me", json={"email": "Beto@example.com"})

    assert response.status_code == 409


def test_change_password_requires_current_one(client):
    _register(client)
    response = client.post(
        "/auth/me/password",
        json={"current_password": "equivocada", "new_password": "nueva-clave-22"},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "wrong_current_password"


def test_change_password_replaces_old_one(make_client):
    client = make_client()
    _register(client)
    response = client.post(
        "/auth/me/password",
        json={"current_password": "clave-segura-1", "new_password": "nueva-clave-22"},
    )
    assert response.status_code == 204

    assert _login(make_client()).status_code == 401
    assert _login(make_client(), password="nueva-clave-22").status_code == 200


def test_session_endpoint_reports_signed_out_without_error(client):
    response = client.get("/auth/session")
    assert response.status_code == 200
    assert response.json() == {"user": None}


def test_session_endpoint_returns_user_when_signed_in(client):
    user_id = _register(client).json()["id"]
    assert client.get("/auth/session").json()["user"]["id"] == user_id
