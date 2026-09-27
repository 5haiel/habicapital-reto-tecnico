from fastapi import APIRouter, Request, Response

from app.core.config import settings
from app.deps import CurrentUser, SessionDep, get_current_user
from app.models import User
from app.schemas import (
    LoginRequest,
    PasswordChange,
    ProfileUpdate,
    RegisterRequest,
    SessionRead,
    UserRead,
)
from app.services import auth
from app.services.errors import NotAuthenticatedError

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, user: User) -> None:
    # httpOnly: page JavaScript can't read the token, so an XSS bug can't
    # exfiltrate it. SameSite=Lax: the browser won't attach it to POSTs
    # coming from other sites, which is the CSRF protection here (the SPA
    # and the API share one origin through the /api proxy).
    response.set_cookie(
        key=settings.session_cookie_name,
        value=auth.create_session_token(user.id),
        max_age=settings.session_ttl_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=settings.session_cookie_secure,
        path="/",
    )


@router.post("/register", response_model=UserRead, status_code=201)
def register(payload: RegisterRequest, response: Response, session: SessionDep) -> User:
    user = auth.register(
        session, name=payload.name, email=payload.email, password=payload.password
    )
    _set_session_cookie(response, user)
    return user


@router.post("/login", response_model=UserRead)
def login(payload: LoginRequest, response: Response, session: SessionDep) -> User:
    user = auth.authenticate(session, email=payload.email, password=payload.password)
    _set_session_cookie(response, user)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")


@router.get("/session", response_model=SessionRead)
def read_session(request: Request, session: SessionDep) -> SessionRead:
    """Who is signed in, or `user: null` — always 200. A signed-out visitor
    is a normal state for the SPA's first load, not an error (unlike
    /auth/me, which requires a session and answers 401 without one).
    """
    try:
        return SessionRead(user=get_current_user(request, session))
    except NotAuthenticatedError:
        return SessionRead(user=None)


@router.get("/me", response_model=UserRead)
def read_me(user: CurrentUser) -> User:
    return user


@router.patch("/me", response_model=UserRead)
def update_me(payload: ProfileUpdate, user: CurrentUser, session: SessionDep) -> User:
    return auth.update_profile(session, user, name=payload.name, email=payload.email)


@router.post("/me/password", status_code=204)
def change_password(
    payload: PasswordChange, user: CurrentUser, session: SessionDep
) -> None:
    auth.change_password(
        session,
        user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
