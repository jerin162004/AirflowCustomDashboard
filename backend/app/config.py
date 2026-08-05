import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    AIRFLOW_BASE_URL: str = os.getenv("AIRFLOW_BASE_URL", "https://34.18.120.148:8080/api/v2")
    AIRFLOW_USER: str = os.getenv("AIRFLOW_USER", "MT_AIRFLOW_USER")
    AIRFLOW_PASSWORD: str = os.getenv("AIRFLOW_PASSWORD", "MT26@Project")
    CACHE_TTL_SECONDS: float = float(os.getenv("CACHE_TTL_SECONDS", "15"))
    USE_MOCK_FALLBACK: bool = os.getenv("USE_MOCK_FALLBACK", "True").lower() == "true"
    AIRFLOW_VERIFY_SSL: bool = os.getenv("AIRFLOW_VERIFY_SSL", "False").lower() == "true"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Email Failure Alerting Settings
    ENABLE_EMAIL_ALERTS: bool = os.getenv("ENABLE_EMAIL_ALERTS", "False").lower() == "true"
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ALERT_RECIPIENT_EMAILS: list = [
        e.strip() for e in os.getenv("ALERT_RECIPIENT_EMAILS", "").split(",") if e.strip()
    ]

    # Frontend CORS origins
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]

settings = Settings()
