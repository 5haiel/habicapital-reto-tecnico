from typing import Annotated

from fastapi import Depends, Request
from sqlmodel import Session

from app.core.config import settings
from app.db import get_session
from app.models import User
from app.services import auth
from app.services.errors import NotAuthenticatedError

SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user(request: Request, session: SessionDep) -> User:
    """The single place that turns a request into "who is acting". Routers
    derive account ownership from this, never from ids in the request body.
    """
    token = request.cookies.get(settings.session_cookie_name)
    user_id = auth.user_id_from_token(token) if token else None
    user = session.get(User, user_id) if user_id is not None else None
    if user is None:
        raise NotAuthenticatedError()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
