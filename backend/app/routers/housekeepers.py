from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas, models
from app.auth.dependencies import get_current_user


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/housekeepers",
    tags=["Housekeepers"],
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
    Only Administrators can manage housekeeping
    configuration and room assignments.
    """

    if current_user.role != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )

    return current_user


# =====================================================
# HOUSEKEEPER VALIDATION HELPER
# =====================================================

def get_housekeeper_user(
    db: Session,
    housekeeper_id: int,
):
    """
    Return a User only when the user is actually
    a Housekeeper.

    Housekeepers are now stored in the users table.
    """

    user = crud.get_user_by_id(
        db,
        housekeeper_id,
    )

    if not user:
        return None

    if user.role != "Housekeeper":
        return None

    return user


# =====================================================
# GET ALL HOUSEKEEPERS
# =====================================================

@router.get(
    "",
    response_model=List[schemas.UserResponse],
)
def get_housekeepers(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Return all staff members whose role is Housekeeper.
    """

    return crud.get_housekeepers(db)


# =====================================================
# GET SINGLE HOUSEKEEPER
# =====================================================

@router.get(
    "/{housekeeper_id}",
    response_model=schemas.UserResponse,
)
def get_housekeeper(
    housekeeper_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Return a single Housekeeper user.
    """

    housekeeper = get_housekeeper_user(
        db,
        housekeeper_id,
    )

    if not housekeeper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Housekeeper not found.",
        )

    return housekeeper


# =====================================================
# GET ALL ROOM ASSIGNMENTS
# =====================================================

@router.get(
    "/assignments/all",
    response_model=List[
        schemas.RoomHousekeeperAssignmentResponse
    ],
)
def get_all_assignments(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Return all room-housekeeper assignments.
    """

    return crud.get_all_room_assignments(db)


# =====================================================
# GET HOUSEKEEPER ASSIGNMENTS
# =====================================================

@router.get(
    "/{housekeeper_id}/assignments",
    response_model=List[
        schemas.RoomHousekeeperAssignmentResponse
    ],
)
def get_housekeeper_assignments(
    housekeeper_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Return all room assignments belonging to a
    specific Housekeeper user.
    """

    housekeeper = get_housekeeper_user(
        db,
        housekeeper_id,
    )

    if not housekeeper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Housekeeper not found.",
        )

    return crud.get_housekeeper_assignments(
        db,
        housekeeper_id,
    )


# =====================================================
# CREATE ROOM ASSIGNMENT
# =====================================================

@router.post(
    "/assignments",
    response_model=schemas.RoomHousekeeperAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    assignment: schemas.RoomHousekeeperAssignmentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Assign a present/active Housekeeper to a room.

    The CRUD layer verifies:

    1. Housekeeper exists
    2. User role is Housekeeper
    3. Housekeeper is active
    4. Room exists
    5. Room does not already have an active
       housekeeper assignment
    """

    result = crud.create_room_assignment(
        db,
        assignment,
    )

    # -------------------------------------------------
    # HOUSEKEEPER NOT FOUND
    # -------------------------------------------------

    if result == "housekeeper_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Housekeeper not found.",
        )

    # -------------------------------------------------
    # HOUSEKEEPER NOT ACTIVE
    # -------------------------------------------------

    if result == "housekeeper_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Inactive Housekeeper cannot be "
                "assigned to a room."
            ),
        )

    # -------------------------------------------------
    # HOUSEKEEPER NOT PRESENT
    # -------------------------------------------------

    if result == "housekeeper_not_present":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Housekeeper must be marked Present "
                "before a room can be assigned."
            ),
        )

    # -------------------------------------------------
    # ROOM NOT FOUND
    # -------------------------------------------------

    if result == "room_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )

    # -------------------------------------------------
    # ROOM ALREADY ASSIGNED
    # -------------------------------------------------

    if result == "room_already_assigned":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This room already has an active "
                "housekeeper."
            ),
        )

    return result


# =====================================================
# UPDATE ROOM ASSIGNMENT
# =====================================================

@router.put(
    "/assignments/{assignment_id}",
    response_model=schemas.RoomHousekeeperAssignmentResponse,
)
def update_assignment(
    assignment_id: int,
    assignment: schemas.RoomHousekeeperAssignmentUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Update an existing room assignment.
    """

    result = crud.update_room_assignment(
        db,
        assignment_id,
        assignment,
    )

    # -------------------------------------------------
    # ASSIGNMENT NOT FOUND
    # -------------------------------------------------

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found.",
        )

    # -------------------------------------------------
    # HOUSEKEEPER NOT FOUND
    # -------------------------------------------------

    if result == "housekeeper_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Housekeeper not found.",
        )

    # -------------------------------------------------
    # HOUSEKEEPER INACTIVE
    # -------------------------------------------------

    if result == "housekeeper_inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Inactive Housekeeper cannot be "
                "assigned to a room."
            ),
        )

    # -------------------------------------------------
    # HOUSEKEEPER NOT PRESENT
    # -------------------------------------------------

    if result == "housekeeper_not_present":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Housekeeper must be marked Present "
                "before being assigned."
            ),
        )

    # -------------------------------------------------
    # ROOM NOT FOUND
    # -------------------------------------------------

    if result == "room_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found.",
        )

    # -------------------------------------------------
    # ROOM ALREADY ASSIGNED
    # -------------------------------------------------

    if result == "room_already_assigned":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This room already has an active "
                "housekeeper."
            ),
        )

    return result


# =====================================================
# DELETE ROOM ASSIGNMENT
# =====================================================

@router.delete(
    "/assignments/{assignment_id}",
)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Remove a room-housekeeper assignment.
    """

    deleted = crud.delete_room_assignment(
        db,
        assignment_id,
    )

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found.",
        )

    return {
        "message": (
            "Room housekeeper assignment "
            "removed successfully."
        ),
        "assignment_id": assignment_id,
    }