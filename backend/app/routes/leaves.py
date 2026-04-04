from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..crud import employees as emp_crud
from ..crud import leaves as leave_crud
from ..database import get_db
from ..deps import get_current_user, get_employee_for_user, require_admin

router = APIRouter(prefix="/leaves", tags=["leaves"])


def _leave_to_schema(row: models.Leave, emp: models.Employee | None = None) -> schemas.LeaveWithEmployee:
    base = schemas.LeaveWithEmployee(
        id=row.id,
        employee_id=row.employee_id,
        from_date=row.from_date,
        to_date=row.to_date,
        reason=row.reason,
        status=row.status,
        employee_employee_id=emp.employee_id if emp else None,
        employee_full_name=emp.full_name if emp else None,
        employee_department=emp.department if emp else None,
    )
    return base


@router.post("", response_model=schemas.LeaveResponse, status_code=201)
def apply_leave(
    body: schemas.LeaveCreate,
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if current.role != "employee":
        raise HTTPException(status_code=403, detail="Only employees can apply for leave via this endpoint")
    emp = get_employee_for_user(db, current)
    if not emp:
        raise HTTPException(status_code=400, detail="No employee profile linked to your account")
    return leave_crud.create_leave(db, emp.id, body)


@router.get("", response_model=list[schemas.LeaveWithEmployee])
def list_leaves(
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    status: str | None = Query(None, description="Filter by status"),
):
    if current.role == "admin":
        rows = leave_crud.list_all_leaves(db, status=status)
        result = []
        for row in rows:
            emp = emp_crud.get_employee_by_db_id(db, row.employee_id)
            result.append(_leave_to_schema(row, emp))
        return result

    emp = get_employee_for_user(db, current)
    if not emp:
        return []
    rows = leave_crud.list_leaves_for_employee(db, emp.id)
    if status:
        rows = [r for r in rows if r.status == status]
    return [_leave_to_schema(r, emp) for r in rows]


@router.patch("/{leave_id}/status", response_model=schemas.LeaveResponse)
def set_leave_status(
    leave_id: int,
    body: schemas.LeaveStatusUpdate,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    row = leave_crud.get_leave_by_id(db, leave_id)
    if not row:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if row.status != "Pending":
        raise HTTPException(status_code=400, detail="Leave is no longer pending")
    updated = leave_crud.update_leave_status(db, leave_id, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return updated
