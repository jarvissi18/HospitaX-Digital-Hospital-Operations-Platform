from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth.dependencies import get_current_user
from app.database import get_db


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/discharges",
    tags=["Discharges"],
)


# ============================================================
# ROLE DEFINITIONS
# ============================================================

DISCHARGE_VIEW_ROLES = {
    "Administrator",
    "Doctor",
    "Nurse",
}


# ============================================================
# AUTH HELPERS
# ============================================================


def active_user_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Allow only active authenticated users.
    """

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Inactive users cannot access "
                "Discharge services."
            ),
        )

    return current_user


def discharge_view_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Administrator, Doctor and Nurse can view
    discharge information.
    """

    if current_user.role not in DISCHARGE_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Discharge access is available only "
                "to Administrator, Doctor and Nurse users."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Inactive users cannot access "
                "Discharge services."
            ),
        )

    return current_user


def doctor_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Only active Doctors can create and manage
    discharge records.
    """

    if current_user.role != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required.",
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Inactive Doctors cannot manage "
                "discharges."
            ),
        )

    return current_user


# ============================================================
# CREATE DISCHARGE
# ============================================================


@router.post(
    "",
    response_model=schemas.DischargeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discharge(
    discharge: schemas.DischargeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        doctor_required
    ),
):
    try:
        return crud.create_discharge(
            db=db,
            discharge=discharge,
            discharged_by_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# GET SINGLE DISCHARGE
# ============================================================


@router.get(
    "/{discharge_id}",
    response_model=schemas.DischargeResponse,
)
def get_discharge(
    discharge_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        discharge_view_required
    ),
):
    discharge = crud.get_discharge(
        db,
        discharge_id,
    )

    if discharge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discharge not found.",
        )

    return discharge


# ============================================================
# GET PATIENT DISCHARGES
# ============================================================


@router.get(
    "/patient/{patient_id}",
    response_model=List[
        schemas.DischargeResponse
    ],
)
def get_patient_discharges(
    patient_id: int,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        discharge_view_required
    ),
):
    try:
        return crud.get_discharges(
            db=db,
            patient_id=patient_id,
            status=status_filter,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# GET ENCOUNTER DISCHARGES
# ============================================================


@router.get(
    "/encounter/{encounter_id}",
    response_model=List[
        schemas.DischargeResponse
    ],
)
def get_encounter_discharges(
    encounter_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        discharge_view_required
    ),
):
    return crud.get_discharges_for_encounter(
        db,
        encounter_id,
    )


# ============================================================
# GET ALL DISCHARGES
# ============================================================


@router.get(
    "",
    response_model=List[
        schemas.DischargeResponse
    ],
)
def get_all_discharges(
    status_filter: Optional[str] = None,
    patient_id: Optional[int] = None,
    encounter_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        discharge_view_required
    ),
):
    try:
        return crud.get_discharges(
            db=db,
            patient_id=patient_id,
            encounter_id=encounter_id,
            status=status_filter,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# UPDATE DISCHARGE
# ============================================================


@router.put(
    "/{discharge_id}",
    response_model=schemas.DischargeResponse,
)
def update_discharge(
    discharge_id: int,
    discharge: schemas.DischargeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        doctor_required
    ),
):
    try:
        updated = crud.update_discharge(
            db=db,
            discharge_id=discharge_id,
            discharge=discharge,
            discharged_by_id=current_user.id,
        )

        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discharge not found.",
            )

        return updated

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# UPDATE DISCHARGE STATUS
# ============================================================


@router.patch(
    "/{discharge_id}/status",
    response_model=schemas.DischargeResponse,
)
def update_discharge_status(
    discharge_id: int,
    status_update: schemas.DischargeStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        doctor_required
    ),
):
    try:
        updated = crud.update_discharge_status(
            db=db,
            discharge_id=discharge_id,
            status_update=status_update,
            discharged_by_id=current_user.id,
        )

        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discharge not found.",
            )

        return updated

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc