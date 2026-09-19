from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache
import os
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+psycopg://nexus:nexus_dev@localhost:5432/nexus"
    MODEL_PATH: str = "./models/lightgbm_model.pkl"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173"

    def model_post_init(self, __context) -> None:
        raw_url = os.environ.get("DATABASE_URL", "").strip()
        if not raw_url:
            logger.warning("DATABASE_URL is not set! Using default local URL.")
            return

        url = raw_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and "+psycopg" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)

        self.DATABASE_URL = url
        logger.info(f"DATABASE_URL configured: {url[:30]}...")


@lru_cache
def get_settings() -> Settings:
    return Settings()
