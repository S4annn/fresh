"""
Email service for F.R.E.S.H using Resend HTTP API.
Works on Railway (port 443), no SMTP required.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _build_otp_html(otp: str, user_name: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "https://fresh-demo.vercel.app")
    expire_minutes = os.getenv("OTP_EXPIRE_MINUTES", "10")

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#10b981,#0d9488);width:56px;height:56px;border-radius:14px;line-height:56px;color:#fff;font-weight:bold;font-size:28px;">F</div>
      </div>
      <h1 style="font-size:22px;color:#111827;margin:0 0 8px;text-align:center;">Verifikasi Akun F.R.E.S.H</h1>
      <p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 32px;">Hai {user_name}, berikut kode verifikasi Anda</p>
      <div style="background:#f0fdf4;border:2px dashed #10b981;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#10b981;font-family:'Courier New',monospace;">{otp}</div>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 12px;">Kode ini berlaku selama <strong>{expire_minutes} menit</strong>. Jangan bagikan kode ini kepada siapapun.</p>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
        F.R.E.S.H — Food Resource Efficiency &amp; Smart Handling<br/>
        <a href="{frontend_url}" style="color:#10b981;text-decoration:none;">{frontend_url}</a>
      </p>
    </div>
  </div>
</body>
</html>
"""


def send_otp_email(to_email: str, otp: str, name: str = None):
    """
    Send OTP verification email via Resend.
    Returns dict with 'status' on success or 'dev_otp' if email provider unavailable.
    """
    user_name = name if name else "User"
    subject = "Kode Verifikasi F.R.E.S.H"
    html_content = _build_otp_html(otp, user_name)

    resend_api_key = os.getenv("RESEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM", "F.R.E.S.H <onboarding@resend.dev>")
    environment = os.getenv("ENVIRONMENT", "development")

    if not resend_api_key:
        logger.warning(f"RESEND_API_KEY not set. OTP for {to_email}: {otp}")
        if environment == "production":
            # In production, still return dev_otp to avoid breaking registration,
            # but log clearly that email service is not configured.
            logger.error("Email service not configured in production!")
        return {"dev_otp": otp, "email_error": "RESEND_API_KEY not configured"}

    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    try:
        response = requests.post(RESEND_API_URL, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"OTP email sent via Resend to {to_email}")
        return {"status": "sent", "provider": "resend"}
    except requests.HTTPError as e:
        error_body = e.response.text[:300] if e.response else str(e)
        logger.error(f"Resend API error ({e.response.status_code if e.response else '?'}): {error_body}")
        # Fallback: return OTP so user can still register in dev/demo mode
        return {"dev_otp": otp, "email_error": f"Resend: {error_body}"}
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"dev_otp": otp, "email_error": str(e)}
