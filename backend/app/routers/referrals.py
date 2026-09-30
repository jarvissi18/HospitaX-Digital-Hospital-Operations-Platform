from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth.dependencies import get_current_user
from app.database import get_db


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/referrals",
    tags=["Referrals"],
)


# ============================================================
# ROLE HELPERS
# ============================================================

REFERRAL_VIEW_ROLES = {
    "Administrator",
    "Doctor",
    "Nurse",
}


def active_user_required(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot access Referral services.",
        )

    return current_user


def referral_view_required(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in REFERRAL_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Referral access is available only to "
                "Administrator, Doctor and Nurse users."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot access Referral services.",
        )

    return current_user


def doctor_required(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required.",
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive Doctors cannot manage referrals.",
        )

    return current_user


# ============================================================
# CREATE
# ============================================================

@router.post(
    "",
    response_model=schemas.ReferralResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_referral(
    referral: schemas.ReferralCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    try:
        return crud.create_referral(
            db,
            referral,
            referring_doctor_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# READ
# ============================================================

@router.get(
    "/patient/{patient_id}",
    response_model=List[schemas.ReferralResponse],
)
def get_patient_referrals(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(referral_view_required),
):
    return crud.get_referrals_for_patient(
        db,
        patient_id,
    )


@router.get(
    "/encounter/{encounter_id}",
    response_model=List[schemas.ReferralResponse],
)
def get_encounter_referrals(
    encounter_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(referral_view_required),
):
    return crud.get_referrals_for_encounter(
        db,
        encounter_id,
    )


@router.get(
    "/my",
    response_model=List[schemas.ReferralResponse],
)
def get_my_referrals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    return crud.get_referrals_for_doctor(
        db,
        current_user.id,
    )


@router.get(
    "/{referral_id}",
    response_model=schemas.ReferralResponse,
)
def get_referral(
    referral_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(referral_view_required),
):
    referral = crud.get_referral(db, referral_id)

    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found.",
        )

    return referral


# ============================================================
# UPDATE
# ============================================================

@router.put(
    "/{referral_id}",
    response_model=schemas.ReferralResponse,
)
def update_referral(
    referral_id: int,
    referral_update: schemas.ReferralUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    try:
        referral = crud.update_referral(
            db,
            referral_id,
            referral_update,
            referring_doctor_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found.",
        )

    return referral


# ============================================================
# LIFECYCLE
# ============================================================

@router.post(
    "/{referral_id}/accept",
    response_model=schemas.ReferralResponse,
)
def accept_referral(
    referral_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    try:
        referral = crud.accept_referral(
            db,
            referral_id,
            receiving_doctor_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found.",
        )

    return referral


@router.post(
    "/{referral_id}/start",
    response_model=schemas.ReferralResponse,
)
def start_referral(
    referral_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    try:
        referral = crud.start_referral(
            db,
            referral_id,
            receiving_doctor_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found.",
        )

    return referral


@router.post(
    "/{referral_id}/complete",
    response_model=schemas.ReferralResponse,
)
def complete_referral(
    referral_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    try:
        referral = crud.complete_referral(
            db,
            referral_id,
            receiving_doctor_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found.",
        )

    return referral


@router.post(
    "/{referral_id}/reject",
    response_model=schemas.ReferralResponse,
)
def reject_referral(
    referral_id: int,
    payload: schemas.ReferralStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    if payload.status != "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only accepts REJECTED status.",
        )

    try:
        referral = crud.reject_referral(
            db,
            referral_id,
            receiving_doctor_id=current_user.id,
            notes=payload.notes,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found.",
        )

    return referral


@router.post(
    "/{referral_id}/cancel",
    response_model=schemas.ReferralResponse,
)
def cancel_referral(
    referral_id: int,
    payload: schemas.ReferralStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    if payload.status != "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only accepts CANCELLED status.",
        )

    try:
        referral = crud.cancel_referral(
            db,
            referral_id,
            referring_doctor_id=current_user.id,
            notes=payload.notes,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found.",
        )

    return referral
