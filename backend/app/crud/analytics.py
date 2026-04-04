from calendar import month_abbr
from collections import defaultdict
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models


def _month_key(d: date) -> str:
    return f"{d.year}-{d.month:02d}"


def get_admin_summary(db: Session) -> dict:
    total_employees = db.query(func.count(models.Employee.id)).scalar() or 0

    present_count = (
        db.query(func.count(models.Attendance.id)).filter(models.Attendance.status == "Present").scalar() or 0
    )
    absent_count = (
        db.query(func.count(models.Attendance.id)).filter(models.Attendance.status == "Absent").scalar() or 0
    )

    rows = db.query(models.Attendance.date, models.Attendance.status).all()
    monthly: dict[str, dict[str, int]] = defaultdict(lambda: {"Present": 0, "Absent": 0})
    for d, status in rows:
        if not d:
            continue
        key = _month_key(d)
        if status in ("Present", "Absent"):
            monthly[key][status] += 1

    monthly_list = []
    for key in sorted(monthly.keys()):
        y, m = key.split("-")
        label = f"{month_abbr[int(m)]} {y}"
        monthly_list.append(
            {
                "period": key,
                "label": label,
                "present": monthly[key]["Present"],
                "absent": monthly[key]["Absent"],
            }
        )

    dept_rows = (
        db.query(models.Employee.department, func.count(models.Employee.id))
        .group_by(models.Employee.department)
        .all()
    )
    department_stats = [{"department": d or "Unknown", "count": int(c)} for d, c in dept_rows]

    return {
        "total_employees": int(total_employees),
        "present_count": int(present_count),
        "absent_count": int(absent_count),
        "monthly_attendance": monthly_list,
        "department_stats": department_stats,
    }


def get_employee_me_stats(db: Session, employee: models.Employee) -> dict:
    present_days = (
        db.query(func.count(models.Attendance.id))
        .filter(models.Attendance.employee_id == employee.id, models.Attendance.status == "Present")
        .scalar()
        or 0
    )
    absent_days = (
        db.query(func.count(models.Attendance.id))
        .filter(models.Attendance.employee_id == employee.id, models.Attendance.status == "Absent")
        .scalar()
        or 0
    )
    pending_leaves = (
        db.query(func.count(models.Leave.id))
        .filter(models.Leave.employee_id == employee.id, models.Leave.status == "Pending")
        .scalar()
        or 0
    )
    approved_leaves = (
        db.query(func.count(models.Leave.id))
        .filter(models.Leave.employee_id == employee.id, models.Leave.status == "Approved")
        .scalar()
        or 0
    )

    return {
        "employee_id": employee.id,
        "full_name": employee.full_name,
        "department": employee.department,
        "present_days": int(present_days),
        "absent_days": int(absent_days),
        "pending_leaves": int(pending_leaves),
        "approved_leaves": int(approved_leaves),
    }
