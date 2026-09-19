from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


engine = create_engine(get_settings().DATABASE_URL, echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        if "already exists" in str(e) or "duplicate key" in str(e):
            logger.warning("Enum types already exist, skipping creation.")
        else:
            raise
