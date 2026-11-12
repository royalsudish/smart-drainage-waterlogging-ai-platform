# Smart India-Wide Multi-Risk AI Platform

Pan-India Geospatial Command Center for **Smart Drainage, Waterlogging Early-Warning, Flood Intelligence, Multi-Hazard Risk Prediction, Weather Forecasting, and Agricultural Advisory**.

Built on a software-only geospatial architecture combining trained machine learning models, live meteorological and hydrological APIs, satellite Earth observation indices, terrain analysis, and interactive multi-level GIS mapping (`India → State → District → Municipality / Urban Body → Ward / Division`).

---

## 1. Main Features

- **Pan-India Command Center (`/commandcenter`)**: 3D globe and multi-risk operational overview covering 36 Indian States/Union Territories, real-time alert monitoring, and hazard feeds (Open-Meteo weather/flood, USGS earthquakes, GDACS cyclone/volcano alerts, NASA FIRMS fire data, NDMA SACHET CAP alerts).
- **Home Intelligence Dashboard (`/home` & `/`)**:
  - Live waterlogged area, estimated water/reservoir storage (`MCM`), drainage outflow (`m³/s`), and 24-hour + forecast rainfall telemetry.
  - Synchronized cascading location hierarchy (`State → District → Municipality → Ward / Division`) with validated persistence and ward search.
  - Ward / Division ML Risk Inspector showing risk probability gauge, contributing physical factors, and recommended action.
  - Dual-axis 24h/48h/7d rainfall & risk probability trend chart and risk-tier breakdown donut chart.
- **Location Dashboard (`/location`)**: Interactive satellite/terrain/street map with OpenStreetMap drainage infrastructure layers, location search, flow-path indicators, and live telemetry cards.
- **Drainage Network Intelligence (`/drainage`)**: Stormwater inflow vs. outflow water balance, channel capacity & bottleneck detection, pump/sluice operations, and 24-hour drainage trends.
- **Waterlogging & Ward Analysis (`/waterlogging`)**: Multi-level GIS drill-down (`India → Andhra Pradesh → Guntur District → Guntur Municipal Corporation`), Sentinel-1 SAR backscatter (`VV dB`) and Sentinel-2 optical indices (`NDVI`, `NDBI`, `NDWI`), 57-ward GMC risk ranking, and hourly rainfall vs. risk trend charts.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.11+, Flask 3.1.2, Flask Blueprints (`/api/*`), SQLite (`time_series_db`, `alerts.db`), `requests`, `python-dotenv` |
| **Machine Learning** | `scikit-learn==1.6.1`, `xgboost==3.4.1`, `lightgbm>=4.6`, `joblib`, `pandas`, `numpy` |
| **Frontend** | Vanilla ES6 JavaScript, HTML5, CSS3, Leaflet.js, Chart.js, Three.js (3D Earth globe) |
| **External Data Feeds** | Open-Meteo (Forecast, Archive, Elevation, Air Quality, Marine, GloFAS Flood), ESA Sentinel-1 SAR & Sentinel-2 Optical, OpenStreetMap Overpass & Nominatim, USGS Earthquakes, GDACS, NASA FIRMS, NDMA SACHET |

---

## 3. AI/ML Model Information

Pre-trained model artifacts and metadata live under `models/` and are loaded dynamically by `backend/services/model_service.py`:

| Domain | Artifact | Model Architecture & Features | Notes |
| :--- | :--- | :--- | :--- |
| **Waterlogging** | `models/waterlogging/waterlogging.pkl` (`tuned_random_forest_pipeline.joblib`) | Tuned Random Forest Pipeline (`n_estimators=150`, `max_depth=18`, `class_weight="balanced"`, threshold `0.36`), **30 engineered meteorological, antecedent-rain & topographic features** | Trained on rule-derived weak labels (Jan 2024 – Apr 2026; test window Apr 2026 – Sep 2026). As noted in `models/waterlogging/metadata.json`, offline metrics evaluate reproduction of the weak-label rule and are not independently ground-truthed disaster field accuracy. |
| **Drainage Congestion** | `models/drainage/drainage_random_forest.pkl` | Random Forest Classifier (`100` trees), **6 features**: `elevation`, `slope`, `rain_max` (`log10(rain_mm + 1)`), `sentinel1_vv`, `NDVI`, `NDBI` | Outputs congestion probability across `Low Risk (0)` and `Congestion / Failure Risk (1)`. |
| **Multi-Hazard Disaster** | `models/disaster/portable/disaster_xgb.json` & `disaster_prediction_pipeline.pkl` | Scaled XGBoost multi-class classifier (`RobustScaler` + `LabelEncoder`), **20 features**, **18 hazard classes** (`flood`, `cyclone`, `heavy_rainfall`, `heat_wave`, `earthquake`, etc.) | Portable XGBoost JSON + `.joblib` preprocessors prioritized at runtime for cross-version stability. |
| **Weather Multi-Target** | `models/weather/portable/` | **18 per-target XGBRegressor models** (`39` meteorological & lag features) | Predicts temperature, precipitation, rain, humidity, wind, soil moisture, radiation, pressure, etc. |
| **Agricultural Advisory** | `models/agriculture/agriculture.pkl` | Multi-target LightGBM bundle (`35` features: 32 numeric + 3 encoded categoricals) | Outputs 5 agronomic targets (`crop_weather_risk`, `irrigation`, `heat_stress`, `waterlogging_risk`, `spraying_suitability`). |

