"""Shared read-model construction for routers. Movement/Tag are separate
tables (no ORM relationships configured on purpose — see decisions.md), so
turning a Movement into its API representation means resolving its tag name
explicitly. Batches the tag lookup instead of querying per-row (N+1).
"""

from sqlmodel import Session, select

from app.models import Expense, Movement, Tag
from app.schemas import ExpenseRead, ExpenseShareRead, MovementRead
from app.services import expenses as expenses_service


def movements_to_read(
    session: Session, movements: list[Movement]
) -> list[MovementRead]:
    tag_ids = {m.tag_id for m in movements if m.tag_id is not None}
    tag_names: dict[int, str] = {}
    if tag_ids:
        tags = session.exec(select(Tag).where(Tag.id.in_(tag_ids))).all()
        tag_names = {tag.id: tag.name for tag in tags}

    return [
        MovementRead(
            id=m.id,
            type=m.type,
            from_account_id=m.from_account_id,
            to_account_id=m.to_account_id,
            amount=m.amount,
            description=m.description,
            tag=tag_names.get(m.tag_id) if m.tag_id is not None else None,
            idempotency_key=m.idempotency_key,
            created_at=m.created_at,
        )
        for m in movements
    ]


def movement_to_read(session: Session, movement: Movement) -> MovementRead:
    return movements_to_read(session, [movement])[0]


def expense_to_read(session: Session, expense: Expense) -> ExpenseRead:
    tag_name = None
    if expense.tag_id is not None:
        tag = session.get(Tag, expense.tag_id)
        tag_name = tag.name if tag else None

    shares = expenses_service.get_expense_shares(session, expense.id)

    return ExpenseRead(
        id=expense.id,
        payer_account_id=expense.payer_account_id,
        total_amount=expense.total_amount,
        description=expense.description,
        tag=tag_name,
        created_at=expense.created_at,
        shares=[ExpenseShareRead.model_validate(s) for s in shares],
    )
