import os
from dataclasses import dataclass
from functools import lru_cache


def _optional_float(key: str) -> float | None:
    raw = os.getenv(key)
    if raw is None or str(raw).strip() == "":
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def _admin_location_latitude() -> float | None:
    for key in ("ADMIN_LOCATION_LATITUDE", "ATTENDANCE_OFFICE_LATITUDE"):
        v = _optional_float(key)
        if v is not None:
            return v
    return None


def _admin_location_longitude() -> float | None:
    for key in ("ADMIN_LOCATION_LONGITUDE", "ATTENDANCE_OFFICE_LONGITUDE"):
        v = _optional_float(key)
        if v is not None:
            return v
    return None


def _geofence_radius_meters() -> int:
    raw = os.getenv("ATTENDANCE_GEOFENCE_RADIUS_METERS", "20")
    try:
        return max(1, int(str(raw).strip()))
    except ValueError:
        return 20


@dataclass(frozen=True)
class Settings:
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    default_admin_email: str
    default_admin_password: str
    attendance_admin_location_latitude: float | None
    attendance_admin_location_longitude: float | None
    attendance_geofence_radius_meters: int


@lru_cache
def get_settings() -> Settings:
    """Reads environment on first call (after load_dotenv in main.py)."""
    return Settings(
        secret_key=os.getenv("SECRET_KEY", "change-me-in-production-use-openssl-rand-hex-32"),
        algorithm="HS256",
        access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")),
        default_admin_email=os.getenv("DEFAULT_ADMIN_EMAIL", "admin@gmail.com"),
        default_admin_password=os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123"),
        attendance_admin_location_latitude=_admin_location_latitude(),
        attendance_admin_location_longitude=_admin_location_longitude(),
        attendance_geofence_radius_meters=_geofence_radius_meters(),
    )
