from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..crud import attendance as att_crud
from ..crud import employees as emp_crud
from ..database import get_db
from ..deps import get_current_user, get_employee_for_user, require_admin
from ..geofence import resolve_geofence
from ..geo_utils import haversine_meters

router = APIRouter(prefix="/attendance", tags=["attendance"])

# India Standard Time (no DST); matches frontend attendance display / checkout window.
_CHECKOUT_TZ = timezone(timedelta(hours=5, minutes=30))


def _checkout_allowed_now_local() -> bool:
    return datetime.now(_CHECKOUT_TZ).time() >= time(19, 0)


@router.get("/geofence-config", response_model=schemas.AttendanceGeofenceConfig)
def attendance_geofence_config(
    _: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    g = resolve_geofence(db)
    return schemas.AttendanceGeofenceConfig(
        enabled=g.enabled,
        radius_meters=g.radius_meters,
        source=g.source,
        latitude=g.latitude if g.enabled else None,
        longitude=g.longitude if g.enabled else None,
    )


def _ensure_can_mark_attendance(
    current: models.User,
    db: Session,
    target_employee_id: int,
) -> None:
    if current.role == "admin":
        return
    emp = get_employee_for_user(db, current)
    if not emp or emp.id != target_employee_id:
        raise HTTPException(status_code=403, detail="You can only mark attendance for your own profile")


@router.get("", response_model=list[schemas.AttendanceResponse])
def list_attendance(
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    employee_id: int | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
):
    effective_employee_id = employee_id
    if current.role != "admin":
        emp = get_employee_for_user(db, current)
        if not emp:
            return []
        if effective_employee_id is not None and effective_employee_id != emp.id:
            raise HTTPException(status_code=403, detail="Cannot filter other employees' attendance")
        effective_employee_id = emp.id

    records = att_crud.get_all_attendance(
        db,
        employee_id=effective_employee_id,
        from_date=from_date,
        to_date=to_date,
    )
    return records


@router.get("/employee/{employee_id}", response_model=list[schemas.AttendanceResponse])
def list_attendance_by_employee(
    employee_id: int,
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 500,
):
    if current.role != "admin":
        emp = get_employee_for_user(db, current)
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Not allowed")

    emp = emp_crud.get_employee_by_db_id(db, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return att_crud.get_attendance_by_employee(db, employee_id, skip=skip, limit=limit)


@router.post("", response_model=schemas.AttendanceResponse, status_code=201)
def mark_attendance(
    attendance: schemas.AttendanceCreate,
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    emp = emp_crud.get_employee_by_db_id(db, attendance.employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    _ensure_can_mark_attendance(current, db, attendance.employee_id)

    g = resolve_geofence(db)
    has_checkout = attendance.check_out_time is not None

    if current.role != "admin" and has_checkout and not _checkout_allowed_now_local():
        raise HTTPException(
            status_code=400,
            detail="You can only check out after 7:00 PM.",
        )

    if current.role != "admin" and g.enabled:
        if attendance.latitude is None or attendance.longitude is None:
            raise HTTPException(
                status_code=400,
                detail="Location is required to mark attendance. Allow location access in your browser and try again.",
            )
        anchor_lat, anchor_lon = g.latitude, g.longitude
        if anchor_lat is None or anchor_lon is None:
            raise HTTPException(status_code=500, detail="Geofence anchor is misconfigured")
        dist = haversine_meters(attendance.latitude, attendance.longitude, anchor_lat, anchor_lon)
        if dist > g.radius_meters:
            if has_checkout:
                raise HTTPException(
                    status_code=403,
                    detail="You must be within 30 meters of the admin location to check out.",
                )
            raise HTTPException(
                status_code=403,
                detail=(
                    f"You must be within {g.radius_meters} meters of "
                    "the registered admin location to mark attendance."
                ),
            )

    try:
        return att_crud.create_attendance(db, attendance)
    except ValueError as e:
        if "already" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{attendance_id}", response_model=schemas.AttendanceResponse)
def patch_attendance(
    attendance_id: int,
    body: schemas.AttendanceUpdate,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    updated = att_crud.update_attendance(db, attendance_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return updated
