from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache
import os


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+psycopg://nexus:nexus_dev@localhost:5432/nexus"
    MODEL_PATH: str = "./models/lightgbm_model.pkl"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173"

    def model_post_init(self, __context) -> None:
        # Render provides postgres:// URLs; SQLAlchemy needs postgresql+psycopg://
        url = os.environ.get("DATABASE_URL", self.DATABASE_URL)
        if url.startswith("postgres://"):
            self.DATABASE_URL = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and "+psycopg" not in url:
            self.DATABASE_URL = url.replace("postgresql://", "postgresql+psycopg://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
