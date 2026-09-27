from fastapi import APIRouter

from app.deps import CurrentUser, SessionDep
from app.routers.serializers import (
    account_names,
    expense_to_read,
    expenses_to_read,
    share_to_read,
)
from app.schemas import ExpenseCreate, ExpenseRead, ExpenseShareRead
from app.services import expenses

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseRead, status_code=201)
def create_expense(
    payload: ExpenseCreate, user: CurrentUser, session: SessionDep
) -> ExpenseRead:
    expense = expenses.create_expense(
        session,
        payer_account_id=user.account_id,
        shares=[(s.account_id, s.amount_owed) for s in payload.shares],
        description=payload.description,
        tag_name=payload.tag,
    )
    return expense_to_read(session, expense)


@router.get("", response_model=list[ExpenseRead])
def list_my_expenses(user: CurrentUser, session: SessionDep) -> list[ExpenseRead]:
    """Expenses I paid for or take part in — never anyone else's."""
    return expenses_to_read(
        session, expenses.list_expenses_for_account(session, user.account_id)
    )


@router.get("/{expense_id}", response_model=ExpenseRead)
def read_expense(
    expense_id: int, user: CurrentUser, session: SessionDep
) -> ExpenseRead:
    expense = expenses.get_expense(
        session, expense_id, viewer_account_id=user.account_id
    )
    return expense_to_read(session, expense)


@router.post("/{expense_id}/shares/{share_id}/settle", response_model=ExpenseShareRead)
def settle_share(
    expense_id: int, share_id: int, user: CurrentUser, session: SessionDep
) -> ExpenseShareRead:
    share = expenses.settle_share(
        session,
        expense_id=expense_id,
        share_id=share_id,
        acting_account_id=user.account_id,
    )
    return share_to_read(share, account_names(session, {share.account_id}))
