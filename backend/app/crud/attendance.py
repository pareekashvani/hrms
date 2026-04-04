from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas


def get_attendance_by_employee(db: Session, employee_id: int, skip: int = 0, limit: int = 500):
    return (
        db.query(models.Attendance)
        .filter(models.Attendance.employee_id == employee_id)
        .order_by(models.Attendance.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_attendance_by_employee_and_date(db: Session, employee_id: int, d: date) -> models.Attendance | None:
    return (
        db.query(models.Attendance)
        .filter(models.Attendance.employee_id == employee_id, models.Attendance.date == d)
        .first()
    )


def get_attendance_by_id(db: Session, att_id: int) -> models.Attendance | None:
    return db.query(models.Attendance).filter(models.Attendance.id == att_id).first()


def create_attendance(db: Session, attendance: schemas.AttendanceCreate) -> models.Attendance:
    existing = get_attendance_by_employee_and_date(db, attendance.employee_id, attendance.date)
    if existing:
        raise ValueError("Attendance already recorded for this date")

    db_attendance = models.Attendance(
        employee_id=attendance.employee_id,
        date=attendance.date,
        status=attendance.status,
        check_in_time=attendance.check_in_time,
        check_out_time=attendance.check_out_time,
    )
    db.add(db_attendance)
    try:
        db.commit()
        db.refresh(db_attendance)
        return db_attendance
    except IntegrityError:
        db.rollback()
        raise ValueError("Attendance already recorded for this date")


def update_attendance(db: Session, att_id: int, data: schemas.AttendanceUpdate) -> models.Attendance | None:
    row = get_attendance_by_id(db, att_id)
    if not row:
        return None
    payload = data.model_dump(exclude_unset=True)
    if "status" in payload:
        row.status = payload["status"]
    if "check_in_time" in payload:
        row.check_in_time = payload["check_in_time"]
    if "check_out_time" in payload:
        row.check_out_time = payload["check_out_time"]
    db.commit()
    db.refresh(row)
    return row


def get_all_attendance(
    db: Session,
    employee_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
):
    q = db.query(models.Attendance)
    if employee_id is not None:
        q = q.filter(models.Attendance.employee_id == employee_id)
    if from_date is not None:
        q = q.filter(models.Attendance.date >= from_date)
    if to_date is not None:
        q = q.filter(models.Attendance.date <= to_date)
    return q.order_by(models.Attendance.date.desc()).all()
