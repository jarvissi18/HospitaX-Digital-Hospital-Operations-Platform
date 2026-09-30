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
    prefix="/patient-queue",
    tags=["Patient Queue & Triage"],
)


# ============================================================
# ROLE DEFINITIONS
# ============================================================

QUEUE_VIEW_ROLES = {
    "Administrator",
    "Receptionist",
    "Doctor",
    "Nurse",
}

QUEUE_MANAGE_ROLES = {
    "Administrator",
    "Receptionist",
}

TRIAGE_ROLE = "Nurse"


# ============================================================
# COMMON USER CHECK
# ============================================================

def active_user_required(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot access patient queue.",
        )

    return current_user


# ============================================================
# QUEUE VIEW ACCESS
# ============================================================

def queue_view_required(
    current_user: models.User = Depends(
        active_user_required
    ),
):
    if current_user.role not in QUEUE_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Patient queue access is available only "
                "to Administrator, Receptionist, Doctor, "
                "and Nurse users."
            ),
        )

    return current_user


# ============================================================
# QUEUE MANAGEMENT ACCESS
# ============================================================

def queue_manage_required(
    current_user: models.User = Depends(
        active_user_required
    ),
):
    if current_user.role not in QUEUE_MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Administrator and Receptionist users "
                "can manage the patient queue."
            ),
        )

    return current_user


# ============================================================
# TRIAGE ACCESS
# ============================================================

def triage_required(
    current_user: models.User = Depends(
        active_user_required
    ),
):
    if current_user.role != TRIAGE_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Nurse users can perform triage.",
        )

    return current_user


# ============================================================
# GET ALL QUEUE
# ============================================================

@router.get(
    "",
    response_model=List[
        schemas.PatientQueueResponse
    ],
)
def get_patient_queue(
    department_id: Optional[int] = None,
    queue_status: Optional[str] = None,
    triage_status: Optional[str] = None,
    triage_priority: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_view_required),
):
    try:
        return crud.get_patient_queues(
            db,
            department_id=department_id,
            status=queue_status,
            triage_status=triage_status,
            triage_priority=triage_priority,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# GET QUEUE BY APPOINTMENT
# IMPORTANT:
# This route must be before /{queue_id}
# ============================================================

@router.get(
    "/appointment/{appointment_id}",
    response_model=schemas.PatientQueueResponse,
)
def get_queue_by_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_view_required),
):
    queue = crud.get_patient_queue_by_appointment(
        db,
        appointment_id,
    )

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient queue entry not found.",
        )

    return queue


# ============================================================
# GET PATIENT QUEUE HISTORY
# ============================================================

@router.get(
    "/patient/{patient_id}",
    response_model=List[
        schemas.PatientQueueResponse
    ],
)
def get_patient_queue_history(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_view_required),
):
    return crud.get_patient_queues_for_patient(
        db,
        patient_id,
    )


# ============================================================
# GET SINGLE QUEUE ENTRY
# ============================================================

@router.get(
    "/{queue_id}",
    response_model=schemas.PatientQueueResponse,
)
def get_single_patient_queue(
    queue_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_view_required),
):
    queue = crud.get_patient_queue(
        db,
        queue_id,
    )

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient queue entry not found.",
        )

    return queue


# ============================================================
# CREATE QUEUE ENTRY
# Administrator / Receptionist
#
# Expected appointment state:
# Checked-in
# ============================================================

@router.post(
    "",
    response_model=schemas.PatientQueueResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_patient_queue(
    queue: schemas.PatientQueueCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_manage_required),
):
    try:
        result = crud.create_patient_queue(
            db,
            queue,
        )

        if result == "appointment_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found.",
            )

        if result == "patient_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found.",
            )

        if result == "department_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found.",
            )

        if result == "invalid_appointment_status":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Only checked-in appointments "
                    "can be added to the patient queue."
                ),
            )

        if result == "duplicate":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This appointment is already in the patient queue.",
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to create patient queue entry.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# UPDATE QUEUE DATA
#
# Administrative update for:
# - triage priority
# - triage status
# - triage notes
#
# Lifecycle transitions must use dedicated endpoints.
# ============================================================

