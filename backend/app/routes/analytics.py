from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..crud import analytics as analytics_crud
from ..database import get_db
from ..deps import get_current_user, get_employee_for_user, require_admin

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=schemas.AnalyticsSummary)
def analytics_summary(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    data = analytics_crud.get_admin_summary(db)
    return schemas.AnalyticsSummary(**data)


@router.get("/me", response_model=schemas.AnalyticsMe)
def analytics_me(
    current: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if current.role != "employee":
        raise HTTPException(status_code=403, detail="Use /analytics/summary for admin dashboard")

    emp = get_employee_for_user(db, current)
    if not emp:
        raise HTTPException(status_code=400, detail="No employee profile linked")
    data = analytics_crud.get_employee_me_stats(db, emp)
    return schemas.AnalyticsMe(**data)
