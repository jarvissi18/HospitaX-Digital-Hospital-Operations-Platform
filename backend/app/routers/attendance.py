from datetime import datetime, timezone
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas, models
from app.auth.dependencies import get_current_user


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)


# =====================================================
# ROLE DEFINITIONS
# =====================================================

ATTENDANCE_ROLES = {
    "Doctor",
    "Nurse",
    "Receptionist",
    "Housekeeper",
}


# =====================================================
# ADMIN CHECK
# =====================================================

def admin_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Attendance management is restricted
    to Administrator users.
    """

    if current_user.role != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )

    return current_user


# =====================================================
# STAFF CHECK
# =====================================================

def staff_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Self-service attendance is available only
    to operational hospital staff.

    Administrator does NOT have attendance.
    """

    if current_user.role not in ATTENDANCE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Attendance is available only for "
                "Doctor, Nurse, Receptionist, "
                "and Housekeeper users."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive staff cannot use attendance.",
        )

    return current_user


# =====================================================
# GET ALL ATTENDANCE
# =====================================================

@router.get(
    "",
    response_model=List[
        schemas.AttendanceResponse
    ],
)
def get_all_attendance(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    return crud.get_all_attendance(db)


# =====================================================
# GET TODAY'S ATTENDANCE
# =====================================================

@router.get(
    "/today",
    response_model=List[
        schemas.AttendanceResponse
    ],
)
def get_today_attendance(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    today = datetime.now(timezone.utc)

    return crud.get_attendance_for_date(
        db,
        today,
    )


# =====================================================
# GET MY ATTENDANCE
# =====================================================

@router.get(
    "/me",
    response_model=schemas.AttendanceResponse,
)
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        staff_required
    ),
):
    """
    Returns the currently authenticated staff member's
    attendance record for today.

    Administrator does NOT have access to this endpoint.
    The user ID is taken from the authenticated JWT.
    No user_id is accepted from the frontend.
    """

    today = datetime.now(timezone.utc)

    attendance = crud.get_attendance_for_user_date(
        db,
        current_user.id,
        today,
    )

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No attendance record found for today.",
        )

    return attendance


# =====================================================
# GET MY ATTENDANCE HISTORY
# =====================================================

@router.get(
    "/me/history",
    response_model=List[
        schemas.AttendanceResponse
    ],
)
def get_my_attendance_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        staff_required
    ),
):
    """
    Returns attendance history for the currently
    authenticated staff member.

    Security:
    - Only operational staff can access this endpoint.
    - The user ID comes from the authenticated JWT.
    - No user_id is accepted from the frontend.
    - A staff member can only see their own attendance.
    """

    return crud.get_attendance_history(
        db,
        user_id=current_user.id,
    )


# =====================================================
# GET ATTENDANCE SUMMARY
# =====================================================

@router.get(
    "/summary",
)
def get_attendance_summary(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    today = datetime.now(timezone.utc)

    return crud.get_attendance_summary(
        db,
        today,
    )


# =====================================================
# GET STAFF AVAILABILITY
# =====================================================

@router.get(
    "/availability",
)
def get_staff_availability(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    today = datetime.now(timezone.utc)

    return crud.get_staff_availability(
        db,
        today,
    )


# =====================================================
# GET AVAILABLE STAFF
# =====================================================

@router.get(
    "/available-staff",
    response_model=List[
        schemas.UserResponse
    ],
)
def get_available_staff(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    today = datetime.now(timezone.utc)

    return crud.get_available_staff(
        db,
        today,
        role,
    )


# =====================================================
# STAFF SELF-SERVICE CHECK-IN
# =====================================================

@router.post(
    "/me/check-in",
    response_model=schemas.AttendanceResponse,
)
def self_check_in(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        staff_required
    ),
):
    """
    Allows the currently authenticated staff member
    to check themselves in.

    No user_id is accepted from the frontend.
    The authenticated user's ID is used automatically.
    """

    today = datetime.now(timezone.utc)

    shift = (
        current_user.shift.strip()
        if current_user.shift
        else "General"
    )

    result = crud.check_in_staff(
        db,
        current_user.id,
        today,
        shift,
        None,
    )

    # -------------------------------------------------
    # USER NOT FOUND
    # -------------------------------------------------

    if result == "user_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found.",
        )

    # -------------------------------------------------
    # USER INACTIVE
    # -------------------------------------------------

    if result == "user_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive staff cannot check in.",
        )

    # -------------------------------------------------
    # INVALID STAFF ROLE
    # -------------------------------------------------

    if result == "invalid_staff_role":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Attendance can only be recorded "
                "for Doctor, Nurse, Receptionist, "
                "or Housekeeper."
            ),
        )

    # -------------------------------------------------
    # ALREADY CHECKED IN
    # -------------------------------------------------

    if result == "already_checked_in":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already checked in.",
        )

    # -------------------------------------------------
    # DUPLICATE
    # -------------------------------------------------

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance record already exists.",
        )

    return result


# =====================================================
# STAFF SELF-SERVICE CHECK-OUT
# =====================================================

