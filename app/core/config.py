from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg2://habicapital:habicapital@localhost:5432/habicapital"
    )
    external_account_name: str = "external"
    cors_allow_origins: list[str] = [
        "http://localhost:5173",  # Vite dev server default port
        "http://127.0.0.1:5173",
    ]

    # Dev-only default so the project runs out of the box; any real
    # deployment must override it via JWT_SECRET.
    jwt_secret: str = "dev-only-insecure-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    session_ttl_minutes: int = 60 * 12
    session_cookie_name: str = "habi_session"
    # False locally because the dev server and Docker demo are plain http;
    # a cookie marked Secure would never be sent back over http.
    session_cookie_secure: bool = False


settings = Settings()
