"""
OTP Service for F.R.E.S.H. Registration
Stores OTPs in database (survives server restarts).
User data is kept in memory temporarily until verification completes.
"""

import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any

from .database import SessionLocal
from .otp import create_otp_record, validate_otp


# Temporary storage for pre-registration user data (keyed by email).
# This is acceptable because user_data only needs to survive until OTP is verified
# (typically within 10 minutes). If server restarts, user just re-registers.
_pending_registrations: Dict[str, Dict[str, Any]] = {}


def generate_and_store_otp(email: str, user_data: Dict[str, Any]) -> str:
    """Generate OTP, store in database, and keep user_data in memory."""
    email_lower = email.lower()
    
    # Store user data temporarily
    _pending_registrations[email_lower] = {
        'user_data': user_data,
        'created_at': datetime.utcnow(),
    }
    
    # Create OTP in database
    db = SessionLocal()
    try:
        otp = create_otp_record(db, email_lower, purpose="register")
        return otp
    finally:
        db.close()


def verify_user_otp(email: str, otp: str) -> Dict[str, Any]:
    """Verify OTP from database and return user_data if valid."""
    email_lower = email.lower()
    
    # Validate OTP against database
    db = SessionLocal()
    try:
        result = validate_otp(db, email_lower, otp, purpose="register")
    finally:
        db.close()
    
    if result["status"] == "error":
        return {
            'success': False,
            'message': result['message']
        }
    
    # OTP valid - retrieve user data
    pending = _pending_registrations.get(email_lower)
    if not pending:
        return {
            'success': False,
            'message': 'Data registrasi tidak ditemukan. Silakan registrasi ulang.'
        }
    
    user_data = pending['user_data']
    
    # Clean up
    del _pending_registrations[email_lower]
    
    return {
        'success': True,
        'message': 'OTP valid. Registrasi berhasil.',
        'user_data': user_data
    }


def resend_user_otp(email: str) -> Dict[str, Any]:
    """Resend OTP - generates new OTP in database."""
    email_lower = email.lower()
    
    # Check if there's pending registration data
    if email_lower not in _pending_registrations:
        return {
            'success': False,
            'message': 'Email tidak ditemukan. Silakan registrasi ulang.'
        }
    
    pending = _pending_registrations[email_lower]
    
    # Check cooldown (1 minute)
    time_since = datetime.utcnow() - pending['created_at']
    if time_since.total_seconds() < 60:
        return {
            'success': False,
            'message': 'Tunggu 1 menit sebelum meminta OTP baru.'
        }
    
    # Generate new OTP in database
    db = SessionLocal()
    try:
        new_otp = create_otp_record(db, email_lower, purpose="register")
    finally:
        db.close()
    
    # Update timestamp
    _pending_registrations[email_lower]['created_at'] = datetime.utcnow()
    
    return {
        'success': True,
        'message': 'OTP baru telah dikirim.',
        'otp': new_otp
    }


def cleanup_expired_registrations() -> int:
    """Clean up expired pending registrations (older than 15 minutes)."""
    now = datetime.utcnow()
    expired = [
        email for email, data in _pending_registrations.items()
        if (now - data['created_at']).total_seconds() > 900  # 15 minutes
    ]
    for email in expired:
        del _pending_registrations[email]
    return len(expired)
