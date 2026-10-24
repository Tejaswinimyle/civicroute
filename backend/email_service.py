"""
CivicRoute Email Service
Handles password reset email notifications using SMTP.
Gracefully detects missing SMTP environment variables and provides
development reset links/tokens with clear instructions.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, List

REQUIRED_SMTP_VARS = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL"
]


def get_smtp_config() -> Dict[str, Any]:
    """Retrieve and validate SMTP configuration from environment."""
    host = os.getenv("SMTP_HOST", "").strip()
    port_str = os.getenv("SMTP_PORT", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", user).strip()

    missing: List[str] = []
    if not host:
        missing.append("SMTP_HOST")
    if not port_str:
        missing.append("SMTP_PORT")
    if not user:
        missing.append("SMTP_USER")
    if not password:
        missing.append("SMTP_PASSWORD")
    if not from_email:
        missing.append("SMTP_FROM_EMAIL")

    try:
        port = int(port_str) if port_str else 587
    except ValueError:
        port = 587

    use_ssl = port == 465

    return {
        "is_configured": len(missing) == 0,
        "missing_vars": missing,
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_email": from_email,
        "use_ssl": use_ssl
    }


def send_password_reset_email(
    to_email: str,
    recipient_name: str,
    reset_link: str,
    raw_token: str
) -> Dict[str, Any]:
    """
    Send password reset email to the recipient.
    If SMTP is not configured, returns clear error status detailing
    the missing environment variables and dev credentials.
    """
    config = get_smtp_config()

    if not config["is_configured"]:
        missing_str = ", ".join(config["missing_vars"])
        print(f"[CivicRoute Email] SMTP not configured. Missing variables: {missing_str}")
        return {
            "sent": False,
            "status": "smtp_unconfigured",
            "reason": "SMTP email configuration is missing or incomplete.",
            "missing_vars": config["missing_vars"],
            "required_env_vars": REQUIRED_SMTP_VARS,
            "message": (
                f"SMTP configuration is incomplete ({missing_str} missing). "
                "To deliver real emails, set the required environment variables in your .env file."
            ),
            "dev_reset_link": reset_link,
            "dev_reset_token": raw_token
        }

    # Construct email message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "CivicRoute – Password Reset Request"
    msg["From"] = config["from_email"]
    msg["To"] = to_email

    plain_text = f"""Hello {recipient_name},

We received a request to reset your password for your CivicRoute account.

To reset your password, visit the following link:
{reset_link}

Alternatively, you can enter this reset token manually:
{raw_token}

This token will expire in 1 hour. If you did not request a password reset, please ignore this email.

Sincerely,
CivicRoute Security Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your CivicRoute Password</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; }}
    .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
    .logo {{ font-size: 20px; font-weight: 800; color: #2563eb; margin-bottom: 20px; }}
    .title {{ font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
    .text {{ font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }}
    .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; margin-bottom: 24px; }}
    .token-box {{ background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 14px; color: #1e293b; word-break: break-all; margin-bottom: 24px; }}
    .footer {{ font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 16px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CivicRoute</div>
    <div class="title">Password Reset Request</div>
    <p class="text">Hello <strong>{recipient_name}</strong>,</p>
    <p class="text">We received a request to reset the password for your CivicRoute account. Click the button below to choose a new password:</p>
    <div style="text-align: center;">
      <a href="{reset_link}" class="btn">Reset Password</a>
    </div>
    <p class="text">Or enter your verification token manually:</p>
    <div class="token-box">{raw_token}</div>
    <p class="text" style="font-size: 13px; color: #64748b;">This reset token will expire in <strong>1 hour</strong>. If you did not request this change, you can safely ignore this email.</p>
    <div class="footer">
      CivicRoute &ndash; AI-Powered Civic Complaint Management Platform.
    </div>
  </div>
</body>
</html>
"""

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        if config["use_ssl"]:
            server = smtplib.SMTP_SSL(config["host"], config["port"], timeout=15)
        else:
            server = smtplib.SMTP(config["host"], config["port"], timeout=15)
            server.starttls()

        server.login(config["user"], config["password"])
        server.sendmail(config["from_email"], [to_email], msg.as_string())
        server.quit()

        return {
            "sent": True,
            "status": "email_dispatched",
            "message": f"Password reset email sent successfully to {to_email}."
        }
    except Exception as e:
        print(f"[CivicRoute Email] SMTP send failed: {e}")
        return {
            "sent": False,
            "status": "smtp_error",
            "error": "Failed to send email via SMTP server.",
            "detail": str(e),
            "dev_reset_link": reset_link,
            "dev_reset_token": raw_token
        }

