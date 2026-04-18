from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .. import models


def get_singleton_row(db: Session) -> models.AdminGeofenceState:
    row = db.query(models.AdminGeofenceState).filter(models.AdminGeofenceState.id == 1).first()
    if row is None:
        row = models.AdminGeofenceState(
            id=1,
            latitude=None,
            longitude=None,
            radius_meters=30,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def set_admin_location(
    db: Session,
    *,
    latitude: float,
    longitude: float,
    radius_meters: int | None,
    updated_by_user_id: int,
) -> models.AdminGeofenceState:
    row = get_singleton_row(db)
    row.latitude = latitude
    row.longitude = longitude
    if radius_meters is not None:
        row.radius_meters = max(1, min(5000, int(radius_meters)))
    row.updated_at = datetime.now(timezone.utc)
    row.updated_by_user_id = updated_by_user_id
    db.commit()
    db.refresh(row)
    return row


def clear_admin_location(db: Session) -> models.AdminGeofenceState:
    """Clear DB-stored coordinates so env-based location (if any) applies again."""
    row = get_singleton_row(db)
    row.latitude = None
    row.longitude = None
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row
