import smtplib
import logging
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List, Set, Optional
from .config import settings

logger = logging.getLogger("email_service")

class EmailService:
    """
    Automated Email Failure Alerting Service with Gemini AI Error Diagnosis.
    Tracks DAG run states, deduplicates notifications, and sends rich HTML diagnostic emails.
    """

    def __init__(self):
        self.notified_run_ids: Set[str] = set()

    def is_already_notified(self, dag_id: str, dag_run_id: Optional[str]) -> bool:
        key = f"{dag_id}:{dag_run_id or 'latest'}"
        return key in self.notified_run_ids

    def mark_notified(self, dag_id: str, dag_run_id: Optional[str]):
        key = f"{dag_id}:{dag_run_id or 'latest'}"
        self.notified_run_ids.add(key)

    def _build_html_email(self, dag_id: str, dag_run_id: str, diagnosis: Dict[str, Any]) -> str:
        root_cause = diagnosis.get("root_cause", "DAG Execution Failed")
        explanation = diagnosis.get("explanation", "An error occurred during DAG task instance execution.")
        remediation = diagnosis.get("recommended_action", "Check Airflow task instance logs for details.")
        severity = diagnosis.get("severity", "HIGH")
        ai_model = diagnosis.get("ai_model", "Gemini AI")

        is_critical = severity in ("HIGH", "CRITICAL")
        badge_bg = "#fecdd3" if is_critical else "#fef3c7"
        badge_color = "#9f1239" if is_critical else "#92400e"

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }}
            .header {{ background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }}
            .body-content {{ padding: 24px; }}
            .dag-badge {{ display: inline-block; font-family: monospace; font-size: 13px; background-color: #0f172a; color: #38bdf8; padding: 4px 10px; border-radius: 6px; border: 1px solid #0284c7; margin-bottom: 16px; }}
            .alert-box {{ background-color: #27141f; border: 1px solid #f43f5e; border-radius: 12px; padding: 16px; margin-bottom: 20px; }}
            .alert-title {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; font-weight: 700; color: #fda4af; text-transform: uppercase; }}
            .severity-tag {{ font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background-color: {badge_bg}; color: {badge_color}; }}
            .explanation {{ font-size: 13px; color: #e2e8f0; line-height: 1.6; margin: 0; }}
            .section-title {{ font-size: 12px; font-weight: 700; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.5px; margin-top: 20px; margin-bottom: 8px; }}
            .action-box {{ background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px; font-family: monospace; font-size: 12px; color: #cbd5e1; white-space: pre-line; }}
            .btn-container {{ text-align: center; margin-top: 24px; margin-bottom: 12px; }}
            .btn {{ display: inline-block; background: linear-gradient(90deg, #06b6d4, #2563eb); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(6,182,212,0.3); }}
            .footer {{ border-top: 1px solid #334155; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Airflow DAG Failure Alert</h1>
            </div>
            <div class="body-content">
              <div>
                <span class="dag-badge">DAG: {dag_id}</span>
              </div>
              
              <div class="alert-box">
                <div class="alert-title">
                  <span>{root_cause}</span>
                  <span class="severity-tag">{severity} SEVERITY</span>
                </div>
                <p class="explanation">{explanation}</p>
              </div>

              <div class="section-title">💡 Recommended AI Remediation Actions</div>
              <div class="action-box">{remediation}</div>

              <div class="btn-container">
                <a href="http://localhost:5173" class="btn" target="_blank">Open Executive Dashboard</a>
              </div>
            </div>
            <div class="footer">
              Automated Alert powered by Google Gemini AI Diagnosis & Airflow Dashboard Proxy ({ai_model})
            </div>
          </div>
        </body>
        </html>
        """

    def send_failure_alert_email_sync(self, dag_id: str, dag_run_id: str, diagnosis: Dict[str, Any]) -> bool:
        """Synchronous SMTP email sender."""
        if not settings.ENABLE_EMAIL_ALERTS:
            logger.info(f"Email alerts disabled in settings. Skipping email for DAG '{dag_id}'")
            return False

        if not settings.SMTP_USER or not settings.SMTP_PASSWORD or not settings.ALERT_RECIPIENT_EMAILS:
            logger.warning("SMTP credentials or recipient emails not configured in .env")
            return False

        if self.is_already_notified(dag_id, dag_run_id):
            logger.info(f"Already sent email alert for DAG '{dag_id}' run '{dag_run_id}'. Skipping duplicate.")
            return False

        try:
            subject = f"🚨 [Airflow Alert] DAG Failure Detected: {dag_id}"
            html_content = self._build_html_email(dag_id, dag_run_id, diagnosis)

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_USER
            msg["To"] = ", ".join(settings.ALERT_RECIPIENT_EMAILS)

            part_html = MIMEText(html_content, "html")
            msg.attach(part_html)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, settings.ALERT_RECIPIENT_EMAILS, msg.as_string())

            self.mark_notified(dag_id, dag_run_id)
            logger.info(f"Successfully sent failure alert email for DAG '{dag_id}' to {settings.ALERT_RECIPIENT_EMAILS}")
            return True
        except Exception as e:
            logger.error(f"Failed to send failure email for DAG '{dag_id}': {e}")
            return False

    async def send_failure_alert_email_async(self, dag_id: str, dag_run_id: str, diagnosis: Dict[str, Any]) -> bool:
        """Asynchronous wrapper for SMTP sending."""
        return await asyncio.to_thread(self.send_failure_alert_email_sync, dag_id, dag_run_id, diagnosis)

email_service = EmailService()
