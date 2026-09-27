from fastapi import APIRouter
from sqlmodel import select

from app.deps import SessionDep
from app.models import Tag
from app.schemas import TagRead

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagRead])
def list_tags(session: SessionDep) -> list[Tag]:
    return list(session.exec(select(Tag).order_by(Tag.name)).all())
