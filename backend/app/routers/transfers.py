from typing import List

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
# PATIENT TRANSFER ROUTER
# ============================================================
#
# Controlled intra-hospital patient movement workflow.
#
# REQUESTED
#     ↓
# APPROVED
#     ↓
# IN_PROGRESS
#     ↓
# COMPLETED
#
# REQUESTED → REJECTED
# REQUESTED → CANCELLED
#
# Access model:
#   - Administrator / Doctor / Nurse → view
#   - Doctor → create and request cancellation
#   - Administrator / Doctor → approve or reject
#   - Administrator / Doctor / Nurse → start / complete
#
# ============================================================

router = APIRouter(
    prefix="/transfers",
    tags=["Patient Transfers"],
)


TRANSFER_VIEW_ROLES = {
    "Administrator",
    "Doctor",
    "Nurse",
}

TRANSFER_APPROVAL_ROLES = {
    "Administrator",
    "Doctor",
}

TRANSFER_EXECUTION_ROLES = {
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
            detail="Inactive users cannot access Patient Transfer services.",
        )

    return current_user


def transfer_view_required(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in TRANSFER_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Transfer access is available only to "
                "Administrator, Doctor and Nurse users."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot access Patient Transfer services.",
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
            detail="Inactive Doctors cannot manage Patient Transfers.",
        )

    return current_user


def transfer_approval_required(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in TRANSFER_APPROVAL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Administrator and Doctor users "
                "can approve or reject transfers."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot approve or reject transfers.",
        )

    return current_user


def transfer_execution_required(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in TRANSFER_EXECUTION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Transfer execution is available only to "
                "Administrator, Doctor and Nurse users."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot execute Patient Transfers.",
        )

    return current_user


@router.post(
    "",
    response_model=schemas.TransferResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transfer(
    transfer: schemas.TransferCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    try:
        result = crud.create_patient_transfer(
            db=db,
            transfer=transfer,
            requested_by_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if result == "active_transfer_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active transfer already exists for this patient.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate transfer could not be created.",
        )

    error_map = {
        "patient_not_found": (404, "Patient not found."),
        "encounter_not_found": (404, "Clinical encounter not found."),
        "encounter_patient_mismatch": (
            400,
            "Clinical encounter does not belong to this patient.",
        ),
        "encounter_cancelled": (
            400,
            "Transfers cannot be created for a cancelled encounter.",
        ),
        "destination_department_not_found": (
            404,
            "Destination department not found.",
        ),
        "destination_department_inactive": (
            400,
            "Destination department is inactive.",
        ),
        "destination_ward_not_found": (404, "Destination ward not found."),
        "destination_ward_inactive": (400, "Destination ward is inactive."),
        "destination_ward_not_in_department": (
            400,
            "Destination ward does not belong to the selected department.",
        ),
        "destination_room_not_found": (404, "Destination room not found."),
        "destination_room_inactive": (400, "Destination room is inactive."),
        "destination_room_not_in_ward": (
            400,
            "Destination room does not belong to the selected ward.",
        ),
        "destination_bed_not_found": (404, "Destination bed not found."),
        "destination_bed_inactive": (400, "Destination bed is inactive."),
        "destination_bed_not_in_room": (
            400,
            "Destination bed does not belong to the selected room.",
        ),
        "destination_bed_not_in_ward": (
            400,
            "Destination bed does not belong to the selected ward.",
        ),
        "destination_bed_not_available": (
            409,
            "Destination bed is not available.",
        ),
        "destination_bed_already_assigned": (
            409,
            "Destination bed is already assigned to another active patient.",
        ),
    }

    if isinstance(result, str) and result in error_map:
        code, detail = error_map[result]
        raise HTTPException(status_code=code, detail=detail)

    return result


@router.get(
    "/{transfer_id}",
    response_model=schemas.TransferResponse,
)
def get_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(transfer_view_required),
):
    transfer = crud.get_patient_transfer(db, transfer_id)

    if transfer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient transfer not found.",
        )

    return transfer


@router.get(
    "/patient/{patient_id}",
    response_model=List[schemas.TransferResponse],
)
def get_patient_transfers(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(transfer_view_required),
):
    return crud.get_patient_transfers(db, patient_id)


@router.get(
    "/encounter/{encounter_id}",
    response_model=List[schemas.TransferResponse],
)
def get_encounter_transfers(
    encounter_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(transfer_view_required),
):
    return crud.get_patient_transfers_for_encounter(db, encounter_id)


