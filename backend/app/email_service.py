import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def _send_via_smtp(to_email: str, subject: str, html_content: str):
    """Send email using Gmail SMTP."""
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not smtp_email or not smtp_password:
        return None

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"F.R.E.S.H <{smtp_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
        logger.info(f"Email sent via SMTP to {to_email}")
        return {"status": "sent", "provider": "smtp"}
    except Exception as e:
        logger.error(f"SMTP failed: {e}")
        return None


def send_otp_email(to_email: str, otp: str, name: str = None):
    """Send OTP verification email via Gmail SMTP."""
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
        <p style="color: #6b7280; font-size: 12px; text-align: center;">F.R.E.S.H (Food Resource Efficiency &amp; Smart Handling)</p>
    </div>
    """
    subject = "Your F.R.E.S.H verification code"

    # Send via Gmail SMTP
    result = _send_via_smtp(to_email, subject, html_content)
    if result:
        return result

    # Fallback: no SMTP configured
    logger.warning(f"SMTP_EMAIL or SMTP_PASSWORD not set. OTP for {to_email}: {otp}")
    return {"dev_otp": otp, "email_error": "SMTP not configured"}
