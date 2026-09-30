from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas, models
from app.auth.dependencies import get_current_user


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# =====================================================
# ADMIN CHECK
# =====================================================

def admin_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Only Administrator users can manage staff.
    """

    if current_user.role != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )

    return current_user


# =====================================================
# APPOINTMENT STAFF VIEW CHECK
# =====================================================

def appointment_staff_view_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Allow staff roles that need doctor information
    for operational workflows such as Appointments.

    This endpoint does NOT expose staff-management
    operations. It only provides active doctors.
    """

    allowed_roles = {
        "Administrator",
        "Receptionist",
        "Doctor",
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Administrator, Receptionist "
                "and Doctor users can access doctor records."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot access doctor records.",
        )

    return current_user


# =====================================================
# GET ALL STAFF
# =====================================================

@router.get(
    "",
    response_model=list[schemas.UserResponse],
)
def get_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Return all staff accounts.

    Housekeepers are returned exactly like
    Doctors, Nurses and Receptionists.

    Administrator only.
    """

    return crud.get_users(db)


# =====================================================
# GET ACTIVE DOCTORS
# =====================================================

@router.get(
    "/doctors",
    response_model=list[schemas.UserResponse],
)
def get_doctors(
    db: Session = Depends(get_db),
    _: models.User = Depends(
        appointment_staff_view_required
    ),
):
    """
    Return active Doctor accounts.

    Used by operational modules such as Appointments.

    This endpoint intentionally exposes only:
        - Doctor users
        - Active Doctor users

    It does not expose complete staff-management
    functionality.
    """

    users = crud.get_users(db)

    doctors = [
        user
        for user in users
        if user.role == "Doctor"
        and user.is_active == "true"
    ]

    return doctors


# =====================================================
# CREATE STAFF
# =====================================================

@router.post(
    "",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Create a hospital staff account.

    Allowed roles:
        - Doctor
        - Nurse
        - Receptionist
        - Housekeeper

    Business rules:
        - Employee ID is generated automatically.
        - Email is optional.
        - Password is optional when email is blank.
        - Password is required when email is provided.
        - Mobile is optional for every role.
        - Shift is required for every staff member.
        - PIN is mandatory.
        - Administrator accounts cannot be created
          through Staff Management.
    """

    # -------------------------------------------------
    # ALLOWED ROLES
    # -------------------------------------------------

    allowed_roles = {
        "Doctor",
        "Nurse",
        "Receptionist",
        "Housekeeper",
    }

    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid role. Allowed roles are "
                "Doctor, Nurse, Receptionist and Housekeeper."
            ),
        )

    # -------------------------------------------------
    # NORMALIZE EMAIL
    # -------------------------------------------------

    email = (
        str(user.email).strip().lower()
        if user.email
        else None
    )

    # -------------------------------------------------
    # EMAIL / PASSWORD RULE
    # -------------------------------------------------

    password = (
        user.password.strip()
        if user.password
        else None
    )

    if email and not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Password is required when an email "
                "address is provided."
            ),
        )

    # -------------------------------------------------
    # DUPLICATE EMAIL
    # -------------------------------------------------

    if email:
        existing_email = crud.get_user_by_email(
            db,
            email,
        )

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists.",
            )

    # -------------------------------------------------
    # EMPLOYEE ID
    # -------------------------------------------------

    employee_id = (
        user.employee_id.strip()
        if user.employee_id
        else None
    )

    # -------------------------------------------------
    # MOBILE
    # -------------------------------------------------

    mobile = (
        user.mobile.strip()
        if user.mobile
        else None
    )

    if mobile:
        if (
            not mobile.isdigit()
            or len(mobile) != 10
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Mobile number must contain exactly "
                    "10 digits."
                ),
            )

    # -------------------------------------------------
    # SHIFT
    # -------------------------------------------------

    shift = (
        user.shift.strip()
        if user.shift
        else None
    )

    if not shift:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Shift is required.",
        )

    allowed_shifts = {
        "Morning",
        "Afternoon",
        "Evening",
        "Night",
    }

    if shift not in allowed_shifts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Invalid shift. Allowed shifts are "
                "Morning, Afternoon, Evening and Night."
            ),
        )

    # -------------------------------------------------
    # CLEAN DATA
    # -------------------------------------------------

    clean_user = user.model_copy(
        update={
            "email": email,
            "password": password,
            "employee_id": employee_id,
            "mobile": mobile,
            "shift": shift,
        }
    )

    # -------------------------------------------------
    # CREATE
    # -------------------------------------------------

    created = crud.create_user(
        db,
        clean_user,
    )

    # -------------------------------------------------
    # CRUD RESULT HANDLING
    # -------------------------------------------------

    if created is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create staff account.",
        )

    if created == "email_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists.",
        )

    if created == "employee_id_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee ID already exists.",
        )

    if created == "mobile_invalid":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mobile number must contain exactly 10 digits.",
        )

    if created == "pin_required":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Security PIN is required.",
        )

    if created == "pin_invalid":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="PIN must contain 4 to 6 digits.",
        )

    return created


