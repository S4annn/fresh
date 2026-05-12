"""
Database schema migration script for F.R.E.S.H.
Updates existing database to include new fields for OTP verification
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Add app directory to path
sys.path.append('/app')

from app.database import DATABASE_URL, Base
from app.models import User

def get_database_type():
    """Determine database type from DATABASE_URL"""
    if DATABASE_URL.startswith('postgresql'):
        return 'postgresql'
    else:
        return 'sqlite'

def update_postgresql_schema():
    """Update PostgreSQL database schema"""
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Check if email_verified column exists
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'email_verified'
        """))
        
        email_verified_exists = result.fetchone() is not None
        
        if not email_verified_exists:
            print("➕ Adding email_verified column...")
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
            """))
            connection.commit()
            print("✅ email_verified column added")
        else:
            print("✅ email_verified column already exists")
        
        # Check if status column exists
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'status'
        """))
        
        status_exists = result.fetchone() is not None
        
        if not status_exists:
            print("➕ Adding status column...")
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN status VARCHAR(50) DEFAULT 'active'
            """))
            connection.commit()
            print("✅ status column added")
        else:
            print("✅ status column already exists")
        
        # Check if last_login column exists
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'last_login'
        """))
        
        last_login_exists = result.fetchone() is not None
        
        if not last_login_exists:
            print("➕ Adding last_login column...")
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN last_login TIMESTAMP
            """))
            connection.commit()
            print("✅ last_login column added")
        else:
            print("✅ last_login column already exists")

def update_sqlite_schema():
    """Update SQLite database schema"""
    
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    with engine.connect() as connection:
        # Get existing columns
        existing_columns = [col['name'] for col in inspector.get_columns('users')]
        
        # Add email_verified column
        if 'email_verified' not in existing_columns:
            print("➕ Adding email_verified column...")
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
            """))
            connection.commit()
            print("✅ email_verified column added")
        else:
            print("✅ email_verified column already exists")
        
        # Add status column
        if 'status' not in existing_columns:
            print("➕ Adding status column...")
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN status VARCHAR(50) DEFAULT 'active'
            """))
            connection.commit()
            print("✅ status column added")
        else:
            print("✅ status column already exists")
        
        # Add last_login column
        if 'last_login' not in existing_columns:
            print("➕ Adding last_login column...")
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN last_login TIMESTAMP
            """))
            connection.commit()
            print("✅ last_login column added")
        else:
            print("✅ last_login column already exists")

def update_database_schema():
    """Update database schema with new fields"""
    
    print(f"🔄 Starting database schema update for {get_database_type()}...")
    
    if get_database_type() == 'postgresql':
        update_postgresql_schema()
    else:
        update_sqlite_schema()
    
    # Update existing users to have default values
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        print("🔄 Updating existing users with default values...")
        connection.execute(text("""
            UPDATE users 
            SET email_verified = TRUE, status = 'active' 
            WHERE email_verified IS NULL OR status IS NULL
        """))
        connection.commit()
        print("✅ Existing users updated")
    
    print("✅ Database schema update completed!")

def verify_schema():
    """Verify that all required columns exist"""
    
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    # Get existing columns
    existing_columns = [col['name'] for col in inspector.get_columns('users')]
    
    # Check all required columns
    required_columns = ['email_verified', 'status', 'last_login']
    
    for column in required_columns:
        if column in existing_columns:
            print(f"✅ Column '{column}' exists")
        else:
            print(f"❌ Column '{column}' missing!")
            return False
    
    print("✅ All required columns exist!")
    return True

if __name__ == "__main__":
    try:
        update_database_schema()
        
        if verify_schema():
            print("🎉 Database schema update successful!")
        else:
            print("❌ Database schema update failed!")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error updating database schema: {e}")
        sys.exit(1)
