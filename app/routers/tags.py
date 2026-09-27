from fastapi import APIRouter
from sqlalchemy import or_
from sqlmodel import select

from app.deps import CurrentUser, SessionDep
from app.models import Expense, Movement, Tag
from app.schemas import TagRead

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagRead])
def list_my_tags(user: CurrentUser, session: SessionDep) -> list[Tag]:
    """Tags from my own movements and expenses (for autocomplete). Tags are
    free text people write about their money ("deuda con Juan"), so another
    user's tags are never listed.
    """
    account_id = user.account_id
    used_in_movements = select(Movement.tag_id).where(
        or_(
            Movement.from_account_id == account_id,
            Movement.to_account_id == account_id,
        )
    )
    used_in_expenses = select(Expense.tag_id).where(
        Expense.payer_account_id == account_id
    )
    return list(
        session.exec(
            select(Tag)
            .where(or_(Tag.id.in_(used_in_movements), Tag.id.in_(used_in_expenses)))
            .order_by(Tag.name)
        ).all()
    )
