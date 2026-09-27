from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg2://habicapital:habicapital@localhost:5432/habicapital"
    )
    external_account_name: str = "external"


settings = Settings()