### Administrative GIS Scope Note
- The Guntur Municipal Corporation polygon layer (`frontend/static/data/gmc_57_wards.geojson`) and `GMC_57_WARDS` service catalog contain **57 verified project wards**.
- The Andhra Pradesh Gazette notification dated September 2026 proposes delimitation to 76 wards; where 76-ward polygon shapefiles are not present in this repository, the UI explicitly labels the boundary as the **57-ward verified project GIS dataset** without fabricating boundaries.

---

## 4. Project Folder Structure

```text
.
├── app.py                              # Flask application entrypoint & page routes
├── requirements.txt                    # Python dependencies
├── start.bat                           # Windows launcher script
├── .env.example                        # Environment variable template (safe placeholders)
├── .gitignore                          # Excludes .env, caches, runtime DBs, venv, backups
├── backend/
│   ├── config/settings.py              # Environment-backed external API & alert settings
│   ├── data_sources/                   # External API clients (Open-Meteo, Sentinel, Overpass, USGS, GDACS, FIRMS, SQLite DBs)
│   ├── routes/api.py                   # REST API endpoints (/api/locations/*, /api/ap/*, /api/gmc/*, /api/risk/*, /api/predict/*)
│   ├── services/                       # ML inference, feature engineering, live intelligence, drainage & water storage logic
│   └── utils/                          # TTL cache & standardized JSON response helpers
├── frontend/
│   ├── templates/index.html            # Single-page multi-view Geospatial Command Center template
│   └── static/
│       ├── css/                        # Dashboard & Leaflet stylesheets
│       ├── data/                       # GeoJSON layers (India states, Andhra Pradesh, Guntur district, GMC 57 wards)
│       ├── images/                     # SVG logos and dashboard visual assets
│       └── js/                         # Application controller (app.js), 3D Earth visualizer, static GeoJS helpers, vendor libs
├── models/                             # Serialized ML models, preprocessors, scalers, portable JSON bundles & metadata
└── data/                               # Offline fallback meteorological CSV datasets (runtime SQLite DBs auto-created)
```

---

## 5. Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd smart-india-multi-risk-ai-platform
   ```

2. **Create and activate a Python virtual environment**
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # macOS / Linux:
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

---

## 6. Environment Variable Setup

Copy `.env.example` to `.env` and populate optional keys/settings as needed:

```bash
cp .env.example .env
```

- All public Open-Meteo, USGS, GDACS, Overpass, and Nominatim endpoints work out-of-the-box with sensible defaults in `backend/config/settings.py`.
- Optional keys such as `FIRMS_MAP_KEY` (NASA FIRMS), `SMTP_*`, and `FCM_SERVER_KEY` are only needed for active fire overlays and email/push notifications.
- **Never commit `.env` or real credentials to version control.**

---

## 7. Local Execution

Start the Flask server directly:

```bash
python app.py
```

Or on Windows, double-click `start.bat`.

Open your browser to:
- `http://127.0.0.1:5000/` (Command Center)
- `http://127.0.0.1:5000/home` (Home Intelligence Dashboard)
- `http://127.0.0.1:5000/location` (Location Dashboard)
- `http://127.0.0.1:5000/drainage` (Drainage Network)
- `http://127.0.0.1:5000/waterlogging` (Waterlogging & Ward Analysis)

---

## 8. Testing & Verification

Run quick backend API & model loading smoke checks using Flask's built-in test client:

```bash
python -c "
from app import create_app
app = create_app()
client = app.test_client()
assert client.get('/api/health').status_code == 200
assert client.get('/api/locations/states').get_json()['data']['total_states'] == 36
assert client.get('/api/locations/districts?state=Andhra%20Pradesh').get_json()['data']['total_districts'] == 26
assert client.get('/api/locations/wards?state=Andhra%20Pradesh&district=Guntur&municipality=Guntur%20Municipal%20Corporation').get_json()['data']['total_wards'] == 57
print('Smoke checks passed')
"
```

Verify model registry status:

```bash
curl "http://127.0.0.1:5000/api/models/status?load=1"
```

---

## 9. Deployment Preparation

1. **Production WSGI Server**: Do not use Flask's built-in development server in production. Serve `app:create_app()` behind a production server:
   ```bash
   # Linux / Docker (gunicorn):
   gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"

   # Windows (waitress):
   waitress-serve --host=0.0.0.0 --port=5000 --call app:create_app
   ```
2. **Environment Configuration**: Inject `.env` variables securely through your hosting platform's secret manager (`FLASK_DEBUG=0`, `FIRMS_MAP_KEY`, `SMTP_*`, `ALERT_DB_PATH`).
3. **Persistent Storage**: Mount a persistent volume for `data/` if retaining runtime SQLite telemetry snapshots (`water_intelligence.db`) and alert logs (`alerts.db`) across container restarts.
4. **External API Rate Limits**: Set `APP_USER_AGENT` and `APP_CONTACT_EMAIL` appropriately when querying Nominatim/Overpass in production.
