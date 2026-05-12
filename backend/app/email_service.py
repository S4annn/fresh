import os
import requests
import logging

logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp: str, name: str = None):
    resend_api_key = os.getenv("RESEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM", "F.R.E.S.H <onboarding@resend.dev>")
    environment = os.getenv("ENVIRONMENT", "development")
    
    if not resend_api_key:
        logger.warning("RESEND_API_KEY is not set. Email not sent.")
        if environment != "production":
            return {"dev_otp": otp}
        return None
        
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }
    
    user_name = name if name else "User"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2>Verify your F.R.E.S.H account</h2>
        <p>Hi {user_name},</p>
        <p>Your 6-digit verification code is:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <h1 style="font-size: 32px; letter-spacing: 6px; color: #10b981; margin: 0;">{otp}</h1>
        </div>
        <p>This code will expire in {os.getenv("OTP_EXPIRE_MINUTES", "10")} minutes.</p>
        <p>Please do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 32px; margin-bottom: 32px;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center;">F.R.E.S.H (Food Resource Efficiency & Smart Handling)</p>
    </div>
    """
    
    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": "Your F.R.E.S.H verification code",
        "html": html_content
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to send email via Resend: {e}")
        if environment != "production":
            return {"dev_otp": otp}
        return None