@router.get(
    "/my",
    response_model=List[schemas.TransferResponse],
)
def get_my_transfers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(transfer_view_required),
):
    return crud.get_patient_transfers_requested_by(db, current_user.id)


@router.put(
    "/{transfer_id}",
    response_model=schemas.TransferResponse,
)
def update_transfer(
    transfer_id: int,
    transfer: schemas.TransferUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    existing = crud.get_patient_transfer(db, transfer_id)

    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient transfer not found.",
        )

    if existing.requested_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the doctor who requested the transfer can edit it.",
        )

    try:
        result = crud.update_patient_transfer(
            db=db,
            transfer_id=transfer_id,
            transfer=transfer,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if result == "transfer_not_editable":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only REQUESTED transfers can be edited.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transfer update conflicts with existing data.",
        )

    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result,
        )

    return result


@router.post(
    "/{transfer_id}/approve",
    response_model=schemas.TransferResponse,
)
def approve_transfer(
    transfer_id: int,
    action: schemas.TransferStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(transfer_approval_required),
):
    if action.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only accepts APPROVED status.",
        )

    result = crud.approve_patient_transfer(
        db=db,
        transfer_id=transfer_id,
        approved_by_id=current_user.id,
        notes=action.notes,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient transfer not found.",
        )

    if result == "invalid_transfer_status":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only REQUESTED transfers can be approved.",
        )

    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result,
        )

    return result


@router.post(
    "/{transfer_id}/start",
    response_model=schemas.TransferResponse,
)
def start_transfer(
    transfer_id: int,
    action: schemas.TransferStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(transfer_execution_required),
):
    if action.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only accepts IN_PROGRESS status.",
        )

    result = crud.start_patient_transfer(
        db=db,
        transfer_id=transfer_id,
        user_id=current_user.id,
        notes=action.notes,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient transfer not found.",
        )

    if result == "invalid_transfer_status":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only APPROVED transfers can be started.",
        )

    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result,
        )

    return result


@router.post(
    "/{transfer_id}/complete",
    response_model=schemas.TransferResponse,
)
def complete_transfer(
    transfer_id: int,
    action: schemas.TransferStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(transfer_execution_required),
):
    if action.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only accepts COMPLETED status.",
        )

    result = crud.complete_patient_transfer(
        db=db,
        transfer_id=transfer_id,
        completed_by_id=current_user.id,
        notes=action.notes,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient transfer not found.",
        )

    if result == "invalid_transfer_status":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only IN_PROGRESS transfers can be completed.",
        )

    conflict_map = {
        "destination_bed_not_available": "The destination bed is no longer available.",
        "destination_bed_already_assigned": "The destination bed is already assigned.",
        "source_department_mismatch": (
            "The transfer source department no longer matches the active patient assignment."
        ),
        "source_ward_mismatch": (
            "The transfer source ward no longer matches the active patient assignment."
        ),
        "source_bed_mismatch": (
            "The transfer source bed no longer matches the active patient assignment."
        ),
    }

    if isinstance(result, str) and result in conflict_map:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=conflict_map[result],
        )

    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result,
        )

    return result


@router.post(
    "/{transfer_id}/reject",
    response_model=schemas.TransferResponse,
)
def reject_transfer(
    transfer_id: int,
    action: schemas.TransferStatusUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(transfer_approval_required),
):
    if action.status != "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only accepts REJECTED status.",
        )

    result = crud.reject_patient_transfer(
        db=db,
        transfer_id=transfer_id,
        notes=action.notes,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient transfer not found.",
        )

    if result == "invalid_transfer_status":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only REQUESTED transfers can be rejected.",
        )

    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result,
        )

    return result


@router.post(
    "/{transfer_id}/cancel",
    response_model=schemas.TransferResponse,
)
def cancel_transfer(
    transfer_id: int,
    action: schemas.TransferStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(doctor_required),
):
    if action.status != "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint only accepts CANCELLED status.",
        )

    existing = crud.get_patient_transfer(db, transfer_id)

    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient transfer not found.",
        )

    if existing.requested_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the doctor who requested the transfer can cancel it.",
        )

    result = crud.cancel_patient_transfer(
        db=db,
        transfer_id=transfer_id,
        requested_by_id=current_user.id,
        notes=action.notes,
    )

    if result == "forbidden":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the requesting doctor can cancel this transfer.",
        )

    if result == "invalid_transfer_status":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only REQUESTED transfers can be cancelled.",
        )

    if isinstance(result, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result,
        )

    return result
