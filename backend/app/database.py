import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./hrms.db",
)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _sqlite_migrate_columns() -> None:
    """Add columns introduced after v1 for existing SQLite files (create_all does not alter tables)."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    insp = inspect(engine)
    with engine.begin() as conn:
        if insp.has_table("employees"):
            cols = {c["name"] for c in insp.get_columns("employees")}
            if "user_id" not in cols:
                conn.execute(text("ALTER TABLE employees ADD COLUMN user_id INTEGER"))
        if insp.has_table("users"):
            cols = {c["name"] for c in insp.get_columns("users")}
            if "department" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(255)"))
        if insp.has_table("attendance"):
            cols = {c["name"] for c in insp.get_columns("attendance")}
            if "check_in_time" not in cols:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN check_in_time DATETIME"))
            if "check_out_time" not in cols:
                conn.execute(text("ALTER TABLE attendance ADD COLUMN check_out_time DATETIME"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from . import models  # noqa: F401 — register ORM metadata

    Base.metadata.create_all(bind=engine)
    _sqlite_migrate_columns()
    from .seed import ensure_default_admin

    db = SessionLocal()
    try:
        ensure_default_admin(db)
    finally:
        db.close()
