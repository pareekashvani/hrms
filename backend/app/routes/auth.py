from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..crud import users as user_crud
from ..database import get_db
from ..deps import get_current_user
from ..security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    user = user_crud.authenticate(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(user.id, {"role": user.role})
    return schemas.Token(access_token=token)


@router.get("/me", response_model=schemas.MeResponse)
def me(
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    user_loaded = (
        db.query(models.User)
        .options(joinedload(models.User.employee_profile))
        .filter(models.User.id == current.id)
        .first()
    )
    u = user_loaded or current
    employee = None
    if u.employee_profile:
        ep = u.employee_profile
        employee = schemas.EmployeeResponse(
            id=ep.id,
            user_id=ep.user_id,
            employee_id=ep.employee_id,
            full_name=ep.full_name,
            email=ep.email,
            department=ep.department,
        )
    return schemas.MeResponse(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        department=u.department,
        employee=employee,
    )