@router.put(
    "/{queue_id}",
    response_model=schemas.PatientQueueResponse,
)
def update_patient_queue(
    queue_id: int,
    queue_update: schemas.PatientQueueUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_manage_required),
):
    try:
        result = crud.update_patient_queue(
            db,
            queue_id,
            queue_update,
        )

        if result == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient queue entry not found.",
            )

        if result == "terminal":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Completed, Cancelled, and No-show "
                    "queue entries cannot be modified."
                ),
            )

        if result == "invalid_status_transition":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Queue lifecycle status cannot be changed "
                    "through this endpoint."
                ),
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to update patient queue.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# CALL PATIENT
#
# Waiting -> Called
# ============================================================

@router.post(
    "/{queue_id}/call",
    response_model=schemas.PatientQueueResponse,
)
def call_patient(
    queue_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_manage_required),
):
    try:
        result = crud.call_patient_queue(
            db,
            queue_id,
        )

        if result == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient queue entry not found.",
            )

        if result == "invalid_status":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only waiting patients can be called.",
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to call patient.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# START TRIAGE
#
# Called -> In Triage
# Nurse only
# ============================================================

@router.post(
    "/{queue_id}/triage/start",
    response_model=schemas.PatientQueueResponse,
)
def start_patient_triage(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(triage_required),
):
    try:
        result = crud.start_patient_triage(
            db,
            queue_id,
            current_user.id,
        )

        if result == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient queue entry not found.",
            )

        if result == "invalid_status":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only called patients can enter triage.",
            )

        if result == "nurse_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nurse account not found.",
            )

        if result == "nurse_inactive":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive nurse cannot perform triage.",
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to start triage.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# COMPLETE TRIAGE
#
# In Triage -> Ready
# Nurse only
# ============================================================

@router.post(
    "/{queue_id}/triage/complete",
    response_model=schemas.PatientQueueResponse,
)
def complete_patient_triage(
    queue_id: int,
    triage: schemas.PatientQueueUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(triage_required),
):
    try:
        result = crud.complete_patient_triage(
            db,
            queue_id,
            current_user.id,
            triage.triage_priority,
            triage.triage_notes,
        )

        if result == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient queue entry not found.",
            )

        if result == "invalid_status":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only patients currently in triage can be completed.",
            )

        if result == "nurse_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nurse account not found.",
            )

        if result == "not_owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only complete triage assigned to you.",
            )

        if result == "invalid_priority":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid triage priority.",
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to complete triage.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# MARK READY
#
# In Triage -> Ready
#
# Administrative fallback endpoint.
# ============================================================

@router.post(
    "/{queue_id}/ready",
    response_model=schemas.PatientQueueResponse,
)
def mark_patient_ready(
    queue_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_manage_required),
):
    try:
        result = crud.mark_patient_queue_ready(
            db,
            queue_id,
        )

        if result == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient queue entry not found.",
            )

        if result == "invalid_status":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient is not currently in triage.",
            )

        if result == "triage_pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Triage must be completed before the patient is ready.",
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to mark patient as ready.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# COMPLETE QUEUE
#
# Ready -> Completed
# ============================================================

@router.post(
    "/{queue_id}/complete",
    response_model=schemas.PatientQueueResponse,
)
def complete_patient_queue(
    queue_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_manage_required),
):
    try:
        result = crud.complete_patient_queue(
            db,
            queue_id,
        )

        if result == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient queue entry not found.",
            )

        if result == "invalid_status":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only ready patients can be completed.",
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to complete patient queue entry.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# CANCEL QUEUE
# ============================================================

@router.post(
    "/{queue_id}/cancel",
    response_model=schemas.PatientQueueResponse,
)
def cancel_patient_queue(
    queue_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_manage_required),
):
    try:
        result = crud.cancel_patient_queue(
            db,
            queue_id,
        )

        if result == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient queue entry not found.",
            )

        if result == "terminal":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This queue entry is already closed.",
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to cancel patient queue entry.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ============================================================
# NO-SHOW
#
# Waiting / Called -> No-show
# ============================================================

@router.post(
    "/{queue_id}/no-show",
    response_model=schemas.PatientQueueResponse,
)
def mark_patient_no_show(
    queue_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(queue_manage_required),
):
    try:
        result = crud.mark_patient_queue_no_show(
            db,
            queue_id,
        )

        if result == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient queue entry not found.",
            )

        if result == "invalid_status":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Only waiting or called patients "
                    "can be marked as no-show."
                ),
            )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to mark patient as no-show.",
            )

        return result

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error