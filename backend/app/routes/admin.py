from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..crud import admin_geofence as admin_geofence_crud
from ..crud import users as user_crud
from ..database import get_db
from ..deps import require_admin
from ..geofence import resolve_geofence

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_location_status(db: Session) -> schemas.AdminLocationStatus:
    g = resolve_geofence(db)
    row = admin_geofence_crud.get_singleton_row(db)
    return schemas.AdminLocationStatus(
        geofence_active=g.enabled,
        source=g.source,
        latitude=g.latitude,
        longitude=g.longitude,
        radius_meters=g.radius_meters,
        updated_at=row.updated_at if g.source == "database" else None,
    )


@router.get("/location-status", response_model=schemas.AdminLocationStatus)
def get_admin_location_status(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    return _admin_location_status(db)


@router.post("/set-admin-location", response_model=schemas.AdminLocationStatus)
def set_admin_location(
    body: schemas.AdminSetLocation,
    current: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    admin_geofence_crud.set_admin_location(
        db,
        latitude=body.latitude,
        longitude=body.longitude,
        radius_meters=body.radius_meters,
        updated_by_user_id=current.id,
    )
    return _admin_location_status(db)


@router.delete("/location", response_model=schemas.AdminLocationStatus)
def clear_admin_location_db(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """Remove DB-stored anchor; env-based coordinates apply again if configured."""
    admin_geofence_crud.clear_admin_location(db)
    return _admin_location_status(db)


@router.post(
    "/create-employee",
    response_model=schemas.AdminCreateEmployeeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_employee_account(
    body: schemas.AdminCreateEmployee,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    try:
        user, emp, plain = user_crud.create_employee_by_admin(
            db, body.name, str(body.email), body.department
        )
    except ValueError as e:
        msg = str(e).lower()
        if "already" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return schemas.AdminCreateEmployeeResponse(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department or emp.department,
        employee_record_id=emp.id,
        employee_code=emp.employee_id,
        temporary_password=plain,
    )


@router.get("/users", response_model=list[schemas.AdminUserRow])
def list_all_users(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    return user_crud.list_users(db)
