from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import crud, schemas, models
from app.auth.dependencies import get_current_user


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
)


# =====================================================
# ROLE DEFINITIONS
# =====================================================

PATIENT_ASSIGNMENT_ROLES = {
    "Administrator",
    "Receptionist",
}

PATIENT_MANAGEMENT_ROLES = {
    "Administrator",
    "Receptionist",
}

PATIENT_VIEW_ALL_ROLES = {
    "Administrator",
    "Receptionist",
}


# =====================================================
# AUTHORIZATION
# =====================================================

def patient_assignment_access(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Allow only authorized hospital staff to perform
    patient allocation and assignment operations.

    Administrator:
        Full assignment access.

    Receptionist:
        Basic patient allocation access.

    Doctor / Nurse / Housekeeper:
        Assignment management is not allowed through
        these endpoints at this stage.
    """

    if current_user.role not in PATIENT_ASSIGNMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not authorized to manage "
                "patient assignments."
            ),
        )

    return current_user


# =====================================================
# PATIENT ACCESS
# =====================================================

def patient_management_access(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Allow only Administrator and Receptionist users to
    create, update, or delete patient records.
    """

    if current_user.role not in PATIENT_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not authorized to manage "
                "patient records."
            ),
        )

    return current_user


def get_patient_for_user(
    patient_id: int,
    db: Session,
    current_user: models.User,
):
    """
    Return a patient only when the authenticated user is
    allowed to view that patient.

    Administrator / Receptionist:
        Can view all patients.

    Doctor:
        Can view patients with an ACTIVE assignment to
        the authenticated doctor.

    Nurse:
        Can view patients with an ACTIVE assignment to
        the authenticated nurse.

    Housekeeper:
        Cannot access patient records.
    """

    patient = crud.get_patient(
        db,
        patient_id,
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    if current_user.role in PATIENT_VIEW_ALL_ROLES:
        return patient

    if current_user.role == "Doctor":
        assignment = (
            db.query(models.PatientAssignment)
            .filter(
                models.PatientAssignment.patient_id
                == patient_id,
                models.PatientAssignment.doctor_id
                == current_user.id,
                models.PatientAssignment.status
                == "Active",
            )
            .first()
        )

        if assignment:
            return patient

    if current_user.role == "Nurse":
        assignment = (
            db.query(models.PatientAssignment)
            .filter(
                models.PatientAssignment.patient_id
                == patient_id,
                models.PatientAssignment.nurse_id
                == current_user.id,
                models.PatientAssignment.status
                == "Active",
            )
            .first()
        )

        if assignment:
            return patient

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Patient not found.",
    )


# =====================================================
# PATIENT CRUD
# =====================================================

@router.post(
    "/",
    response_model=schemas.PatientResponse,
)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        patient_management_access
    ),
):
    return crud.create_patient(
        db,
        patient,
    )


@router.get(
    "/",
    response_model=List[schemas.PatientResponse],
)
def get_patients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    return crud.get_patients(
        db,
        current_user=current_user,
    )


@router.put(
    "/{patient_id}",
    response_model=schemas.PatientResponse,
)
def update_patient(
    patient_id: int,
    patient: schemas.PatientUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        patient_management_access
    ),
):
    updated = crud.update_patient(
        db,
        patient_id,
        patient,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    return updated


@router.delete(
    "/{patient_id}",
)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        patient_management_access
    ),
):
    deleted = crud.delete_patient(
        db,
        patient_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    return {
        "message": "Patient deleted successfully",
    }


# =====================================================
# CREATE PATIENT ASSIGNMENT
# =====================================================

@router.post(
    "/{patient_id}/assignments",
    response_model=schemas.PatientAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_patient_assignment(
    patient_id: int,
    assignment: schemas.PatientAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        patient_assignment_access
    ),
):
    """
    Create a patient allocation / assignment.

    The authenticated user is taken from the JWT
    and stored as assigned_by.
    """

    # -------------------------------------------------
    # URL / BODY PATIENT VALIDATION
    # -------------------------------------------------

    if assignment.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Patient ID in request body does not "
                "match the patient ID in the URL."
            ),
        )

    # -------------------------------------------------
    # PATIENT EXISTENCE VALIDATION
    # -------------------------------------------------

    patient = crud.get_patient(
        db,
        patient_id,
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    # -------------------------------------------------
    # CREATE ASSIGNMENT
    # -------------------------------------------------

    result = crud.create_patient_assignment(
        db,
        assignment,
        assigned_by=current_user.id,
    )

    # -------------------------------------------------
    # KNOWN VALIDATION RESULTS
    # -------------------------------------------------

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

    if result == "department_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected department is inactive.",
        )

    if result == "doctor_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found.",
        )

    if result == "doctor_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected doctor is inactive.",
        )

    if result == "doctor_not_available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected doctor is currently unavailable.",
        )

    if result == "nurse_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nurse not found.",
        )

    if result == "nurse_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected nurse is inactive.",
        )

    if result == "nurse_not_available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected nurse is currently unavailable.",
        )

    if result == "ward_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ward not found.",
        )

    if result == "ward_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected ward is inactive.",
        )

    if result == "bed_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bed not found.",
        )

    if result == "bed_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected bed is inactive.",
        )

    if result == "bed_not_available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected bed is not available.",
        )

    if result == "bed_not_in_selected_ward":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected bed does not belong to the selected ward.",
        )

    if result == "bed_already_assigned":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected bed is already assigned to another patient.",
        )

    if result == "ward_required_for_bed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ward must be selected when assigning a bed.",
        )

    if result == "invalid_staff_role":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected staff member has an invalid role.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate patient assignment.",
        )

    return result

