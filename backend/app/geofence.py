"""Resolve which admin anchor point and radius apply for attendance geofencing."""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from .config import get_settings
from .crud.admin_geofence import get_singleton_row


@dataclass(frozen=True)
class ResolvedGeofence:
    enabled: bool
    latitude: float | None
    longitude: float | None
    radius_meters: int
    source: str  # database | environment | none


def resolve_geofence(db: Session) -> ResolvedGeofence:
    """
    Priority:
    1. Coordinates stored in DB (set by admin from browser) — preferred for production.
    2. ADMIN_LOCATION_* / legacy env on the server — fallback for ops / migration.
    3. Disabled if neither provides a full pair.
    """
    row = get_singleton_row(db)
    if row.latitude is not None and row.longitude is not None:
        r = int(row.radius_meters or 30)
        return ResolvedGeofence(True, row.latitude, row.longitude, max(1, min(5000, r)), "database")

    s = get_settings()
    elat, elon = s.attendance_admin_location_latitude, s.attendance_admin_location_longitude
    if elat is not None and elon is not None:
        return ResolvedGeofence(
            True,
            elat,
            elon,
            s.attendance_geofence_radius_meters,
            "environment",
        )

    return ResolvedGeofence(False, None, None, 30, "none")