# =====================================================
# UPDATE STAFF
# =====================================================

@router.put(
    "/{user_id}",
    response_model=schemas.UserResponse,
)
def update_user(
    user_id: int,
    user: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        admin_required
    ),
):
    """
    Update staff basic information.

    Administrator accounts cannot be modified
    through Staff Management.

    Business rules:
        - Full name is required.
        - Email is optional.
        - Mobile is not modified from this form.
        - Shift is not modified from this form.
        - Existing password/PIN remain unchanged.
    """

    # -------------------------------------------------
    # PREVENT SELF UPDATE
    # -------------------------------------------------

    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Use My Profile to update "
                "your own account."
            ),
        )

    # -------------------------------------------------
    # GET USER
    # -------------------------------------------------

    target_user = crud.get_user_by_id(
        db,
        user_id,
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # -------------------------------------------------
    # PROTECT ADMINISTRATOR
    # -------------------------------------------------

    if target_user.role == "Administrator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Administrator account cannot be "
                "modified from Staff Management."
            ),
        )

    # -------------------------------------------------
    # NORMALIZE FULL NAME
    # -------------------------------------------------

    full_name = (
        user.full_name.strip()
        if user.full_name
        else ""
    )

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Full name is required.",
        )

    # -------------------------------------------------
    # NORMALIZE EMAIL
    # -------------------------------------------------

    email = (
        str(user.email).strip().lower()
        if user.email
        else None
    )

    # -------------------------------------------------
    # DUPLICATE EMAIL
    # -------------------------------------------------

    if email:
        existing = crud.get_user_by_email(
            db,
            email,
        )

        if (
            existing is not None
            and existing.id != user_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists.",
            )

    # -------------------------------------------------
    # CLEAN DATA
    # -------------------------------------------------

    clean_user = user.model_copy(
        update={
            "full_name": full_name,
            "email": email,
        }
    )

    # -------------------------------------------------
    # UPDATE
    # -------------------------------------------------

    updated = crud.update_user(
        db,
        user_id,
        clean_user,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # -------------------------------------------------
    # CRUD RESULT HANDLING
    # -------------------------------------------------

    if updated == "email_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists.",
        )

    return updated


# =====================================================
# UPDATE STAFF STATUS
# =====================================================

@router.patch(
    "/{user_id}/status",
    response_model=schemas.UserResponse,
)
def update_status(
    user_id: int,
    status_data: schemas.UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        admin_required
    ),
):
    """
    Activate or deactivate a staff account.

    Administrator accounts cannot be deactivated.
    """

    # -------------------------------------------------
    # PREVENT SELF STATUS CHANGE
    # -------------------------------------------------

    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "You cannot change the status "
                "of your own account."
            ),
        )

    # -------------------------------------------------
    # GET USER
    # -------------------------------------------------

    target_user = crud.get_user_by_id(
        db,
        user_id,
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # -------------------------------------------------
    # PROTECT ADMINISTRATOR
    # -------------------------------------------------

    if target_user.role == "Administrator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Administrator account status "
                "cannot be changed."
            ),
        )

    # -------------------------------------------------
    # UPDATE
    # -------------------------------------------------

    updated = crud.update_user_status(
        db,
        user_id,
        status_data.is_active,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if updated == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Administrator account status "
                "cannot be changed."
            ),
        )

    return updated


# =====================================================
# DELETE STAFF
# =====================================================

@router.delete(
    "/{user_id}",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        admin_required
    ),
):
    """
    Delete a staff account.

    Administrator accounts cannot be deleted.
    """

    # -------------------------------------------------
    # PREVENT SELF DELETE
    # -------------------------------------------------

    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "You cannot delete your own account. "
                "Use My Profile or contact another administrator."
            ),
        )

    # -------------------------------------------------
    # GET USER
    # -------------------------------------------------

    target_user = crud.get_user_by_id(
        db,
        user_id,
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # -------------------------------------------------
    # PROTECT ADMINISTRATOR
    # -------------------------------------------------

    if target_user.role == "Administrator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator cannot be deleted.",
        )

    # -------------------------------------------------
    # DELETE
    # -------------------------------------------------

    deleted = crud.delete_user(
        db,
        user_id,
    )

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if deleted == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator cannot be deleted.",
        )

    if deleted == "has_dependencies":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This staff account cannot be deleted "
                "because dependent records exist."
            ),
        )

    return {
        "message": "Staff account deleted successfully.",
        "user_id": user_id,
    }