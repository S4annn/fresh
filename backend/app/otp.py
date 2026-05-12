import os
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from .models import EmailOTP

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"

def hash_otp(otp: str) -> str:
    return pwd_context.hash(otp)

def verify_otp_hash(plain_otp: str, otp_hash: str) -> bool:
    return pwd_context.verify(plain_otp, otp_hash)

def create_otp_record(db: Session, email: str, purpose: str = "register") -> str:
    # Mark old OTPs as used
    db.query(EmailOTP).filter(
        EmailOTP.email == email,
        EmailOTP.purpose == purpose,
        EmailOTP.is_used == False
    ).update({"is_used": True})
    
    otp = generate_otp()
    otp_hash = hash_otp(otp)
    
    expire_minutes = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
    # using UTC timezone aware datetime because models.py uses DateTime(timezone=True)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    
    db_otp = EmailOTP(
        email=email,
        otp_hash=otp_hash,
        purpose=purpose,
        expires_at=expires_at,
        attempt_count=0,
        is_used=False
    )
    db.add(db_otp)
    db.commit()
    db.refresh(db_otp)
    
    return otp

def validate_otp(db: Session, email: str, otp: str, purpose: str = "register"):
    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == email,
        EmailOTP.purpose == purpose,
        EmailOTP.is_used == False
    ).order_by(EmailOTP.created_at.desc()).first()
    
    if not otp_record:
        return {"status": "error", "message": "OTP not found"}
        
    if datetime.now(timezone.utc) > otp_record.expires_at:
        return {"status": "error", "message": "OTP expired"}
        
    if otp_record.attempt_count >= 5:
        return {"status": "error", "message": "Too many attempts"}
        
    if not verify_otp_hash(otp, otp_record.otp_hash):
        otp_record.attempt_count += 1
        db.commit()
        return {"status": "error", "message": "Invalid OTP"}
        
    otp_record.is_used = True
    db.commit()
    return {"status": "success", "message": "OTP valid"}
