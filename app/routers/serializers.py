"""Shared read-model construction for routers. Movement/Tag/Account are
separate tables with no ORM relationships configured (see decisions.md), so
building an API representation means resolving names explicitly — always
in one batched query per table, never per row (N+1).
"""

from sqlmodel import Session, select

from app.models import Account, Expense, ExpenseShare, Movement, MovementType, Tag
from app.schemas import Counterparty, ExpenseRead, ExpenseShareRead, MovementRead


def _tag_names(session: Session, tag_ids: set[int]) -> dict[int, str]:
    if not tag_ids:
        return {}
    tags = session.exec(select(Tag).where(Tag.id.in_(tag_ids))).all()
    return {tag.id: tag.name for tag in tags}


def account_names(session: Session, account_ids: set[int]) -> dict[int, str]:
    if not account_ids:
        return {}
    rows = session.exec(
        select(Account.id, Account.name).where(Account.id.in_(account_ids))
    ).all()
    return dict(rows)


def movements_to_read(
    session: Session, movements: list[Movement], *, viewer_account_id: int
) -> list[MovementRead]:
    tag_names = _tag_names(session, {m.tag_id for m in movements if m.tag_id})
    counterparty_ids = {
        m.from_account_id if m.to_account_id == viewer_account_id else m.to_account_id
        for m in movements
        if m.type == MovementType.transfer
    }
    names = account_names(session, counterparty_ids)

    result = []
    for m in movements:
        incoming = m.to_account_id == viewer_account_id
        counterparty = None
        if m.type == MovementType.transfer:
            other_id = m.from_account_id if incoming else m.to_account_id
            counterparty = Counterparty(account_id=other_id, name=names[other_id])
        result.append(
            MovementRead(
                id=m.id,
                type=m.type,
                direction="in" if incoming else "out",
                amount=m.amount,
                counterparty=counterparty,
                description=m.description,
                tag=tag_names.get(m.tag_id) if m.tag_id is not None else None,
                created_at=m.created_at,
            )
        )
    return result


def movement_to_read(
    session: Session, movement: Movement, *, viewer_account_id: int
) -> MovementRead:
    return movements_to_read(session, [movement], viewer_account_id=viewer_account_id)[
        0
    ]


def share_to_read(share: ExpenseShare, names: dict[int, str]) -> ExpenseShareRead:
    return ExpenseShareRead(
        id=share.id,
        account_id=share.account_id,
        account_name=names[share.account_id],
        amount_owed=share.amount_owed,
        status=share.status,
        settlement_movement_id=share.settlement_movement_id,
    )


def expenses_to_read(session: Session, expenses: list[Expense]) -> list[ExpenseRead]:
    tag_names = _tag_names(session, {e.tag_id for e in expenses if e.tag_id})
    shares_by_expense: dict[int, list[ExpenseShare]] = {e.id: [] for e in expenses}
    if expenses:
        all_shares = session.exec(
            select(ExpenseShare)
            .where(ExpenseShare.expense_id.in_(shares_by_expense.keys()))
            .order_by(ExpenseShare.id)
        ).all()
        for share in all_shares:
            shares_by_expense[share.expense_id].append(share)
    account_ids = {e.payer_account_id for e in expenses} | {
        s.account_id for shares in shares_by_expense.values() for s in shares
    }
    names = account_names(session, account_ids)

    return [
        ExpenseRead(
            id=e.id,
            payer_account_id=e.payer_account_id,
            payer_name=names[e.payer_account_id],
            total_amount=e.total_amount,
            description=e.description,
            tag=tag_names.get(e.tag_id) if e.tag_id is not None else None,
            created_at=e.created_at,
            shares=[share_to_read(s, names) for s in shares_by_expense[e.id]],
        )
        for e in expenses
    ]


def expense_to_read(session: Session, expense: Expense) -> ExpenseRead:
    return expenses_to_read(session, [expense])[0]
