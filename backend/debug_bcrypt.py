#!/usr/bin/env python3
"""
Debug bcrypt password hashing issues
"""

import bcrypt
from passlib.context import CryptContext

def test_bcrypt_direct():
    """Test bcrypt directly"""
    print("Testing bcrypt directly...")
    
    password = "password123"
    print(f"Original password: {password}")
    print(f"Password length: {len(password)}")
    
    try:
        # Test bcrypt directly
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        print(f"✅ bcrypt direct: {hashed.decode('utf-8')}")
        
        # Test verification
        verify = bcrypt.checkpw(password.encode('utf-8'), hashed)
        print(f"✅ bcrypt verify: {verify}")
        
    except Exception as e:
        print(f"❌ bcrypt direct failed: {e}")

def test_passlib():
    """Test passlib context"""
    print("\nTesting passlib...")
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password = "password123"
    
    try:
        hashed = pwd_context.hash(password)
        print(f"✅ passlib hash: {hashed}")
        
        verify = pwd_context.verify(password, hashed)
        print(f"✅ passlib verify: {verify}")
        
    except Exception as e:
        print(f"❌ passlib failed: {e}")

def test_passlib_truncated():
    """Test passlib with truncated password"""
    print("\nTesting passlib with truncated password...")
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password = "password123"
    truncated = password[:72]
    
    print(f"Original: {password} (len: {len(password)})")
    print(f"Truncated: {truncated} (len: {len(truncated)})")
    
    try:
        hashed = pwd_context.hash(truncated)
        print(f"✅ passlib truncated hash: {hashed}")
        
        verify = pwd_context.verify(truncated, hashed)
        print(f"✅ passlib truncated verify: {verify}")
        
    except Exception as e:
        print(f"❌ passlib truncated failed: {e}")

def test_auth_functions():
    """Test auth.py functions"""
    print("\nTesting auth.py functions...")
    
    try:
        from app.auth import get_password_hash, verify_password
        
        password = "password123"
        print(f"Testing with password: {password}")
        
        # Test hashing
        hashed = get_password_hash(password)
        print(f"✅ get_password_hash: {hashed}")
        
        # Test verification
        verify = verify_password(password, hashed)
        print(f"✅ verify_password: {verify}")
        
    except Exception as e:
        print(f"❌ auth functions failed: {e}")
        import traceback
        traceback.print_exc()

def test_create_user_direct():
    """Test creating user directly"""
    print("\nTesting user creation directly...")
    
    try:
        from app.auth import create_user
        from app.database import get_db
        from sqlalchemy.orm import Session
        
        # Get database session
        db_gen = get_db()
        db = next(db_gen)
        
        user_data = {
            "name": "Debug User",
            "email": "debug@example.com",
            "password": "test123",
            "role": "personal"
        }
        
        print(f"Creating user with data: {user_data}")
        
        user = create_user(db, user_data)
        print(f"✅ User created: {user.email}")
        
        db.close()
        
    except Exception as e:
        print(f"❌ User creation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=== Bcrypt Debug Test ===")
    
    test_bcrypt_direct()
    test_passlib()
    test_passlib_truncated()
    test_auth_functions()
    test_create_user_direct()
    
    print("\n=== Debug Complete ===")
