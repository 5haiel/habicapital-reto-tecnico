from fastapi import APIRouter

from app.deps import SessionDep
from app.routers.serializers import expense_to_read
from app.schemas import ExpenseCreate, ExpenseRead, ExpenseShareRead
from app.services import expenses

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseRead, status_code=201)
def create_expense(payload: ExpenseCreate, session: SessionDep) -> ExpenseRead:
    expense = expenses.create_expense(
        session,
        payer_account_id=payload.payer_account_id,
        shares=[(s.account_id, s.amount_owed) for s in payload.shares],
        description=payload.description,
        tag_name=payload.tag,
    )
    return expense_to_read(session, expense)


@router.get("", response_model=list[ExpenseRead])
def list_expenses(session: SessionDep) -> list[ExpenseRead]:
    return [expense_to_read(session, e) for e in expenses.list_expenses(session)]


@router.get("/{expense_id}", response_model=ExpenseRead)
def read_expense(expense_id: int, session: SessionDep) -> ExpenseRead:
    expense = expenses.get_expense(session, expense_id)
    return expense_to_read(session, expense)


@router.post("/{expense_id}/shares/{share_id}/settle", response_model=ExpenseShareRead)
def settle_share(
    expense_id: int, share_id: int, session: SessionDep
) -> ExpenseShareRead:
    return expenses.settle_share(session, expense_id=expense_id, share_id=share_id)
