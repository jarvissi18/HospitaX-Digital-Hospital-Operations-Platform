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


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"],
)


# =====================================================
# ROLE DEFINITIONS
# =====================================================

APPOINTMENT_MANAGE_ROLES = {
    "Administrator",
    "Receptionist",
}

APPOINTMENT_VIEW_ROLES = {
    "Administrator",
    "Receptionist",
    "Doctor",
}


# =====================================================
# AUTHORIZATION HELPERS
# =====================================================

def require_active_user(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot access appointments.",
        )

    return current_user


def require_appointment_manager(
    current_user: models.User = Depends(
        require_active_user
    ),
):
    if current_user.role not in APPOINTMENT_MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Administrator and Receptionist "
                "users can manage appointments."
            ),
        )

    return current_user


def require_appointment_viewer(
    current_user: models.User = Depends(
        require_active_user
    ),
):
    if current_user.role not in APPOINTMENT_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Appointment access is available only "
                "to Administrator, Receptionist, and Doctor users."
            ),
        )

    return current_user


# =====================================================
# ERROR HELPERS
# =====================================================

def _handle_crud_error(
    error: ValueError,
):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(error),
    )


def _handle_duplicate_result(
    result,
):
    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The appointment could not be saved because "
                "of a database conflict."
            ),
        )

    return result


# =====================================================
# GET ALL APPOINTMENTS
# =====================================================

@router.get(
    "",
    response_model=List[
        schemas.AppointmentResponse
    ],
)
def get_all_appointments(
    patient_id: Optional[int] = None,
    department_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_appointment_viewer
    ),
):
    """
    Administrator and Receptionist can view filtered
    appointment records.

    Doctor access is restricted to the authenticated
    doctor's own appointments.
    """

    if current_user.role == "Doctor":
        if (
            doctor_id is not None
            and doctor_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Doctors can only view their own appointments."
                ),
            )

        doctor_id = current_user.id

    return crud.get_appointments(
        db,
        patient_id=patient_id,
        department_id=department_id,
        doctor_id=doctor_id,
        status=status,
    )


# =====================================================
# GET MY APPOINTMENTS
# =====================================================

@router.get(
    "/my",
    response_model=List[
        schemas.AppointmentResponse
    ],
)
def get_my_appointments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_active_user
    ),
):
    """
    Returns appointments assigned to the authenticated
    Doctor.
    """

    if current_user.role != "Doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This endpoint is available only "
                "to Doctor users."
            ),
        )

    return crud.get_appointments_for_doctor(
        db,
        current_user.id,
    )


# =====================================================
# GET PATIENT APPOINTMENT HISTORY
# =====================================================

@router.get(
    "/patient/{patient_id}",
    response_model=List[
        schemas.AppointmentResponse
    ],
)
def get_patient_appointments(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_appointment_viewer
    ),
):
    try:
        return crud.get_appointments_for_patient(
            db,
            patient_id,
        )
    except ValueError as error:
        _handle_crud_error(error)


# =====================================================
# GET SINGLE APPOINTMENT
# =====================================================

@router.get(
    "/{appointment_id}",
    response_model=schemas.AppointmentResponse,
)
def get_single_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_appointment_viewer
    ),
):
    appointment = crud.get_appointment(
        db,
        appointment_id,
    )

    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found.",
        )

    if (
        current_user.role == "Doctor"
        and appointment.doctor_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Doctors can only view their own appointments."
            ),
        )

    return appointment


# =====================================================
# CREATE APPOINTMENT
# =====================================================

@router.post(
    "",
    response_model=schemas.AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_appointment(
    appointment: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_appointment_manager
    ),
):
    try:
        result = crud.create_appointment(
            db,
            appointment,
            created_by=current_user.id,
        )

        return _handle_duplicate_result(result)

    except ValueError as error:
        _handle_crud_error(error)


# =====================================================
# UPDATE APPOINTMENT
# =====================================================

@router.put(
    "/{appointment_id}",
    response_model=schemas.AppointmentResponse,
)
def update_existing_appointment(
    appointment_id: int,
    appointment: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_appointment_manager
    ),
):
    try:
        result = crud.update_appointment(
            db,
            appointment_id,
            appointment,
        )

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found.",
            )

        return _handle_duplicate_result(result)

    except ValueError as error:
        _handle_crud_error(error)


# =====================================================
# CHECK-IN APPOINTMENT
# =====================================================

@router.post(
    "/{appointment_id}/check-in",
    response_model=schemas.AppointmentResponse,
)
def check_in_existing_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_appointment_manager
    ),
):
    try:
        result = crud.check_in_appointment(
            db,
            appointment_id,
        )

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found.",
            )

        return _handle_duplicate_result(result)

    except ValueError as error:
        _handle_crud_error(error)


# =====================================================
# MOVE APPOINTMENT TO QUEUE
# =====================================================

@router.post(
    "/{appointment_id}/queue",
    response_model=schemas.AppointmentResponse,
)
def queue_existing_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_appointment_manager
    ),
):
    try:
        result = crud.move_appointment_to_queue(
            db,
            appointment_id,
        )

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found.",
            )

        return _handle_duplicate_result(result)

    except ValueError as error:
        _handle_crud_error(error)


# =====================================================
# COMPLETE APPOINTMENT
# =====================================================

@router.post(
    "/{appointment_id}/complete",
    response_model=schemas.AppointmentResponse,
)
def complete_existing_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_appointment_manager
    ),
):
    try:
        result = crud.complete_appointment(
            db,
            appointment_id,
        )

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found.",
            )

        return _handle_duplicate_result(result)

    except ValueError as error:
        _handle_crud_error(error)


# =====================================================
# CANCEL APPOINTMENT
# =====================================================

@router.post(
    "/{appointment_id}/cancel",
    response_model=schemas.AppointmentResponse,
)
def cancel_existing_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_appointment_manager
    ),
):
    try:
        result = crud.cancel_appointment(
            db,
            appointment_id,
        )

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found.",
            )

        return _handle_duplicate_result(result)

    except ValueError as error:
        _handle_crud_error(error)


# =====================================================
# MARK NO-SHOW
# =====================================================

@router.post(
    "/{appointment_id}/no-show",
    response_model=schemas.AppointmentResponse,
)
def mark_existing_appointment_no_show(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_appointment_manager
    ),
):
    try:
        result = crud.mark_appointment_no_show(
            db,
            appointment_id,
        )

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found.",
            )

        return _handle_duplicate_result(result)

    except ValueError as error:
        _handle_crud_error(error)