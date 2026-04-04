from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas


def get_employee_by_db_id(db: Session, id: int) -> models.Employee | None:
    return db.query(models.Employee).filter(models.Employee.id == id).first()


def get_employee_by_employee_id(db: Session, employee_id: str) -> models.Employee | None:
    return db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first()


def get_employees(
    db: Session,
    skip: int = 0,
    limit: int = 200,
    search: str | None = None,
    department: str | None = None,
):
    q = db.query(models.Employee)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        q = q.filter(
            or_(
                models.Employee.full_name.ilike(term),
                models.Employee.employee_id.ilike(term),
                models.Employee.email.ilike(term),
            )
        )
    if department and department.strip():
        q = q.filter(models.Employee.department.ilike(department.strip()))
    return q.order_by(models.Employee.id).offset(skip).limit(limit).all()


def create_employee(db: Session, employee: schemas.EmployeeCreate) -> models.Employee:
    db_employee = models.Employee(
        user_id=None,
        employee_id=employee.employee_id.strip(),
        full_name=employee.full_name.strip(),
        email=employee.email.strip().lower(),
        department=employee.department.strip(),
    )
    db.add(db_employee)
    try:
        db.commit()
        db.refresh(db_employee)
        return db_employee
    except IntegrityError:
        db.rollback()
        raise ValueError("Employee ID or email conflict")


def update_employee(db: Session, id: int, data: schemas.EmployeeUpdate) -> models.Employee | None:
    emp = get_employee_by_db_id(db, id)
    if not emp:
        return None
    payload = data.model_dump(exclude_unset=True)
    if "employee_id" in payload and payload["employee_id"] is not None:
        emp.employee_id = payload["employee_id"].strip()
    if "full_name" in payload and payload["full_name"] is not None:
        emp.full_name = payload["full_name"].strip()
    if "email" in payload and payload["email"] is not None:
        emp.email = str(payload["email"]).strip().lower()
    if "department" in payload and payload["department"] is not None:
        emp.department = payload["department"].strip()
    try:
        db.commit()
        db.refresh(emp)
        return emp
    except IntegrityError:
        db.rollback()
        raise ValueError("Employee ID or email conflict")


def delete_employee(db: Session, id: int) -> bool:
    emp = get_employee_by_db_id(db, id)
    if not emp:
        return False
    db.delete(emp)
    db.commit()
    return True
