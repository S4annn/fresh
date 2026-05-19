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


def _build_receipt_html(
    user_name: str,
    plan_name: str,
    amount: str,
    billing_cycle: str,
    transaction_id: str,
    payment_status: str,
    paid_at: str,
) -> str:
    """Build HTML template for subscription receipt email."""
    frontend_url = os.getenv("FRONTEND_URL", "https://fresh-demo.vercel.app")

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
      <h1 style="font-size:22px;color:#111827;margin:0 0 8px;text-align:center;">Subscription Receipt</h1>
      <p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 32px;">Halo {user_name}, pembayaran subscription Anda berhasil!</p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Plan</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{plan_name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Billing Cycle</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{billing_cycle.capitalize()}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Amount</td>
            <td style="padding:8px 0;color:#10b981;font-weight:700;text-align:right;">{amount}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Payment Status</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{payment_status}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Transaction ID</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;font-family:monospace;font-size:12px;">{transaction_id}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;">Paid At</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{paid_at}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="{frontend_url}/pricing" style="display:inline-block;background:linear-gradient(135deg,#10b981,#0d9488);color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View My Subscription</a>
      </div>

      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 12px;">Subscription Anda sekarang aktif. Nikmati semua fitur premium F.R.E.S.H untuk mengurangi food waste!</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
        F.R.E.S.H — Food Resource Efficiency &amp; Smart Handling<br/>
        <a href="{frontend_url}" style="color:#10b981;text-decoration:none;">{frontend_url}</a><br/><br/>
        Thank you for using F.R.E.S.H
      </p>
    </div>
  </div>
</body>
</html>
"""


def send_subscription_receipt_email(
    to_email: str,
    user_name: str,
    plan_name: str,
    amount: str,
    billing_cycle: str,
    transaction_id: str,
    payment_status: str = "Paid",
    paid_at: str = "",
) -> dict:
    """
    Send subscription receipt email via Resend.

    Returns:
        dict with 'status': 'sent' on success, or 'email_error' on failure.
        Never raises — caller should check the result but not fail on error.
    """
    if not paid_at:
        from datetime import datetime
        paid_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    resend_api_key = os.getenv("RESEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM", "F.R.E.S.H <onboarding@resend.dev>")

    if not resend_api_key:
        logger.warning(f"RESEND_API_KEY not set. Cannot send receipt to {to_email}")
        return {"status": "skipped", "email_error": "RESEND_API_KEY not configured"}

    subject = "Your F.R.E.S.H subscription receipt"
    html_content = _build_receipt_html(
        user_name=user_name,
        plan_name=plan_name,
        amount=amount,
        billing_cycle=billing_cycle,
        transaction_id=transaction_id,
        payment_status=payment_status,
        paid_at=paid_at,
    )

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
        logger.info(f"Subscription receipt email sent to {to_email}")
        return {"status": "sent", "provider": "resend"}
    except requests.HTTPError as e:
        error_body = e.response.text[:300] if e.response else str(e)
        logger.error(f"Resend receipt email error ({e.response.status_code if e.response else '?'}): {error_body}")
        return {"status": "failed", "email_error": f"Resend: {error_body}"}
    except Exception as e:
        logger.error(f"Receipt email send failed: {e}")
        return {"status": "failed", "email_error": str(e)}
