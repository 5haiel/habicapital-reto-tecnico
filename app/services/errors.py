"""Business-rule violations the API translates to HTTP responses.

Each error carries a stable machine-readable `code` (for clients to branch
on, never the message text) and a user-facing Spanish message, so the UI can
show `detail` as-is without parsing it. The status code lives next to the
error instead of in a separate table so the two can't drift apart.
"""


class DomainError(Exception):
    code: str = "domain_error"
    status_code: int = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class AccountNotFoundError(DomainError):
    code = "account_not_found"
    status_code = 404

    def __init__(self, account_id: int):
        self.account_id = account_id
        super().__init__("La cuenta no existe.")


class InsufficientFundsError(DomainError):
    code = "insufficient_funds"
    status_code = 422

    def __init__(self, account_id: int, requested: int, available: int):
        self.account_id = account_id
        self.requested = requested
        self.available = available
        super().__init__("Saldo insuficiente para esta operación.")


class ExternalAccountRestrictedError(DomainError):
    """Raised when a client tries to use the internal `external` account
    directly in a transfer — it may only be touched implicitly via deposit.
    """

    code = "external_account_restricted"
    status_code = 422

    def __init__(self):
        super().__init__("Esa cuenta no puede usarse en una transferencia.")


class SameAccountError(DomainError):
    code = "same_account"
    status_code = 422

    def __init__(self):
        super().__init__("No puedes transferirte dinero a ti mismo.")


class ExpenseNotFoundError(DomainError):
    code = "expense_not_found"
    status_code = 404

    def __init__(self, expense_id: int):
        self.expense_id = expense_id
        super().__init__("El gasto no existe.")


class ExpenseShareNotFoundError(DomainError):
    code = "expense_share_not_found"
    status_code = 404

    def __init__(self, expense_id: int, share_id: int):
        self.expense_id = expense_id
        self.share_id = share_id
        super().__init__("Esa parte del gasto no existe.")


class IdempotencyKeyConflictError(DomainError):
    """The same Idempotency-Key arrived with a different operation. Returning
    the original movement would make the client believe the *new* request
    succeeded when nothing happened, so this fails loudly instead.
    """

    code = "idempotency_key_conflict"
    status_code = 422

    def __init__(self):
        super().__init__(
            "Esta solicitud ya se usó para otra operación. Intenta de nuevo."
        )


class InvalidExpenseParticipantsError(DomainError):
    code = "invalid_expense_participants"
    status_code = 422

    def __init__(self, message: str):
        super().__init__(message)


class EmailAlreadyRegisteredError(DomainError):
    code = "email_already_registered"
    status_code = 409

    def __init__(self):
        super().__init__("Ya existe una cuenta con ese correo.")


class InvalidCredentialsError(DomainError):
    """Deliberately the same message for "unknown email" and "wrong
    password", so the login endpoint can't be used to discover which emails
    are registered.
    """

    code = "invalid_credentials"
    status_code = 401

    def __init__(self):
        super().__init__("Correo o contraseña incorrectos.")


class WrongCurrentPasswordError(DomainError):
    code = "wrong_current_password"
    status_code = 422

    def __init__(self):
        super().__init__("La contraseña actual no es correcta.")


class NotAuthenticatedError(DomainError):
    code = "not_authenticated"
    status_code = 401

    def __init__(self):
        super().__init__("Inicia sesión para continuar.")


class ForbiddenError(DomainError):
    code = "forbidden"
    status_code = 403

    def __init__(self, message: str = "No tienes permiso para hacer esto."):
        super().__init__(message)


class MoneySafetyInvariantError(DomainError):
    """Raised when the database's own safety net (CHECK constraints) rejects
    a write that the application layer believed was valid. This should never
    happen in normal operation — if it does, it means there's a bug in the
    application-level checks, and we fail loudly instead of silently
    swallowing it. 500, not 4xx: the client did nothing wrong.
    """

    code = "money_safety_invariant"
    status_code = 500

    def __init__(self, internal_detail: str):
        # The DB error text is kept for logs/debugging but never shown to
        # the user, since it can leak schema details.
        self.internal_detail = internal_detail
        super().__init__("No pudimos completar la operación. No se movió dinero.")
