import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import create_all, SessionLocal
from app.db.seed import seed_database
from app.routes.employees import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting NEXUS backend...")
    create_all()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    print("Database initialized and seeded.")
    yield
    print("Shutting down NEXUS backend.")


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
