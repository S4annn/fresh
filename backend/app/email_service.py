import os
import smtplib
import ssl
import logging
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def _build_html(otp: str, user_name: str) -> str:
    return f"""
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


def _send_via_resend(to_email: str, subject: str, html_content: str):
    """Send email using Resend HTTP API (works on Railway - port 443 not blocked)."""
    resend_api_key = os.getenv("RESEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM", "F.R.E.S.H <onboarding@resend.dev>")

    if not resend_api_key:
        return None

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Email sent via Resend to {to_email}")
        return {"status": "sent", "provider": "resend"}
    except Exception as e:
        logger.error(f"Resend failed: {e}")
        return None


def _send_via_smtp_ssl(to_email: str, subject: str, html_content: str):
    """Send email using Gmail SMTP over SSL (port 465)."""
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))

    if not smtp_email or not smtp_password:
        return None

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"F.R.E.S.H <{smtp_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=10) as server:
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
        logger.info(f"Email sent via SMTP SSL to {to_email}")
        return {"status": "sent", "provider": "smtp_ssl"}
    except Exception as e:
        logger.error(f"SMTP SSL (port {smtp_port}) failed: {e}")
        return None


def _send_via_smtp_tls(to_email: str, subject: str, html_content: str):
    """Send email using Gmail SMTP over TLS (port 587) - fallback."""
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")

    if not smtp_email or not smtp_password:
        return None

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"F.R.E.S.H <{smtp_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(smtp_host, 587, timeout=10) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
        logger.info(f"Email sent via SMTP TLS to {to_email}")
        return {"status": "sent", "provider": "smtp_tls"}
    except Exception as e:
        logger.error(f"SMTP TLS (port 587) failed: {e}")
        return None


def send_otp_email(to_email: str, otp: str, name: str = None):
    """
    Send OTP verification email.
    Priority: Resend API (HTTP) > SMTP SSL (465) > SMTP TLS (587) > dev fallback
    """
    user_name = name if name else "User"
    subject = "Your F.R.E.S.H verification code"
    html_content = _build_html(otp, user_name)

    # 1. Try Resend HTTP API (always works on Railway - uses HTTPS port 443)
    result = _send_via_resend(to_email, subject, html_content)
    if result:
        return result

    # 2. Try SMTP SSL port 465
    result = _send_via_smtp_ssl(to_email, subject, html_content)
    if result:
        return result

    # 3. Try SMTP TLS port 587
    result = _send_via_smtp_tls(to_email, subject, html_content)
    if result:
        return result

    # 4. All providers failed - return OTP in response for dev/testing
    logger.warning(f"All email providers failed. OTP for {to_email}: {otp}")
    return {"dev_otp": otp, "email_error": "All email providers failed"}
