from sqlalchemy.orm import Session

from .. import models, schemas


def create_leave(db: Session, employee_id: int, data: schemas.LeaveCreate) -> models.Leave:
    row = models.Leave(
        employee_id=employee_id,
        from_date=data.from_date,
        to_date=data.to_date,
        reason=data.reason.strip(),
        status="Pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_leave_by_id(db: Session, leave_id: int) -> models.Leave | None:
    return db.query(models.Leave).filter(models.Leave.id == leave_id).first()


def list_leaves_for_employee(db: Session, employee_id: int):
    return (
        db.query(models.Leave)
        .filter(models.Leave.employee_id == employee_id)
        .order_by(models.Leave.from_date.desc())
        .all()
    )


def list_all_leaves(db: Session, status: str | None = None):
    q = db.query(models.Leave).join(models.Employee)
    if status:
        q = q.filter(models.Leave.status == status)
    return q.order_by(models.Leave.from_date.desc()).all()


def update_leave_status(db: Session, leave_id: int, status: str) -> models.Leave | None:
    row = get_leave_by_id(db, leave_id)
    if not row:
        return None
    row.status = status
    db.commit()
    db.refresh(row)
    return row
