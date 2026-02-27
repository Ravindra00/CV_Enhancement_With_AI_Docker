import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError

from app.config import CORS_ORIGINS, API_TITLE, API_VERSION, API_DESCRIPTION
from app.database import Base, engine
from app.routes import auth, cvs, cover_letters, job_applications, admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: run migrations, create tables. Shutdown: cleanup."""
    try:
        from app.db_migrate import run_migrations
        run_migrations()
        logger.info("Database migrations completed")
    except Exception as e:
        logger.error(f"Startup migration failed: {e}")
        raise
    Base.metadata.create_all(bind=engine)
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("uploads/photos", exist_ok=True)
    yield
    # Shutdown cleanup if needed

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    lifespan=lifespan,
)


# ── Global exception handlers (most specific first) ───────────────────────────
@app.exception_handler(ProgrammingError)
async def programming_error_handler(request: Request, exc: ProgrammingError):
    logger.exception("Database schema error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Database schema mismatch. Run migrations or contact support."},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("Database error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred. Please try again later."},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Permissive for development
    allow_credentials=False,    # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files as static assets
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register all routers
app.include_router(auth.router, prefix="/api")
app.include_router(cvs.router, prefix="/api")
app.include_router(cover_letters.router, prefix="/api")
app.include_router(job_applications.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "CV Enhancer API", "version": API_VERSION, "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
