"""
Database schema migration for F.R.E.S.H.
Safely adds missing columns to PostgreSQL (and SQLite) without crashing on duplicates.
This module lives inside the app package so it is always available in the Docker container.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect

from .database import DATABASE_URL, Base, engine


def get_database_type() -> str:
    if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
        return "postgresql"
    return "sqlite"


def add_column_safe(connection, table_name: str, column_name: str, column_type: str) -> None:
    """Add a column to a table if it does not already exist. Works for both PostgreSQL and SQLite."""
    inspector = inspect(connection)

    if not inspector.has_table(table_name):
        return

    existing_columns = {col["name"] for col in inspector.get_columns(table_name)}

    if column_name in existing_columns:
        return

    db_type = get_database_type()
    print(f"  [+] Adding column {table_name}.{column_name} ({column_type})")

    try:
        if db_type == "postgresql":
            # PostgreSQL supports IF NOT EXISTS-style safety via DO block, but
            # since we already checked with the inspector, a plain ALTER is fine.
            connection.execute(
                text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {column_type}')
            )
        else:
            # SQLite
            connection.execute(
                text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {column_type}')
            )
    except Exception as e:
        # Catch "column already exists" race conditions gracefully
        err_msg = str(e).lower()
        if "already exists" in err_msg or "duplicate column" in err_msg:
            pass
        else:
            print(f"  [WARN] Could not add {table_name}.{column_name}: {e}")


def run_migrations() -> None:
    """Run all schema migrations. Safe to call multiple times (idempotent)."""
    db_type = get_database_type()
    print(f"[MIGRATE] Running database migrations ({db_type})...")

    # Step 1: Create any missing tables from the SQLAlchemy models
    Base.metadata.create_all(bind=engine)

    # Step 2: Add missing columns to existing tables
    with engine.begin() as conn:
        # --- users table ---
        add_column_safe(conn, "users", "uid", "VARCHAR(100)")
        add_column_safe(conn, "users", "name", "VARCHAR(150)")
        add_column_safe(conn, "users", "full_name", "VARCHAR(150)")
        add_column_safe(conn, "users", "email", "VARCHAR(150)")
        add_column_safe(conn, "users", "password_hash", "VARCHAR(255)")
        add_column_safe(conn, "users", "role", "VARCHAR(30) DEFAULT 'personal'")
        add_column_safe(conn, "users", "provider", "VARCHAR(30) DEFAULT 'local'")
        add_column_safe(conn, "users", "business_name", "VARCHAR(150)")
        add_column_safe(conn, "users", "business_type", "VARCHAR(100)")
        add_column_safe(conn, "users", "business_location", "VARCHAR(200)")
        add_column_safe(conn, "users", "contact_number", "VARCHAR(50)")
        add_column_safe(conn, "users", "is_active", "BOOLEAN DEFAULT TRUE")
        add_column_safe(conn, "users", "email_verified", "BOOLEAN DEFAULT FALSE")
        add_column_safe(conn, "users", "status", "VARCHAR(50) DEFAULT 'pending_verification'")
        add_column_safe(conn, "users", "last_login", "TIMESTAMP")
        add_column_safe(conn, "users", "created_at", "TIMESTAMP DEFAULT NOW()" if db_type == "postgresql" else "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        add_column_safe(conn, "users", "updated_at", "TIMESTAMP DEFAULT NOW()" if db_type == "postgresql" else "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        # Legacy/OTP columns referenced in the task requirements
        add_column_safe(conn, "users", "otp_code", "VARCHAR(10)")
        add_column_safe(conn, "users", "otp_expires_at", "TIMESTAMP")

        # --- food_items table ---
        add_column_safe(conn, "food_items", "name", "VARCHAR(150)")
        add_column_safe(conn, "food_items", "risk_level", "VARCHAR(30)")

        # --- marketplace_listings table ---
        add_column_safe(conn, "marketplace_listings", "title", "VARCHAR(150)")
        add_column_safe(conn, "marketplace_listings", "description", "TEXT")
        add_column_safe(conn, "marketplace_listings", "type", "VARCHAR(30)")
        add_column_safe(conn, "marketplace_listings", "location", "VARCHAR(150)")

        # --- email_otps table (ensure all columns) ---
        add_column_safe(conn, "email_otps", "email", "VARCHAR(150)")
        add_column_safe(conn, "email_otps", "otp_hash", "VARCHAR(255)")
        add_column_safe(conn, "email_otps", "purpose", "VARCHAR(50) DEFAULT 'register'")
        add_column_safe(conn, "email_otps", "expires_at", "TIMESTAMP")
        add_column_safe(conn, "email_otps", "attempt_count", "INTEGER DEFAULT 0")
        add_column_safe(conn, "email_otps", "is_used", "BOOLEAN DEFAULT FALSE")

    # Step 3: Backfill NULL values for critical columns
    with engine.begin() as conn:
        inspector = inspect(conn)
        if inspector.has_table("users"):
            existing_cols = {col["name"] for col in inspector.get_columns("users")}
            if "email_verified" in existing_cols and "status" in existing_cols:
                try:
                    conn.execute(text("""
                        UPDATE users
                        SET email_verified = TRUE, status = 'active'
                        WHERE email_verified IS NULL OR status IS NULL
                    """))
                except Exception as e:
                    print(f"  [WARN] Backfill warning: {e}")

    print("[OK] Database migrations completed successfully!")
