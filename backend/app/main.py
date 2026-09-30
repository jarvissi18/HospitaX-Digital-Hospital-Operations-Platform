from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models

from app.routers import work_tasks
from app.routers import clinical_encounters, nursing_observations
from app.routers import appointments
from app.routers import patient_queue
from app.routers import lab
from app.routers import prescriptions
from app.routers import referrals
from app.routers import transfers
from app.routers import discharge
from app.routers import followups
from app.routers import ai_operations

from app.routers import (
    patients,
    dashboard,
    analytics,
    settings,
    database,
    auth,
    staff,
    hospital_structure,
    housekeepers,
    attendance,
)


# =====================================================
# DATABASE
# =====================================================

Base.metadata.create_all(bind=engine)


# =====================================================
# FASTAPI APPLICATION
# =====================================================

app = FastAPI(
    title="HospitaX — Digital Hospital Operations Platform",
    version="1.0.0",
    description=(
        "Digital Hospital Operations Platform "
        "backend powered by FastAPI."
    ),
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# ROUTERS
# =====================================================

# -----------------------------------------------------
# Nursing observations
# -----------------------------------------------------

app.include_router(
    nursing_observations.router
)

# -----------------------------------------------------
# Clinical encounters
# -----------------------------------------------------

app.include_router(
    clinical_encounters.router
)

# -----------------------------------------------------
# WORK TASKS
# -----------------------------------------------------

app.include_router(
    work_tasks.router
)

# -----------------------------------------------------
# APPOINTMENTS
# -----------------------------------------------------

app.include_router(
    appointments.router
)

# -----------------------------------------------------
# PATIENT QUEUE & TRIAGE
# -----------------------------------------------------

app.include_router(
    patient_queue.router
)

# -----------------------------------------------------
# Prescriptions
# -----------------------------------------------------

app.include_router(
    prescriptions.router
)

# -----------------------------------------------------
# Referrals
# -----------------------------------------------------

app.include_router(
    referrals.router
)

# -----------------------------------------------------
# Transfers
# -----------------------------------------------------

app.include_router(
    transfers.router
)

# -----------------------------------------------------
# Discharge
# -----------------------------------------------------

app.include_router(
    discharge.router
)

# -----------------------------------------------------
# Followups
# -----------------------------------------------------

app.include_router(
    followups.router
)

# -----------------------------------------------------
# LABORATORY
# -----------------------------------------------------

app.include_router(
    lab.router
)

# -----------------------------------------------------
# PATIENT MANAGEMENT
# -----------------------------------------------------

app.include_router(
    patients.router
)

# -----------------------------------------------------
# DASHBOARD
# -----------------------------------------------------

app.include_router(
    dashboard.router
)

# -----------------------------------------------------
# ANALYTICS
# -----------------------------------------------------

app.include_router(
    analytics.router
)

# -----------------------------------------------------
# SETTINGS
# -----------------------------------------------------

app.include_router(
    settings.router
)

# -----------------------------------------------------
# DATABASE MANAGEMENT
# -----------------------------------------------------

app.include_router(
    database.router
)

# -----------------------------------------------------
# AUTHENTICATION
# -----------------------------------------------------

app.include_router(
    auth.router
)

# -----------------------------------------------------
# STAFF MANAGEMENT
# -----------------------------------------------------

app.include_router(
    staff.router
)

# -----------------------------------------------------
# HOSPITAL STRUCTURE
# -----------------------------------------------------

app.include_router(
    hospital_structure.router
)

# -----------------------------------------------------
# HOUSEKEEPER MANAGEMENT
# -----------------------------------------------------

app.include_router(
    housekeepers.router
)

# -----------------------------------------------------
# STAFF ATTENDANCE
# -----------------------------------------------------

app.include_router(
    attendance.router
)

# -----------------------------------------------------
# AI OPERATIONS
# -----------------------------------------------------

app.include_router(
    ai_operations.router
)


# =====================================================
# ROOT
# =====================================================

@app.get(
    "/",
    tags=["System"],
)
def root():
    return {
        "message": (
            "HospitaX Backend "
            "Running Successfully 🚀"
        )
    }


# =====================================================
# HEALTH CHECK
# =====================================================

@app.get(
    "/health",
    tags=["System"],
)
def health():
    return {
        "status": "healthy",
    }