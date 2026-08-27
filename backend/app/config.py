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

    # Frequency Module Categorization Rules
    WEEKLY_MODULES: list = [
        m.strip().lower() for m in os.getenv("WEEKLY_MODULES", "booking,hotelscom,priceline").split(",") if m.strip()
    ]
    MONTHLY_MODULES: list = [
        m.strip().lower() for m in os.getenv("MONTHLY_MODULES", "tripadvisor,google,oag,airbnb").split(",") if m.strip()
    ]

    # Authoritative Module to DAG ID Dictionary Mapping
    MODULE_DAG_ID: dict = {
        'tripadvisor': [
            'tripadvisor_archieve_load',
            'tripadvisor_transform_data',
            'tripadvisor_reviews_extractor',
            'tripadvisor_run_actor_reviews',
            'tripadvisor_listings_extractor',
            'tripadvisor_run_actor_listings'
        ],
        'booking': [
            'booking_hotels_rooms',
            'booking_hotels_extractor',
            'booking_hotels_license',
            'booking_hotels_details',
            'booking_hotels_search',
            'booking_download_cities',
            'booking_hotels_reviews',
            'booking_archieve_load',
            'booking_hotels_review_categories'
        ],
        'hotelscom': [
            'hotelscom_hotels_extractor',
            'hotelscom_hotels_reviews',
            'hotelscom_hotels_rooms',
            'hotelscom_hotels_details',
            'hotelscom_hotels_search',
            'hotelscom_download_regions',
            'hotelscom_archieve_load'
        ],
        'priceline': [
            'priceline_hotels_extractor',
            'priceline_hotels_details',
            'priceline_hotels_search',
            'priceline_hotels_locations',
            'priceline_hotels_reviews',
            'priceline_download_cities',
            'priceline_archieve_load'
        ],
        'google': [
            'google_maps_run_actor',
            'google_maps_stage_load',
            'google_maps_extractor',
            'google_maps_archieve_load'
        ],
        'oag': [
            'oag_stage_load',
            'oag_archieve_load'
        ],
        'airbnb': [
            'airbnb_operational_extractor_weekly',
            'airbnb_operational_extractor_monthly',
            'airbnb_listings_reviews',
            'airbnb_metabase_listings_extractor',
            'airbnb_metabase_operational_extractor',
            'airbnb_operational_extractor_daily',
            'airbnb_weekly_archieve_load',
            'airbnb_weekly_stage_load'
        ]
    }

    # Frontend CORS origins
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]

settings = Settings()
