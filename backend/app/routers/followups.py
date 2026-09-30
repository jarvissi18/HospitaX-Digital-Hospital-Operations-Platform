from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import User


router = APIRouter(
    prefix="/followups",
    tags=["Follow-ups"],
)


# =====================================================
# ROLE HELPERS
# =====================================================

FOLLOW_UP_VIEW_ROLES = {
    "Administrator",
    "Doctor",
    "Nurse",
}


def active_user_required(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot access follow-up operations.",
        )

    return current_user


def follow_up_view_required(
    current_user: User = Depends(active_user_required),
) -> User:
    if current_user.role not in FOLLOW_UP_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view follow-ups.",
        )

    return current_user


def doctor_required(
    current_user: User = Depends(active_user_required),
) -> User:
    if current_user.role != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Doctors can perform this follow-up operation.",
        )

    return current_user


# =====================================================
# CREATE FOLLOW-UP
# =====================================================

@router.post(
    "",
    response_model=schemas.FollowUpResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_follow_up(
    payload: schemas.FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(doctor_required),
):
    try:
        return crud.create_follow_up(
        db,
        payload,
        current_user.id,
    )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# GET SINGLE FOLLOW-UP
# =====================================================

@router.get(
    "/{follow_up_id}",
    response_model=schemas.FollowUpResponse,
)
def get_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(follow_up_view_required),
):
    follow_up = crud.get_follow_up(
        db=db,
        follow_up_id=follow_up_id,
    )

    if not follow_up:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found.",
        )

    return follow_up


# =====================================================
# GET FOLLOW-UPS FOR PATIENT
# =====================================================

@router.get(
    "/patient/{patient_id}",
    response_model=List[schemas.FollowUpResponse],
)
def get_patient_follow_ups(
    patient_id: int,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(follow_up_view_required),
):
    try:
        return crud.get_follow_ups(
            db=db,
            patient_id=patient_id,
            status=status_filter,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# GET FOLLOW-UPS FOR ENCOUNTER
# =====================================================

@router.get(
    "/encounter/{encounter_id}",
    response_model=List[schemas.FollowUpResponse],
)
def get_encounter_follow_ups(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(follow_up_view_required),
):
    try:
        return crud.get_follow_ups(
            db=db,
            encounter_id=encounter_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# LIST FOLLOW-UPS
# =====================================================

@router.get(
    "",
    response_model=List[schemas.FollowUpResponse],
)
def list_follow_ups(
    patient_id: Optional[int] = None,
    encounter_id: Optional[int] = None,
    discharge_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(follow_up_view_required),
):
    try:
        return crud.get_follow_ups(
            db=db,
            patient_id=patient_id,
            encounter_id=encounter_id,
            discharge_id=discharge_id,
            doctor_id=doctor_id,
            status=status_filter,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# UPDATE FOLLOW-UP
# =====================================================

@router.put(
    "/{follow_up_id}",
    response_model=schemas.FollowUpResponse,
)
def update_follow_up(
    follow_up_id: int,
    payload: schemas.FollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(doctor_required),
):
    try:
        follow_up = crud.update_follow_up(
            db=db,
            follow_up_id=follow_up_id,
            payload=payload,
            current_user=current_user,
        )

        if not follow_up:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Follow-up not found.",
            )

        return follow_up

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# =====================================================
# UPDATE FOLLOW-UP STATUS
# =====================================================

@router.patch(
    "/{follow_up_id}/status",
    response_model=schemas.FollowUpResponse,
)
def update_follow_up_status(
    follow_up_id: int,
    payload: schemas.FollowUpStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(doctor_required),
):
    try:
        follow_up = crud.update_follow_up_status(
        db,
        follow_up_id,
        payload,
        current_user.id,
    )

        if not follow_up:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Follow-up not found.",
            )

        return follow_up

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )