from collections import Counter
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


# ================= SUMMARY =================

@router.get("/summary")
def analytics_summary(db: Session = Depends(get_db)):
    total_patients = db.query(Patient).count()

    today_patients = (
        db.query(Patient)
        .filter(func.date(Patient.created_at) == date.today())
        .count()
    )

    male_patients = (
        db.query(Patient)
        .filter(Patient.gender.ilike("Male"))
        .count()
    )

    female_patients = (
        db.query(Patient)
        .filter(Patient.gender.ilike("Female"))
        .count()
    )

    return {
        "totalPatients": total_patients,
        "todayPatients": today_patients,
        "malePatients": male_patients,
        "femalePatients": female_patients,
    }


# ================= WEEKLY =================

@router.get("/weekly")
def weekly_patients(db: Session = Depends(get_db)):
    today = datetime.now()

    start_of_week = today - timedelta(days=today.weekday())

    patients = (
        db.query(Patient)
        .filter(Patient.created_at >= start_of_week)
        .all()
    )

    counter = Counter()

    for patient in patients:
        day = patient.created_at.strftime("%a")
        counter[day] += 1

    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    return [
        {
            "day": day,
            "patients": counter.get(day, 0),
        }
        for day in days
    ]


# ================= TOP DISEASES =================

@router.get("/top-diseases")
def top_diseases(db: Session = Depends(get_db)):
    results = (
        db.query(
            Patient.disease,
            func.count(Patient.id).label("patients"),
        )
        .group_by(Patient.disease)
        .order_by(func.count(Patient.id).desc())
        .limit(5)
        .all()
    )

    return [
        {
            "disease": disease,
            "patients": patients,
        }
        for disease, patients in results
    ]


# ================= MONTHLY PATIENTS =================

@router.get("/monthly")
def monthly_patients(db: Session = Depends(get_db)):
    current_year = datetime.now().year

    results = (
        db.query(
            extract("month", Patient.created_at).label("month"),
            func.count(Patient.id).label("patients"),
        )
        .filter(
            extract("year", Patient.created_at) == current_year
        )
        .group_by(
            extract("month", Patient.created_at)
        )
        .order_by(
            extract("month", Patient.created_at)
        )
        .all()
    )

    month_names = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]

    counts = {month: 0 for month in range(1, 13)}

    for month, patients in results:
        counts[int(month)] = patients

    return [
        {
            "month": month_names[i - 1],
            "patients": counts[i],
        }
        for i in range(1, 13)
    ]