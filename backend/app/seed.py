from sqlalchemy.orm import Session

from . import models
from .config import get_settings
from .security import get_password_hash


def ensure_default_admin(db: Session) -> None:
    settings = get_settings()
    email = settings.default_admin_email.strip().lower()
    exists = db.query(models.User).filter(models.User.email == email).first()
    if exists:
        return
    user = models.User(
        name="Administrator",
        email=email,
        hashed_password=get_password_hash(settings.default_admin_password),
        role="admin",
    )
    db.add(user)
    db.commit()
