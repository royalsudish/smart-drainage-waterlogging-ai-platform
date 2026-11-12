"""
Time-Series Storage & Telemetry Database
Persists multi-source external observations, model predictions, and water balance telemetry.
Uses SQLite for robust, zero-dependency, local time-series tracking.
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

ROOT_DIR = Path(__file__).resolve().parents[2]
DB_PATH = ROOT_DIR / "data" / "water_intelligence.db"

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_PATH.parent, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_time_series_db():
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location_name TEXT NOT NULL,
                district TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                observation_time TEXT NOT NULL,
                retrieval_time TEXT NOT NULL,
                rainfall_24h_mm REAL,
                forecast_next_24h_mm REAL,
                waterlogged_area_km2 REAL,
                estimated_storage_mcm REAL,
                drainage_outflow_cumecs REAL,
                outflow_status TEXT,
                risk_probability_pct REAL,
                risk_tier TEXT,
                water_balance_trend TEXT,
                provenance_source TEXT NOT NULL,
                quality_status TEXT NOT NULL
            );
            """)

            conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_telemetry_location_time 
            ON telemetry_snapshots(district, location_name, observation_time);
            """)

            conn.execute("""
            CREATE TABLE IF NOT EXISTS api_provider_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider_name TEXT NOT NULL,
                endpoint_url TEXT NOT NULL,
                location TEXT,
                http_status INTEGER,
                response_latency_ms REAL,
                quality_status TEXT NOT NULL,
                error_message TEXT,
                logged_at TEXT NOT NULL
            );
            """)
    finally:
        conn.close()

def record_telemetry_snapshot(snapshot: Dict[str, Any]):
    """
    Records a live or model-derived telemetry state for historical trending.
    """
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
            INSERT INTO telemetry_snapshots (
                location_name, district, latitude, longitude,
                observation_time, retrieval_time,
                rainfall_24h_mm, forecast_next_24h_mm,
                waterlogged_area_km2, estimated_storage_mcm,
                drainage_outflow_cumecs, outflow_status,
                risk_probability_pct, risk_tier, water_balance_trend,
                provenance_source, quality_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                snapshot.get("location_name", "Unknown"),
                snapshot.get("district", "Unknown"),
                float(snapshot.get("latitude", 0.0)),
                float(snapshot.get("longitude", 0.0)),
                snapshot.get("observation_time", datetime.now(timezone.utc).isoformat()),
                datetime.now(timezone.utc).isoformat(),
                snapshot.get("rainfall_24h_mm"),
                snapshot.get("forecast_next_24h_mm"),
                snapshot.get("waterlogged_area_km2"),
                snapshot.get("estimated_storage_mcm"),
                snapshot.get("drainage_outflow_cumecs"),
                snapshot.get("outflow_status", "UNMEASURED"),
                snapshot.get("risk_probability_pct"),
                snapshot.get("risk_tier", "UNKNOWN"),
                snapshot.get("water_balance_trend", "EQUILIBRIUM"),
                snapshot.get("provenance_source", "LIVE_API"),
                snapshot.get("quality_status", "VALID")
            ))
    except Exception as exc:
        print(f"[TimeSeriesDB] Error saving snapshot: {exc}")
    finally:
        conn.close()

def log_api_provider_event(
    provider_name: str,
    endpoint_url: str,
    http_status: Optional[int],
    latency_ms: float,
    quality_status: str,
    location: str = "Andhra Pradesh",
    error_message: Optional[str] = None
):
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
            INSERT INTO api_provider_logs (
                provider_name, endpoint_url, location, http_status,
                response_latency_ms, quality_status, error_message, logged_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                provider_name,
                endpoint_url,
                location,
                http_status,
                round(latency_ms, 1),
                quality_status,
                error_message,
                datetime.now(timezone.utc).isoformat()
            ))
    except Exception as exc:
        print(f"[TimeSeriesDB] Error logging API event: {exc}")
    finally:
        conn.close()

def get_telemetry_history(district: str, limit: int = 24) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
        SELECT * FROM telemetry_snapshots 
        WHERE district = ? 
        ORDER BY id DESC LIMIT ?
        """, (district, limit))
        rows = cur.fetchall()
        return [dict(r) for r in reversed(rows)]
    finally:
        conn.close()

# Initialize tables on import
init_time_series_db()

