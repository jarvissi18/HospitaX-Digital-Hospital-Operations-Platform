from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
):
    """
    Return dashboard-level statistics.

    Admission/discharge based active-case metrics
    will be introduced in the Admission module.
    Until then, activeCases remains zero rather
    than incorrectly treating every patient as active.
    """

    today = (
        datetime
        .now(timezone.utc)
        .date()
    )


    total_patients = (
        db.query(Patient)
        .count()
    )


    today_patients = (
        db.query(Patient)
        .filter(
            func.date(
                Patient.created_at
            ) == today
        )
        .count()
    )


    return {
        "todayPatients": today_patients,
        "totalPatients": total_patients,

        # Admission module will provide
        # the real value later.
        "activeCases": 0,

        # Kept temporarily for backward
        # compatibility with the existing frontend.
        "voiceStatus": "Ready",
    }