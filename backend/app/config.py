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

    # Specific DAG Frequency Overrides
    SPECIFIC_DAG_FREQUENCY_OVERRIDES: dict = {
        'priceline_hotels_reviews': 'Monthly',
        'airbnb_listings_reviews': 'Weekly',
        'airbnb_operational_extractor_weekly': 'Weekly',
        'airbnb_weekly_stage_load': 'Weekly',
        'tripadvisor_run_actor_listings': 'Monthly',
        'tripadvisor_run_actor_reviews': 'Monthly',
        'google_maps_run_actor': 'Monthly'
    }

    # Frontend CORS origins
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]

settings = Settings()

def get_api_details_for_dag(dag_id: str, module_name: str) -> dict:
    clean_id = (dag_id or "").strip().lower()
    clean_mod = (module_name or "").strip().lower()

    # Rule 1: Rapid API (booking, priceline, hotelscom, and airbnb_listings_reviews)
    if clean_mod in ["booking", "priceline", "hotelscom"] or clean_id == "airbnb_listings_reviews":
        provider = "Rapid API"
        if "booking" in clean_mod or "booking" in clean_id:
            api_name = "RapidAPI Booking Engine API"
            cost = "$0.005"
        elif "priceline" in clean_mod or "priceline" in clean_id:
            api_name = "RapidAPI Priceline API"
            cost = "$0.006"
        elif "hotelscom" in clean_mod or "hotelscom" in clean_id:
            api_name = "RapidAPI Hotels.com API"
            cost = "$0.004"
        else:
            api_name = "RapidAPI Airbnb Reviews API"
            cost = "$0.007"
        return {"api_provider_name": provider, "api_name": api_name, "api_call_cost": cost}

    # Rule 2: Apify (google and tripadvisor modules)
    if clean_mod in ["google", "tripadvisor"] or "google" in clean_id or "tripadvisor" in clean_id:
        provider = "Apify"
        if "google" in clean_mod or "google" in clean_id:
            api_name = "Apify Google Maps Scraper API"
            cost = "$0.017"
        else:
            api_name = "Apify TripAdvisor Actor API"
            cost = "$0.008"
        return {"api_provider_name": provider, "api_name": api_name, "api_call_cost": cost}

    # Rule 3: Snowflake (oag module)
    if clean_mod == "oag" or "oag" in clean_id:
        return {
            "api_provider_name": "Snowflake",
            "api_name": "Snowflake OAG Flight Data Share",
            "api_call_cost": "$0.012"
        }

    # Rule 4: Lighthouse (other airbnb DAGs)
    if clean_mod == "airbnb" or "airbnb" in clean_id:
        return {
            "api_provider_name": "Lighthouse",
            "api_name": "Lighthouse Hospitality Intelligence API",
            "api_call_cost": "$0.007"
        }

    return {
        "api_provider_name": "Internal Pipeline",
        "api_name": "Core Data Ingestion API",
        "api_call_cost": "$0.001"
    }
