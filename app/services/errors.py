class DomainError(Exception):
    """Base class for business-rule violations the routers translate to HTTP."""


class AccountNotFoundError(DomainError):
    def __init__(self, account_id: int):
        self.account_id = account_id
        super().__init__(f"Account {account_id} not found")


class InsufficientFundsError(DomainError):
    def __init__(self, account_id: int, requested: int, available: int):
        self.account_id = account_id
        self.requested = requested
        self.available = available
        super().__init__(
            f"Account {account_id} has {available} but {requested} was requested"
        )


class ExternalAccountRestrictedError(DomainError):
    """Raised when a client tries to use the internal `external` account
    directly in a transfer — it may only be touched implicitly via deposit.
    """

    def __init__(self):
        super().__init__("The external account cannot be used in a transfer directly")


class SameAccountError(DomainError):
    def __init__(self):
        super().__init__("from and to accounts must be different")


class ExpenseNotFoundError(DomainError):
    def __init__(self, expense_id: int):
        self.expense_id = expense_id
        super().__init__(f"Expense {expense_id} not found")


class ExpenseShareNotFoundError(DomainError):
    def __init__(self, expense_id: int, share_id: int):
        self.expense_id = expense_id
        self.share_id = share_id
        super().__init__(f"Share {share_id} not found on expense {expense_id}")


class MoneySafetyInvariantError(DomainError):
    """Raised when the database's own safety net (CHECK constraints) rejects
    a write that the application layer believed was valid. This should never
    happen in normal operation — if it does, it means there's a bug in the
    application-level checks, and we fail loudly instead of silently
    swallowing it.
    """
