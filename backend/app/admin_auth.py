"""
Admin authentication for database access
"""

from datetime import timedelta
import os

from jose import JWTError, jwt

from .auth import SECRET_KEY, ALGORITHM, create_access_token
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Admin credentials
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "fresh_admin_2024")

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
    }
    return create_access_token(data=token_data, expires_delta=expires_delta)

def verify_admin_token(token: str) -> bool:
    """Verify admin token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("scope") == "admin" and payload.get("sub") == ADMIN_USERNAME
    except JWTError:
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
