import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .models import User, UserSession
from .schemas import TokenData

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "fresh-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080

from .security import verify_password as sec_verify_password, hash_password as get_password_hash

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return sec_verify_password(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    """Verify JWT token and return token data."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        uid: str = payload.get("uid")
        if user_id is None or uid is None:
            return None
        token_data = TokenData(user_id=user_id, uid=uid)
        return token_data
    except JWTError:
        return None


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


def create_user_session(db: Session, user: User, token: str) -> UserSession:
    """Create user session record."""
    # Calculate expiration time
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_at = datetime.utcnow() + expires_delta
    
    # Hash the token for storage
    token_hash = get_password_hash(token)
    
    # Create session record
    db_session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return db_session


def revoke_user_sessions(db: Session, user_id: int) -> bool:
    """Revoke all user sessions."""
    try:
        db.query(UserSession).filter(UserSession.user_id == user_id).delete()
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False


def cleanup_expired_sessions(db: Session) -> int:
    """Clean up expired sessions."""
    try:
        deleted_count = db.query(UserSession).filter(
            UserSession.expires_at < datetime.utcnow()
        ).delete()
        db.commit()
        return deleted_count
    except Exception:
        db.rollback()
        return 0


def get_user_by_uid(db: Session, uid: str) -> Optional[User]:
    """Get user by UID."""
    return db.query(User).filter(User.uid == uid).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user_data: dict) -> User:
    """Create new user."""
    # Generate unique UID
    uid = f"local-{int(datetime.utcnow().timestamp())}-{user_data['email'].split('@')[0]}"
    
    # Hash password
    hashed_password = get_password_hash(user_data.pop("password"))
    
    # Create user
    db_user = User(
        uid=uid,
        password_hash=hashed_password,
        provider="local",
        **user_data
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
