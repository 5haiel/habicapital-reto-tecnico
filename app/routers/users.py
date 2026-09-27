from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, or_
from sqlmodel import select

from app.deps import CurrentUser, SessionDep
from app.models import User
from app.schemas import UserPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=list[UserPublic])
def search_users(
    q: Annotated[str, Query(min_length=2, max_length=120)],
    user: CurrentUser,
    session: SessionDep,
) -> list[UserPublic]:
    """Find people to send money to or split with. Requires a query (no
    "list everyone") and never returns balances.
    """
    # Escape LIKE wildcards so a query like "%" can't match every user.
    term = q.strip().lower().replace("\\", "\\\\").replace("%", r"\%")
    term = term.replace("_", r"\_")
    pattern = f"%{term}%"
    rows = session.exec(
        select(User)
        .where(
            User.id != user.id,
            or_(
                func.lower(User.name).like(pattern, escape="\\"),
                User.email.like(pattern, escape="\\"),
            ),
        )
        .order_by(User.name)
        .limit(10)
    ).all()
    return [
        UserPublic(account_id=u.account_id, name=u.name, email=u.email) for u in rows
    ]
