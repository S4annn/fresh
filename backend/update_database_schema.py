"""
Database schema migration script for F.R.E.S.H.
This is a convenience wrapper — the real logic lives in app/migrations.py
so it is always available inside the Docker container on Railway.
"""

import os
import sys

# Ensure we can import app modules
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.migrations import run_migrations


def update_database_schema():
    """Legacy entry point — delegates to app.migrations.run_migrations()."""
    run_migrations()


if __name__ == "__main__":
    try:
        update_database_schema()
    except Exception as e:
        print(f"❌ Error updating database schema: {e}")
        sys.exit(1)