# =====================================================
# GET PATIENT ASSIGNMENT HISTORY
# =====================================================

@router.get(
    "/{patient_id}/assignments",
    response_model=List[
        schemas.PatientAssignmentResponse
    ],
)
def get_patient_assignments(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Return the assignment history for a patient.

    Any authenticated active user can view the patient's
    assignment history.
    """

    get_patient_for_user(
        patient_id,
        db,
        current_user,
    )

    return crud.get_patient_assignments(
        db,
        patient_id,
    )


# =====================================================
# GET ACTIVE PATIENT ASSIGNMENT
# =====================================================

@router.get(
    "/{patient_id}/assignments/active",
    response_model=schemas.PatientAssignmentResponse,
)
def get_active_patient_assignment(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Return the currently active assignment for a patient.
    """

    get_patient_for_user(
        patient_id,
        db,
        current_user,
    )

    assignment = crud.get_active_patient_assignment(
        db,
        patient_id,
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active assignment found for this patient.",
        )

    return assignment


# =====================================================
# UPDATE PATIENT ASSIGNMENT
# =====================================================

@router.put(
    "/{patient_id}/assignments/{assignment_id}",
    response_model=schemas.PatientAssignmentResponse,
)
def update_patient_assignment(
    patient_id: int,
    assignment_id: int,
    assignment: schemas.PatientAssignmentUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        patient_assignment_access
    ),
):
    """
    Update an existing patient assignment.
    """

    patient = crud.get_patient(
        db,
        patient_id,
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    existing = crud.get_patient_assignment(
        db,
        assignment_id,
    )

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient assignment not found.",
        )

    if existing.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment does not belong to this patient.",
        )

    updated = crud.update_patient_assignment(
        db,
        assignment_id,
        assignment,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient assignment not found.",
        )

    # -------------------------------------------------
    # KNOWN VALIDATION RESULTS
    # -------------------------------------------------

    if isinstance(updated, str):

        if updated == "department_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found.",
            )

        if updated == "department_inactive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected department is inactive.",
            )

        if updated == "doctor_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found.",
            )

        if updated == "doctor_inactive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected doctor is inactive.",
            )

        if updated == "doctor_unavailable":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected doctor is currently unavailable.",
            )

        if updated == "nurse_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nurse not found.",
            )

        if updated == "nurse_inactive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected nurse is inactive.",
            )

        if updated == "nurse_unavailable":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected nurse is currently unavailable.",
            )

        if updated == "ward_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ward not found.",
            )

        if updated == "ward_inactive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected ward is inactive.",
            )

        if updated == "bed_not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bed not found.",
            )

        if updated == "bed_inactive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected bed is inactive.",
            )

        if updated == "bed_unavailable":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected bed is not available.",
            )

        if updated == "bed_ward_mismatch":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected bed does not belong to the selected ward.",
            )

        if updated == "bed_already_assigned":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Selected bed is already assigned to another patient.",
            )

        if updated == "ward_required_for_bed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ward must be selected when assigning a bed.",
            )

        if updated == "invalid_staff_role":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected staff member has an invalid role.",
            )

    return updated


# =====================================================
# RELEASE PATIENT ASSIGNMENT
# =====================================================

@router.post(
    "/{patient_id}/assignments/{assignment_id}/release",
    response_model=schemas.PatientAssignmentResponse,
)
def release_patient_assignment(
    patient_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        patient_assignment_access
    ),
):
    """
    Release an active patient assignment.

    If a bed is associated with the assignment,
    the CRUD layer releases the bed back to Available.
    """

    patient = crud.get_patient(
        db,
        patient_id,
    )

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    existing = crud.get_patient_assignment(
        db,
        assignment_id,
    )

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient assignment not found.",
        )

    if existing.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment does not belong to this patient.",
        )

    released = crud.release_patient_assignment(
        db,
        assignment_id,
    )

    if not released:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient assignment not found.",
        )

    return released