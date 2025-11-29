"""
Database Configuration and Session Management
SQLite database with SQLAlchemy ORM
"""
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pathlib import Path
from backend.config import settings

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_DIR = Path("database")
DATABASE_DIR.mkdir(exist_ok=True)

# Use DATABASE_URL from settings if provided (e.g., Neon/Postgres).
# If DATABASE_URL is not set, require that a local SQLite file already exists.
# This prevents the app from silently creating a fresh local DB after it was
# intentionally removed. If you removed local DBs and want to use Neon, set
# `DATABASE_URL` in the environment (recommended).
if getattr(settings, 'DATABASE_URL', None):
    DATABASE_URL = settings.DATABASE_URL
    # For networked Postgres connections (Neon) enable pre-ping and reasonable
    # pool settings so the app doesn't try to reuse connections the server
    # has already closed. This prevents SSL SYSCALL errors from stale sockets.
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        # Provide explicit connect args for remote Postgres (Neon/etc.)
        # - `connect_timeout` avoids long hangs on network interruptions
        # - `sslmode=require` makes SSL explicit for DBAPIs that respect it
        connect_args={"connect_timeout": 10, "sslmode": "require"},
    )
else:
    # Path to the local sqlite file
    local_db_file = DATABASE_DIR / "lumino.db"
    if not local_db_file.exists():
        raise RuntimeError(
            "Local database not found. Local DB files have been removed. "
            "Set the `DATABASE_URL` environment variable to a Postgres/Neon URL "
            "before starting the application."
        )

    DATABASE_URL = f"sqlite:///{local_db_file}"
    # Create engine for SQLite with check_same_thread
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},  # Needed for SQLite
        echo=False,
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Session:
    """
    Dependency function to get database session
    Use in FastAPI endpoints with: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    logger.info("🗄️  Initializing database...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database initialized successfully")


def drop_all_tables():
    """Drop all tables - use with caution!"""
    logger.warning("⚠️  Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    logger.info("✅ All tables dropped")
