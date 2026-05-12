import os
from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

# Database configuration with PostgreSQL Railway support
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fresh.db")

# Determine database type for logging
if DATABASE_URL.startswith("postgresql"):
    DB_TYPE = "PostgreSQL"
    print(f"Using {DB_TYPE} database: Railway")
elif DATABASE_URL.startswith("sqlite"):
    DB_TYPE = "SQLite"
    print(f"Using {DB_TYPE} database: Local fallback")
else:
    DB_TYPE = "Unknown"
    print(f"Using {DB_TYPE} database")

# Create engine with appropriate settings
if DATABASE_URL.startswith("postgresql"):
    # PostgreSQL configuration for Railway
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=os.getenv("ENVIRONMENT") == "development"
    )
else:
    # SQLite configuration for local development
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("ENVIRONMENT") == "development"
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_db_and_tables():
    """Create database tables"""
    print(f"Creating database tables for {DB_TYPE}...")
    Base.metadata.create_all(bind=engine)
    print(f"Database tables created successfully for {DB_TYPE}")


def get_database_info():
    """Get database connection info"""
    return {
        "type": DB_TYPE,
        "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,
        "environment": os.getenv("ENVIRONMENT", "development")
    }


def _ensure_columns() -> None:
    """Add any missing columns defined in SQLAlchemy models to existing tables.
    Works for both SQLite and PostgreSQL."""
    with engine.begin() as conn:
        inspector = inspect(conn)
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue

            existing_columns = {
                col["name"] for col in inspector.get_columns(table.name)
            }
            for column in table.columns:
                if column.name in existing_columns or column.primary_key:
                    continue

                column_type = column.type.compile(dialect=engine.dialect)
                try:
                    conn.execute(
                        text(
                            f'ALTER TABLE "{table.name}" '
                            f'ADD COLUMN "{column.name}" {column_type}'
                        )
                    )
                except Exception as e:
                    err_msg = str(e).lower()
                    if "already exists" in err_msg or "duplicate column" in err_msg:
                        pass
                    else:
                        print(f"  [WARN] Could not add {table.name}.{column.name}: {e}")
