from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..crud import employees as emp_crud
from ..database import get_db
from ..deps import get_current_user, require_admin

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=list[schemas.EmployeeResponse])
def list_employees(
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 200,
    search: str | None = Query(None, description="Search name, employee id, or email"),
    department: str | None = Query(None, description="Filter by department (partial match)"),
):
    return emp_crud.get_employees(db, skip=skip, limit=limit, search=search, department=department)


@router.post("", response_model=schemas.EmployeeResponse, status_code=201)
def create_employee(
    employee: schemas.EmployeeCreate,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    try:
        return emp_crud.create_employee(db, employee)
    except ValueError as e:
        if "conflict" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{employee_id}", response_model=schemas.EmployeeResponse)
def get_employee(
    employee_id: int,
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    emp = emp_crud.get_employee_by_db_id(db, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.put("/{employee_id}", response_model=schemas.EmployeeResponse)
def update_employee(
    employee_id: int,
    body: schemas.EmployeeUpdate,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    try:
        updated = emp_crud.update_employee(db, employee_id, body)
    except ValueError as e:
        if "conflict" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")
    return updated


@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: int,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    if not emp_crud.delete_employee(db, employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    return None
