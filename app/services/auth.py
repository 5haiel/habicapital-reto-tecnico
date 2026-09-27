"""Identity: registration, login, session tokens and profile changes.

Sessions are stateless JWTs carried in an httpOnly cookie (see
decisions.md, "Auth"). Nothing here moves money — registering only creates
an Account with balance 0, and every money operation still goes through
`ledger`.
"""

from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Account, User
from app.services.errors import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    WrongCurrentPasswordError,
)

_password_hash = PasswordHash.recommended()  # argon2id

# Verified against when the email doesn't exist, so a login attempt takes
# roughly the same time whether or not the account exists (otherwise
# response time alone would reveal which emails are registered).
_DUMMY_HASH = _password_hash.hash("timing-equalizer")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(session: Session, email: str) -> User | None:
    return session.exec(
        select(User).where(User.email == normalize_email(email))
    ).first()


def register(session: Session, *, name: str, email: str, password: str) -> User:
    email = normalize_email(email)
    name = name.strip()
    if get_user_by_email(session, email) is not None:
        raise EmailAlreadyRegisteredError()

    # Account and User are created in one transaction: a user without an
    # account (or an orphan account) can never be left behind.
    account = Account(name=name)
    session.add(account)
    session.flush()
    user = User(
        name=name,
        email=email,
        password_hash=_password_hash.hash(password),
        account_id=account.id,
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:
        # Two concurrent sign-ups with the same email both passed the check
        # above; the unique index is what actually decides the winner.
        session.rollback()
        raise EmailAlreadyRegisteredError() from exc
    session.refresh(user)
    return user


def authenticate(session: Session, *, email: str, password: str) -> User:
    user = get_user_by_email(session, email)
    if user is None:
        _password_hash.verify(password, _DUMMY_HASH)
        raise InvalidCredentialsError()
    if not _password_hash.verify(password, user.password_hash):
        raise InvalidCredentialsError()
    return user


def create_session_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.session_ttl_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def user_id_from_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


def update_profile(
    session: Session, user: User, *, name: str | None, email: str | None
) -> User:
    if email is not None:
        email = normalize_email(email)
        if email != user.email:
            if get_user_by_email(session, email) is not None:
                raise EmailAlreadyRegisteredError()
            user.email = email
    if name is not None:
        user.name = name.strip()
        # Account.name is what other people see as the counterparty in
        # their history, so it follows the user's display name.
        account = session.get(Account, user.account_id)
        account.name = user.name
        session.add(account)
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise EmailAlreadyRegisteredError() from exc
    session.refresh(user)
    return user


def change_password(
    session: Session, user: User, *, current_password: str, new_password: str
) -> None:
    if not _password_hash.verify(current_password, user.password_hash):
        raise WrongCurrentPasswordError()
    user.password_hash = _password_hash.hash(new_password)
    session.add(user)
    session.commit()
