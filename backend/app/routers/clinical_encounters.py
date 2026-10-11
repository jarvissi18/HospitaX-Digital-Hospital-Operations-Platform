
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, schemas, models
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import User


router = APIRouter(
    prefix="/clinical-encounters",
    tags=["Clinical Encounters"],
)


# =====================================================
# ROLE VALIDATION
# =====================================================

def _require_doctor(current_user: User):
    if current_user.role != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Doctors can access clinical encounters.",
        )

    return current_user


# =====================================================
# ACTIVE PATIENT ASSIGNMENT VALIDATION
# =====================================================

def _require_active_patient_assignment(
    db: Session,
    patient_id: int,
    current_user: User,
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id)
        .first()
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    assignment = (
        db.query(models.PatientAssignment)
        .filter(
            models.PatientAssignment.patient_id == patient_id,
            models.PatientAssignment.doctor_id == current_user.id,
            models.PatientAssignment.status == "Active",
        )
        .first()
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this patient. "
                   "An active patient assignment is required.",
        )


# =====================================================
# CREATE CLINICAL ENCOUNTER
# =====================================================

@router.post(
    "/",
    response_model=schemas.ClinicalEncounterResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_clinical_encounter(
    encounter: schemas.ClinicalEncounterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_doctor(current_user)

    try:
        return crud.create_clinical_encounter(
            db=db,
            patient_id=encounter.patient_id,
            doctor_id=current_user.id,
            encounter=encounter,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# GET MY CLINICAL ENCOUNTERS
# =====================================================

@router.get(
    "/my",
    response_model=List[schemas.ClinicalEncounterResponse],
)
def get_my_clinical_encounters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_doctor(current_user)

    return crud.get_clinical_encounters_for_doctor(
        db=db,
        doctor_id=current_user.id,
    )


# =====================================================
# GET CLINICAL HISTORY FOR A PATIENT
# =====================================================

@router.get(
    "/patient/{patient_id}",
    response_model=List[schemas.ClinicalEncounterResponse],
)
def get_patient_clinical_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_doctor(current_user)

    _require_active_patient_assignment(
        db=db,
        patient_id=patient_id,
        current_user=current_user,
    )

    return crud.get_clinical_encounters_for_patient(
        db=db,
        patient_id=patient_id,
    )


# =====================================================
# GET SINGLE CLINICAL ENCOUNTER
# =====================================================

@router.get(
    "/{encounter_id}",
    response_model=schemas.ClinicalEncounterResponse,
)
def get_clinical_encounter(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_doctor(current_user)

    encounter = crud.get_clinical_encounter(
        db=db,
        encounter_id=encounter_id,
    )

    if encounter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found.",
        )

    if encounter.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this clinical encounter.",
        )

    _require_active_patient_assignment(
        db=db,
        patient_id=encounter.patient_id,
        current_user=current_user,
    )

    return encounter


# =====================================================
# UPDATE CLINICAL ENCOUNTER
# =====================================================

@router.put(
    "/{encounter_id}",
    response_model=schemas.ClinicalEncounterResponse,
)
def update_clinical_encounter(
    encounter_id: int,
    encounter: schemas.ClinicalEncounterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_doctor(current_user)

    existing = crud.get_clinical_encounter(
        db=db,
        encounter_id=encounter_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found.",
        )

    if existing.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify this clinical encounter.",
        )

    _require_active_patient_assignment(
        db=db,
        patient_id=existing.patient_id,
        current_user=current_user,
    )

    try:
        return crud.update_clinical_encounter(
            db=db,
            encounter_id=encounter_id,
            encounter=encounter,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# COMPLETE CLINICAL ENCOUNTER
# =====================================================

@router.post(
    "/{encounter_id}/complete",
    response_model=schemas.ClinicalEncounterResponse,
)
def complete_clinical_encounter(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_doctor(current_user)

    existing = crud.get_clinical_encounter(
        db=db,
        encounter_id=encounter_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found.",
        )

    if existing.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to complete this clinical encounter.",
        )

    _require_active_patient_assignment(
        db=db,
        patient_id=existing.patient_id,
        current_user=current_user,
    )

    try:
        return crud.complete_clinical_encounter(
            db=db,
            encounter_id=encounter_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# CANCEL CLINICAL ENCOUNTER
# =====================================================

@router.post(
    "/{encounter_id}/cancel",
    response_model=schemas.ClinicalEncounterResponse,
)
def cancel_clinical_encounter(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_doctor(current_user)

    existing = crud.get_clinical_encounter(
        db=db,
        encounter_id=encounter_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found.",
        )

    if existing.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to cancel this clinical encounter.",
        )

    _require_active_patient_assignment(
        db=db,
        patient_id=existing.patient_id,
        current_user=current_user,
    )

    try:
        return crud.cancel_clinical_encounter(
            db=db,
            encounter_id=encounter_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
