from typing import List

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
    prefix="/work-tasks",
    tags=["Work Management"],
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
    Only Administrators can create, modify,
    or cancel work tasks.
    """

    if current_user.role != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive Administrator account.",
        )

    return current_user


# =====================================================
# OPERATIONAL STAFF CHECK
# =====================================================

def operational_staff_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Only operational staff can start and complete
    their assigned work.
    """

    allowed_roles = {
        "Doctor",
        "Nurse",
        "Receptionist",
        "Housekeeper",
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operational staff access required.",
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive staff cannot perform work.",
        )

    return current_user


# =====================================================
# GET ALL WORK TASKS
# ADMIN ONLY
# =====================================================

@router.get(
    "",
    response_model=List[
        schemas.WorkTaskResponse
    ],
)
def get_all_work_tasks(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Administrator view.

    Returns all work tasks across the hospital.
    """

    return crud.get_work_tasks(db)


# =====================================================
# GET MY WORK TASKS
# OPERATIONAL STAFF
# =====================================================

@router.get(
    "/my",
    response_model=List[
        schemas.WorkTaskResponse
    ],
)
def get_my_work_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        operational_staff_required
    ),
):
    """
    Staff view.

    A staff member can only see tasks assigned
    to their own user ID.
    """

    return crud.get_work_tasks_for_user(
        db,
        current_user.id,
    )


# =====================================================
# GET SINGLE WORK TASK
# ADMIN ONLY
# =====================================================

@router.get(
    "/{task_id}",
    response_model=schemas.WorkTaskResponse,
)
def get_work_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """
    Administrator can inspect a specific task.
    """

    task = crud.get_work_task(
        db,
        task_id,
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work task not found.",
        )

    return task


# =====================================================
# CREATE WORK TASK
# ADMIN ONLY
# =====================================================

@router.post(
    "",
    response_model=schemas.WorkTaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_work_task(
    task: schemas.WorkTaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        admin_required
    ),
):
    """
    Administrator creates and assigns a task.
    """

    result = crud.create_work_task(
        db,
        task,
        current_user.id,
    )

    # -------------------------------------------------
    # CREATOR NOT FOUND
    # -------------------------------------------------

    if result == "creator_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrator account not found.",
        )

    # -------------------------------------------------
    # CREATOR NOT ADMIN
    # -------------------------------------------------

    if result == "creator_not_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators can create work tasks.",
        )

    # -------------------------------------------------
    # CREATOR INACTIVE
    # -------------------------------------------------

    if result == "creator_inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive Administrator cannot create tasks.",
        )

    # -------------------------------------------------
    # ASSIGNEE NOT FOUND
    # -------------------------------------------------

    if result == "assignee_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned staff member not found.",
        )

    # -------------------------------------------------
    # INVALID ASSIGNEE ROLE
    # -------------------------------------------------

    if result == "invalid_assignee_role":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Tasks can only be assigned to "
                "Doctor, Nurse, Receptionist, "
                "or Housekeeper."
            ),
        )

    # -------------------------------------------------
    # ASSIGNEE INACTIVE
    # -------------------------------------------------

    if result == "assignee_inactive":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inactive staff cannot be assigned new work.",
        )

    # -------------------------------------------------
    # INVALID PRIORITY
    # -------------------------------------------------

    if result == "invalid_priority":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid priority. Use Low, Medium, "
                "High, or Urgent."
            ),
        )

    # -------------------------------------------------
    # INVALID TITLE
    # -------------------------------------------------

    if result == "invalid_title":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task title cannot be empty.",
        )

    # -------------------------------------------------
    # DUPLICATE
    # -------------------------------------------------

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create duplicate work task.",
        )

    return result


# =====================================================
# UPDATE WORK TASK
# ADMIN ONLY
# =====================================================

@router.put(
    "/{task_id}",
    response_model=schemas.WorkTaskResponse,
)
def update_work_task(
    task_id: int,
    task: schemas.WorkTaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        admin_required
    ),
):
    """
    Administrator can modify an active task.

    Completed and Cancelled tasks are protected.
    """

    result = crud.update_work_task(
        db,
        task_id,
        task,
        current_user.id,
    )

    # -------------------------------------------------
    # TASK NOT FOUND
    # -------------------------------------------------

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work task not found.",
        )

    # -------------------------------------------------
    # ADMIN NOT FOUND
    # -------------------------------------------------

    if result == "updater_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrator account not found.",
        )

    # -------------------------------------------------
    # NOT ADMIN
    # -------------------------------------------------

    if result == "updater_not_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators can modify work tasks.",
        )

    # -------------------------------------------------
    # ADMIN INACTIVE
    # -------------------------------------------------

    if result == "updater_inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive Administrator cannot modify tasks.",
        )

    # -------------------------------------------------
    # TASK LOCKED
    # -------------------------------------------------

    if result == "task_locked":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Completed or Cancelled tasks "
                "cannot be modified."
            ),
        )

    # -------------------------------------------------
    # INVALID TITLE
    # -------------------------------------------------

    if result == "invalid_title":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task title cannot be empty.",
        )

    # -------------------------------------------------
    # INVALID PRIORITY
    # -------------------------------------------------

    if result == "invalid_priority":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid priority. Use Low, Medium, "
                "High, or Urgent."
            ),
        )

    # -------------------------------------------------
    # INVALID ASSIGNEE
    # -------------------------------------------------

    if result == "assignee_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned staff member not found.",
        )

    if result == "invalid_assignee_role":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Tasks can only be assigned to "
                "Doctor, Nurse, Receptionist, "
                "or Housekeeper."
            ),
        )

    if result == "assignee_inactive":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inactive staff cannot be assigned new work.",
        )

    return result


# =====================================================
# START WORK TASK
# OPERATIONAL STAFF ONLY
# =====================================================

@router.post(
    "/{task_id}/start",
    response_model=schemas.WorkTaskResponse,
)
def start_work_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        operational_staff_required
    ),
):
    """
    Start a task assigned to the current staff member.

    Pending or Overdue -> In Progress
    """

    result = crud.start_work_task(
        db,
        task_id,
        current_user.id,
    )

    # -------------------------------------------------
    # TASK NOT FOUND
    # -------------------------------------------------

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work task not found.",
        )

    # -------------------------------------------------
    # NOT ASSIGNED TO USER
    # -------------------------------------------------

    if result == "not_assigned":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You can only start work tasks "
                "assigned to you."
            ),
        )

    # -------------------------------------------------
    # INVALID STATUS
    # -------------------------------------------------

    if result == "task_already_completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Completed task cannot be started again.",
        )

    if result == "task_cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cancelled task cannot be started.",
        )

    if result == "invalid_status":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This task cannot be started in its current state.",
        )

    return result


# =====================================================
# COMPLETE WORK TASK
# OPERATIONAL STAFF ONLY
# =====================================================

@router.post(
    "/{task_id}/complete",
    response_model=schemas.WorkTaskResponse,
)
def complete_work_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        operational_staff_required
    ),
):
    """
    Complete a task assigned to the current staff member.

    In Progress -> Completed
    """

    result = crud.complete_work_task(
        db,
        task_id,
        current_user.id,
    )

    # -------------------------------------------------
    # TASK NOT FOUND
    # -------------------------------------------------

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work task not found.",
        )

    # -------------------------------------------------
    # NOT ASSIGNED
    # -------------------------------------------------

    if result == "not_assigned":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You can only complete work tasks "
                "assigned to you."
            ),
        )

    # -------------------------------------------------
    # INVALID STATUS
    # -------------------------------------------------

    if result == "not_in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Only tasks currently In Progress "
                "can be completed."
            ),
        )

    return result


# =====================================================
# CANCEL WORK TASK
# ADMIN ONLY
# =====================================================

@router.post(
    "/{task_id}/cancel",
    response_model=schemas.WorkTaskResponse,
)
def cancel_work_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        admin_required
    ),
):
    """
    Cancel a task without deleting its history.
    """

    result = crud.cancel_work_task(
        db,
        task_id,
        current_user.id,
    )

    # -------------------------------------------------
    # TASK NOT FOUND
    # -------------------------------------------------

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work task not found.",
        )

    # -------------------------------------------------
    # TASK ALREADY COMPLETED
    # -------------------------------------------------

    if result == "task_completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Completed task cannot be cancelled.",
        )

    # -------------------------------------------------
    # ALREADY CANCELLED
    # -------------------------------------------------

    if result == "task_already_cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is already cancelled.",
        )

    return result