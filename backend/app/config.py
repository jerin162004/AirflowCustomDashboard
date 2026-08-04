import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    AIRFLOW_BASE_URL: str = os.getenv("AIRFLOW_BASE_URL", "http://localhost:8080/api/v2")
    AIRFLOW_USER: str = os.getenv("AIRFLOW_USER", "airflow")
    AIRFLOW_PASSWORD: str = os.getenv("AIRFLOW_PASSWORD", "airflow")
    CACHE_TTL_SECONDS: float = float(os.getenv("CACHE_TTL_SECONDS", "15"))
    USE_MOCK_FALLBACK: bool = os.getenv("USE_MOCK_FALLBACK", "True").lower() == "true"
    AIRFLOW_VERIFY_SSL: bool = os.getenv("AIRFLOW_VERIFY_SSL", "False").lower() == "true"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Frontend CORS origins
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]

settings = Settings()
