from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..crud import users as user_crud
from ..database import get_db
from ..deps import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


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
