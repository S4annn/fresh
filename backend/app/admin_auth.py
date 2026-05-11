"""
Admin authentication for database access
"""

from datetime import datetime, timedelta
from typing import Optional

from .auth import SECRET_KEY, ALGORITHM, create_access_token, verify_token
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# Admin credentials (move to environment variables in production)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "fresh_admin_2024"  # Change this!

# Security
security = HTTPBearer()

def verify_admin_credentials(username: str, password: str) -> bool:
    """Verify admin credentials"""
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD

def create_admin_token(username: str) -> str:
    """Create admin token"""
    expires_delta = timedelta(hours=1)  # Admin tokens expire after 1 hour
    token_data = {
        "sub": username,
        "scope": "admin",
        "exp": datetime.utcnow() + expires_delta
    }
    return create_access_token(data=token_data)

def verify_admin_token(token: str) -> bool:
    """Verify admin token"""
    try:
        payload = verify_token(token)
        if payload is None:
            return False
        
        # Check if token has admin scope
        # For now, we'll check if username is admin
        # In production, implement proper role-based access
        return True
        
    except Exception:
        return False

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Get current admin from token"""
    token = credentials.credentials
    
    if not verify_admin_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return "admin"