@router.post(
    "/me/check-out",
    response_model=schemas.AttendanceResponse,
)
def self_check_out(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        staff_required
    ),
):
    """
    Allows the currently authenticated staff member
    to check themselves out.

    No user_id is accepted from the frontend.
    """

    today = datetime.now(timezone.utc)

    result = crud.check_out_staff(
        db,
        current_user.id,
        today,
        None,
    )

    # -------------------------------------------------
    # ATTENDANCE NOT FOUND
    # -------------------------------------------------

    if result == "attendance_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No attendance record found "
                "for you today."
            ),
        )

    # -------------------------------------------------
    # NOT CHECKED IN
    # -------------------------------------------------

    if result == "not_checked_in":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have not checked in.",
        )

    # -------------------------------------------------
    # INVALID STAFF ROLE
    # -------------------------------------------------

    if result == "invalid_staff_role":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Attendance can only be recorded "
                "for Doctor, Nurse, Receptionist, "
                "or Housekeeper."
            ),
        )

    # -------------------------------------------------
    # ALREADY CHECKED OUT
    # -------------------------------------------------

    if result == "already_checked_out":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already checked out.",
        )

    # -------------------------------------------------
    # UPDATE CONFLICT
    # -------------------------------------------------

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance update conflict.",
        )

    return result


# =====================================================
# ADMIN CREATE ATTENDANCE
# =====================================================

@router.post(
    "",
    response_model=schemas.AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_attendance(
    attendance: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.create_attendance(
        db,
        attendance,
    )

    # -------------------------------------------------
    # USER NOT FOUND
    # -------------------------------------------------

    if result == "user_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found.",
        )

    # -------------------------------------------------
    # USER INACTIVE
    # -------------------------------------------------

    if result == "user_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Inactive staff cannot have "
                "attendance marked."
            ),
        )

    # -------------------------------------------------
    # INVALID STAFF ROLE
    # -------------------------------------------------

    if result == "invalid_staff_role":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Attendance can only be recorded "
                "for Doctor, Nurse, Receptionist, "
                "or Housekeeper."
            ),
        )

    # -------------------------------------------------
    # DUPLICATE ATTENDANCE
    # -------------------------------------------------

    if result == "attendance_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Attendance already exists for "
                "this staff member on this date."
            ),
        )

    # -------------------------------------------------
    # INVALID STATUS
    # -------------------------------------------------

    if result == "invalid_status":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid attendance status.",
        )

    # -------------------------------------------------
    # INVALID TIME RANGE
    # -------------------------------------------------

    if result == "invalid_time_range":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Check-out time cannot be before "
                "check-in time."
            ),
        )

    return result


# =====================================================
# ADMIN CHECK-IN
# =====================================================

@router.post(
    "/check-in",
    response_model=schemas.AttendanceResponse,
)
def check_in(
    data: schemas.AttendanceCheckIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.check_in_staff(
        db,
        data.user_id,
        data.attendance_date,
        data.shift,
        data.notes,
    )

    # -------------------------------------------------
    # USER NOT FOUND
    # -------------------------------------------------

    if result == "user_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found.",
        )

    # -------------------------------------------------
    # USER INACTIVE
    # -------------------------------------------------

    if result == "user_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive staff cannot check in.",
        )

    # -------------------------------------------------
    # ALREADY CHECKED IN
    # -------------------------------------------------

    if result == "already_checked_in":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Staff member has already checked in.",
        )

    # -------------------------------------------------
    # DUPLICATE
    # -------------------------------------------------

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance record already exists.",
        )

    return result


# =====================================================
# ADMIN CHECK-OUT
# =====================================================

@router.post(
    "/check-out",
    response_model=schemas.AttendanceResponse,
)
def check_out(
    data: schemas.AttendanceCheckOut,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.check_out_staff(
        db,
        data.user_id,
        data.attendance_date,
        data.notes,
    )

    # -------------------------------------------------
    # ATTENDANCE NOT FOUND
    # -------------------------------------------------

    if result == "attendance_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No attendance record found "
                "for this staff member."
            ),
        )

    # -------------------------------------------------
    # NOT CHECKED IN
    # -------------------------------------------------

    if result == "not_checked_in":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff member has not checked in.",
        )

    # -------------------------------------------------
    # ALREADY CHECKED OUT
    # -------------------------------------------------

    if result == "already_checked_out":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Staff member has already checked out.",
        )

    # -------------------------------------------------
    # UPDATE CONFLICT
    # -------------------------------------------------

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance update conflict.",
        )

    return result


# =====================================================
# GET ATTENDANCE BY ID
# =====================================================

@router.get(
    "/{attendance_id}",
    response_model=schemas.AttendanceResponse,
)
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    attendance = crud.get_attendance_by_id(
        db,
        attendance_id,
    )

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    return attendance


# =====================================================
# UPDATE ATTENDANCE
# =====================================================

@router.put(
    "/{attendance_id}",
    response_model=schemas.AttendanceResponse,
)
def update_attendance(
    attendance_id: int,
    attendance: schemas.AttendanceUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    result = crud.update_attendance(
        db,
        attendance_id,
        attendance,
    )

    # -------------------------------------------------
    # NOT FOUND
    # -------------------------------------------------

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    # -------------------------------------------------
    # INVALID STATUS
    # -------------------------------------------------

    if result == "invalid_status":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid attendance status.",
        )

    # -------------------------------------------------
    # INVALID TIME RANGE
    # -------------------------------------------------

    if result == "invalid_time_range":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Check-out time cannot be before "
                "check-in time."
            ),
        )

    # -------------------------------------------------
    # DUPLICATE
    # -------------------------------------------------

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Attendance already exists for "
                "this staff member on this date."
            ),
        )

    return result


# =====================================================
# DELETE ATTENDANCE
# =====================================================

@router.delete(
    "/{attendance_id}",
)
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    deleted = crud.delete_attendance(
        db,
        attendance_id,
    )

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    return {
        "message": (
            "Attendance record deleted successfully."
        ),
        "attendance_id": attendance_id,
    }