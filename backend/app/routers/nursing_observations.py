from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import User


router = APIRouter(
    prefix="/nursing-observations",
    tags=["Nursing Observations"],
)


# =====================================================
# ROLE VALIDATION
# =====================================================


def _require_nurse(current_user: User):
    if current_user.role != "Nurse":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Nurses can access nursing observations.",
        )

    return current_user


# =====================================================
# CREATE NURSING OBSERVATION
# =====================================================


@router.post(
    "/",
    response_model=schemas.NursingObservationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_nursing_observation(
    observation: schemas.NursingObservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_nurse(current_user)

    try:
        return crud.create_nursing_observation(
            db=db,
            patient_id=observation.patient_id,
            nurse_id=current_user.id,
            observation=observation,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# GET MY NURSING OBSERVATIONS
# =====================================================


@router.get(
    "/my",
    response_model=List[schemas.NursingObservationResponse],
)
def get_my_nursing_observations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_nurse(current_user)

    return crud.get_nursing_observations_for_nurse(
        db=db,
        nurse_id=current_user.id,
    )


# =====================================================
# GET NURSING OBSERVATIONS FOR A PATIENT
# =====================================================


@router.get(
    "/patient/{patient_id}",
    response_model=List[schemas.NursingObservationResponse],
)
def get_patient_nursing_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_nurse(current_user)

    return crud.get_nursing_observations_for_patient(
        db=db,
        patient_id=patient_id,
    )


# =====================================================
# GET SINGLE NURSING OBSERVATION
# =====================================================


@router.get(
    "/{observation_id}",
    response_model=schemas.NursingObservationResponse,
)
def get_nursing_observation(
    observation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_nurse(current_user)

    observation = crud.get_nursing_observation(
        db=db,
        observation_id=observation_id,
    )

    if observation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nursing observation not found.",
        )

    # -------------------------------------------------
    # NURSE OWNERSHIP
    # -------------------------------------------------

    if observation.nurse_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not authorized to access "
                "this nursing observation."
            ),
        )

    return observation


# =====================================================
# UPDATE NURSING OBSERVATION
# =====================================================


@router.put(
    "/{observation_id}",
    response_model=schemas.NursingObservationResponse,
)
def update_nursing_observation(
    observation_id: int,
    observation: schemas.NursingObservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_nurse(current_user)

    existing = crud.get_nursing_observation(
        db=db,
        observation_id=observation_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nursing observation not found.",
        )

    if existing.nurse_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not authorized to modify "
                "this nursing observation."
            ),
        )

    try:
        return crud.update_nursing_observation(
            db=db,
            observation_id=observation_id,
            observation=observation,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )