import secrets

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models
from ..security import generate_random_password, get_password_hash, verify_password


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()


def list_users(db: Session) -> list[models.User]:
    return db.query(models.User).order_by(models.User.id).all()


def authenticate(db: Session, email: str, password: str) -> models.User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_employee_by_admin(db: Session, name: str, email: str, department: str) -> tuple[models.User, models.Employee, str]:
    """Create User (employee) + linked Employee row. Returns (user, employee, plain_password)."""
    email_norm = email.strip().lower()
    dept = department.strip()

    if get_user_by_email(db, email_norm):
        raise ValueError("Email already exists")

    existing_emp = db.query(models.Employee).filter(models.Employee.email == email_norm).first()
    if existing_emp:
        raise ValueError("An employee record with this email already exists")

    plain = generate_random_password(10)
    user = models.User(
        name=name.strip(),
        email=email_norm,
        hashed_password=get_password_hash(plain),
        role="employee",
        department=dept,
    )
    db.add(user)
    db.flush()

    eid = f"EMP{secrets.token_hex(3).upper()}"
    while db.query(models.Employee).filter(models.Employee.employee_id == eid).first():
        eid = f"EMP{secrets.token_hex(3).upper()}"

    emp = models.Employee(
        user_id=user.id,
        employee_id=eid,
        full_name=name.strip(),
        email=email_norm,
        department=dept,
    )
    db.add(emp)
    try:
        db.commit()
        db.refresh(user)
        db.refresh(emp)
        return user, emp, plain
    except IntegrityError:
        db.rollback()
        raise ValueError("Could not create employee account")
