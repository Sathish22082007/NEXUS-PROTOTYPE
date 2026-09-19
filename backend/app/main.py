import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import create_all, SessionLocal
from app.db.seed import seed_database
from app.models.models import Employee
from app.routes.employees import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting NEXUS backend...")
    create_all()
    db = SessionLocal()
    try:
        existing = db.query(Employee).count()
        if existing == 0:
            seed_database(db)
            logger.info("Database seeded with initial data.")
        else:
            logger.info(f"Database already has {existing} employees, skipping seed.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
    finally:
        db.close()
    yield
    logger.info("Shutting down NEXUS backend.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="NEXUS Backend",
        description="AI Workforce Decision Engine - Backend API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    return app


app = create_app()
