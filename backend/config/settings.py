import os
from dotenv import load_dotenv

load_dotenv()

def _env(key: str, default: str = "") -> str:
    val = os.getenv(key)
    if val is not None and val.strip():
        return val.strip()
    return default

APP_USER_AGENT = _env(
    "APP_USER_AGENT",
    "SmartMultiRiskPlatform/1.0"
)
APP_CONTACT_EMAIL = _env("APP_CONTACT_EMAIL", "")

NOMINATIM_URL = _env(
    "NOMINATIM_URL",
    "https://nominatim.openstreetmap.org/search"
)
NOMINATIM_REVERSE_URL = _env(
    "NOMINATIM_REVERSE_URL",
    "https://nominatim.openstreetmap.org/reverse"
)

OVERPASS_ENDPOINTS = [
    x.strip() for x in _env(
        "OVERPASS_ENDPOINTS",
        "https://overpass-api.de/api/interpreter,"
        "https://overpass.kumi.systems/api/interpreter"
    ).split(",") if x.strip()
]

BHUVAN_WMS_URL = _env(
    "BHUVAN_WMS_URL",
    "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms"
)

MOSDAC_MDAPI_ZIP = _env(
    "MOSDAC_MDAPI_ZIP",
    "https://www.mosdac.gov.in/software/mdapi.zip"
)

OPEN_METEO_FORECAST_URL = _env(
    "OPEN_METEO_FORECAST_URL",
    "https://api.open-meteo.com/v1/forecast"
)
OPEN_METEO_ARCHIVE_URL = _env(
    "OPEN_METEO_ARCHIVE_URL",
    "https://archive-api.open-meteo.com/v1/archive"
)
OPEN_METEO_AIR_URL = _env(
    "OPEN_METEO_AIR_URL",
    "https://air-quality-api.open-meteo.com/v1/air-quality"
)
OPEN_METEO_ELEVATION_URL = _env(
    "OPEN_METEO_ELEVATION_URL",
    "https://api.open-meteo.com/v1/elevation"
)
OPEN_METEO_MARINE_URL = _env(
    "OPEN_METEO_MARINE_URL",
    "https://marine-api.open-meteo.com/v1/marine"
)
OPEN_METEO_FLOOD_URL = _env(
    "OPEN_METEO_FLOOD_URL",
    "https://flood-api.open-meteo.com/v1/flood"
)
USGS_EARTHQUAKE_URL = _env(
    "USGS_EARTHQUAKE_URL",
    "https://earthquake.usgs.gov/fdsnws/event/1/query"
)
GDACS_EVENTS_URL = _env(
    "GDACS_EVENTS_URL",
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC,VO"
)

# Open-Meteo Spatial Rainfall Configuration (Phase E Replacement)
OPEN_METEO_SPATIAL_URL = _env(
    "OPEN_METEO_SPATIAL_URL",
    "https://api.open-meteo.com/v1/forecast"
)

REQUEST_TIMEOUT_SECONDS = float(_env("REQUEST_TIMEOUT_SECONDS", "20"))

# NASA FIRMS Active Fire API
FIRMS_MAP_KEY = _env("FIRMS_MAP_KEY", "")
FIRMS_BASE_URL = _env("FIRMS_BASE_URL", "https://firms.modaps.eosdis.nasa.gov/api/area/csv")

# NDMA SACHET CAP Alerts Feed
SACHET_CAP_URL = _env("SACHET_CAP_URL", "https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails")

# Smart Alert Engine & Database Storage
ALERT_DB_PATH = _env(
    "ALERT_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "alerts.db")
)

# Notification Channels Configuration
SMTP_HOST = _env("SMTP_HOST", "")
SMTP_PORT = int(_env("SMTP_PORT", "587"))
SMTP_USER = _env("SMTP_USER", "")
SMTP_PASSWORD = _env("SMTP_PASSWORD", "")
SMTP_FROM = _env("SMTP_FROM", "alerts@smart-multi-risk.gov.in")
FCM_SERVER_KEY = _env("FCM_SERVER_KEY", "")
