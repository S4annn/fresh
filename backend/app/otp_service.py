"""
OTP Service for F.R.E.S.H. Registration
Handles OTP generation, storage, and verification
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from .models import User


class OTPService:
    """Service for managing OTP codes"""
    
    def __init__(self):
        # In-memory storage for OTP codes (for demo)
        # In production, use Redis or database
        self.otp_storage: Dict[str, Dict[str, Any]] = {}
        self.otp_expiry_minutes = 10  # OTP expires in 10 minutes
    
    def generate_otp(self, length: int = 6) -> str:
        """Generate random OTP code"""
        return ''.join(random.choices(string.digits, k=length))
    
    def store_otp(self, email: str, otp: str, user_data: Dict[str, Any]) -> None:
        """Store OTP with user data and expiry"""
        expiry_time = datetime.utcnow() + timedelta(minutes=self.otp_expiry_minutes)
        
        self.otp_storage[email.lower()] = {
            'otp': otp,
            'user_data': user_data,
            'created_at': datetime.utcnow(),
            'expires_at': expiry_time,
            'attempts': 0,
            'max_attempts': 3
        }
    
    def verify_otp(self, email: str, otp: str) -> Dict[str, Any]:
        """Verify OTP and return result"""
        email_lower = email.lower()
        
        if email_lower not in self.otp_storage:
            return {
                'success': False,
                'message': 'OTP tidak ditemukan. Silakan registrasi ulang.'
            }
        
        otp_data = self.otp_storage[email_lower]
        
        # Check expiry
        if datetime.utcnow() > otp_data['expires_at']:
            del self.otp_storage[email_lower]
            return {
                'success': False,
                'message': 'OTP telah kadaluarsa. Silakan registrasi ulang.'
            }
        
        # Check attempts
        if otp_data['attempts'] >= otp_data['max_attempts']:
            del self.otp_storage[email_lower]
            return {
                'success': False,
                'message': 'Terlalu banyak percobaan. Silakan registrasi ulang.'
            }
        
        # Verify OTP
        if otp_data['otp'] == otp:
            user_data = otp_data['user_data']
            del self.otp_storage[email_lower]
            return {
                'success': True,
                'message': 'OTP valid. Registrasi berhasil.',
                'user_data': user_data
            }
        else:
            otp_data['attempts'] += 1
            remaining_attempts = otp_data['max_attempts'] - otp_data['attempts']
            
            if remaining_attempts <= 0:
                del self.otp_storage[email_lower]
                return {
                    'success': False,
                    'message': 'OTP salah dan percobaan habis. Silakan registrasi ulang.'
                }
            
            return {
                'success': False,
                'message': f'OTP salah. Sisa percobaan: {remaining_attempts}'
            }
    
    def resend_otp(self, email: str) -> Dict[str, Any]:
        """Resend OTP for existing registration"""
        email_lower = email.lower()
        
        if email_lower not in self.otp_storage:
            return {
                'success': False,
                'message': 'Email tidak ditemukan. Silakan registrasi ulang.'
            }
        
        otp_data = self.otp_storage[email_lower]
        
        # Check if recent resend (prevent spam)
        time_since_last = datetime.utcnow() - otp_data['created_at']
        if time_since_last.total_seconds() < 60:  # 1 minute cooldown
            return {
                'success': False,
                'message': 'Tunggu 1 menit sebelum meminta OTP baru.'
            }
        
        # Generate new OTP
        new_otp = self.generate_otp()
        self.otp_storage[email_lower]['otp'] = new_otp
        self.otp_storage[email_lower]['created_at'] = datetime.utcnow()
        self.otp_storage[email_lower]['expires_at'] = datetime.utcnow() + timedelta(minutes=self.otp_expiry_minutes)
        self.otp_storage[email_lower]['attempts'] = 0
        
        return {
            'success': True,
            'message': 'OTP baru telah dikirim ke email Anda.',
            'otp': new_otp  # For demo - remove in production
        }
    
    def cleanup_expired(self) -> int:
        """Clean up expired OTP codes"""
        current_time = datetime.utcnow()
        expired_emails = []
        
        for email, otp_data in self.otp_storage.items():
            if current_time > otp_data['expires_at']:
                expired_emails.append(email)
        
        for email in expired_emails:
            del self.otp_storage[email]
        
        return len(expired_emails)


# Global OTP service instance
otp_service = OTPService()


def generate_and_store_otp(email: str, user_data: Dict[str, Any]) -> str:
    """Generate and store OTP for user registration"""
    otp = otp_service.generate_otp()
    otp_service.store_otp(email, otp, user_data)
    return otp


def verify_user_otp(email: str, otp: str) -> Dict[str, Any]:
    """Verify user OTP"""
    return otp_service.verify_otp(email, otp)


def resend_user_otp(email: str) -> Dict[str, Any]:
    """Resend OTP to user"""
    return otp_service.resend_otp(email)


def cleanup_expired_otps() -> int:
    """Clean up expired OTP codes"""
    return otp_service.cleanup_expired()
