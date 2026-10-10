from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth.dependencies import get_current_user
from app.database import get_db

router = APIRouter(prefix="/work-tasks", tags=["Work Management"])


def admin_required(
    current_user: models.User = Depends(get_current_user),
):
    """Allow only active administrators to manage work tasks."""
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


def operational_staff_required(
    current_user: models.User = Depends(get_current_user),
):
    """Allow active operational staff to work on their own tasks."""
    allowed_roles = {"Doctor", "Nurse", "Receptionist", "Housekeeper"}
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


def create_task_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
) -> None:
    """Save a notification; do not hide failures from the backend terminal."""
    try:
        notification = models.Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        print(
            f"NOTIFICATION SAVED: id={notification.id}, user_id={user_id}, "
            f"type={notification_type}",
            flush=True,
        )
    except Exception as exc:
        db.rollback()
        print("NOTIFICATION CREATION FAILED:", repr(exc), flush=True)


@router.get("", response_model=List[schemas.WorkTaskResponse])
def get_all_work_tasks(
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """Return all work tasks to administrators."""
    return crud.get_work_tasks(db)


@router.get("/my", response_model=List[schemas.WorkTaskResponse])
def get_my_work_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(operational_staff_required),
):
    """Return only tasks assigned to the current staff member."""
    return crud.get_work_tasks_for_user(db, current_user.id)


@router.get("/{task_id}", response_model=schemas.WorkTaskResponse)
def get_work_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """Allow an administrator to inspect one task."""
    task = crud.get_work_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work task not found.",
        )
    return task


@router.post(
    "",
    response_model=schemas.WorkTaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_work_task(
    task: schemas.WorkTaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(admin_required),
):
    """Administrator creates and assigns a task, then notifies its assignee."""
    result = crud.create_work_task(db, task, current_user.id)

    errors = {
        "creator_not_found": (404, "Administrator account not found."),
        "creator_not_admin": (403, "Only Administrators can create work tasks."),
        "creator_inactive": (403, "Inactive Administrator cannot create tasks."),
        "assignee_not_found": (404, "Assigned staff member not found."),
        "invalid_assignee_role": (
            400,
            "Tasks can only be assigned to Doctor, Nurse, Receptionist, or Housekeeper.",
        ),
        "assignee_inactive": (409, "Inactive staff cannot be assigned new work."),
        "invalid_priority": (400, "Invalid priority. Use Low, Medium, High, or Urgent."),
        "invalid_title": (400, "Task title cannot be empty."),
        "duplicate": (409, "Unable to create duplicate work task."),
    }
    if isinstance(result, str) and result in errors:
        code, detail = errors[result]
        raise HTTPException(status_code=code, detail=detail)

    # Notification is created only after CRUD has successfully created the task.
    create_task_notification(
        db,
        user_id=result.assigned_to_id,
        title="New Work Task Assigned",
        message=f'You have been assigned the task: "{result.title}".',
        notification_type="task_assigned",
    )
    return result


@router.put("/{task_id}", response_model=schemas.WorkTaskResponse)
def update_work_task(
    task_id: int,
    task: schemas.WorkTaskUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """Allow administrators to modify active tasks."""
    result = crud.update_work_task(db, task_id, task, _.id)
    if result is None:
        raise HTTPException(status_code=404, detail="Work task not found.")

    errors = {
        "updater_not_found": (404, "Administrator account not found."),
        "updater_not_admin": (403, "Only Administrators can modify work tasks."),
        "updater_inactive": (403, "Inactive Administrator cannot modify tasks."),
        "task_locked": (409, "Completed or Cancelled tasks cannot be modified."),
        "invalid_title": (400, "Task title cannot be empty."),
        "invalid_priority": (400, "Invalid priority. Use Low, Medium, High, or Urgent."),
        "assignee_not_found": (404, "Assigned staff member not found."),
        "invalid_assignee_role": (
            400,
            "Tasks can only be assigned to Doctor, Nurse, Receptionist, or Housekeeper.",
        ),
        "assignee_inactive": (409, "Inactive staff cannot be assigned new work."),
    }
    if isinstance(result, str) and result in errors:
        code, detail = errors[result]
        raise HTTPException(status_code=code, detail=detail)
    return result


@router.post("/{task_id}/start", response_model=schemas.WorkTaskResponse)
def start_work_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(operational_staff_required),
):
    """Start a task assigned to the current staff member."""
    result = crud.start_work_task(db, task_id, current_user.id)
    if result is None:
        raise HTTPException(status_code=404, detail="Work task not found.")
    errors = {
        "not_assigned": (403, "You can only start work tasks assigned to you."),
        "task_already_completed": (409, "Completed task cannot be started again."),
        "task_cancelled": (409, "Cancelled task cannot be started."),
        "invalid_status": (409, "This task cannot be started in its current state."),
    }
    if isinstance(result, str) and result in errors:
        code, detail = errors[result]
        raise HTTPException(status_code=code, detail=detail)
    return result


@router.post("/{task_id}/complete", response_model=schemas.WorkTaskResponse)
def complete_work_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(operational_staff_required),
):
    """Complete assigned work and notify the task creator."""

    result = crud.complete_work_task(
        db,
        task_id,
        current_user.id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Work task not found.",
        )

    errors = {
        "not_assigned": (
            403,
            "You can only complete work tasks assigned to you.",
        ),
        "not_in_progress": (
            409,
            "Only tasks currently In Progress can be completed.",
        ),
        "invalid_transition": (
            409,
            "This task cannot be completed from its current status.",
        ),
    }

    if isinstance(result, str):
        if result in errors:
            code, detail = errors[result]
            raise HTTPException(
                status_code=code,
                detail=detail,
            )

        raise HTTPException(
            status_code=500,
            detail="Unexpected result while completing the work task.",
        )

    creator_id = getattr(result, "created_by_id", None)

    if creator_id is not None and creator_id != current_user.id:
        staff_name = (
            getattr(current_user, "full_name", None)
            or current_user.email
        )

        create_task_notification(
            db,
            user_id=creator_id,
            title="Work Task Completed",
            message=f'{staff_name} completed the task: "{result.title}".',
            notification_type="task_completed",
        )

    return result



@router.post("/{task_id}/cancel", response_model=schemas.WorkTaskResponse)
def cancel_work_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(admin_required),
):
    """Cancel a task without deleting its history."""
    result = crud.cancel_work_task(db, task_id, _.id)
    if result is None:
        raise HTTPException(status_code=404, detail="Work task not found.")
    errors = {
        "task_completed": (409, "Completed task cannot be cancelled."),
        "task_already_cancelled": (409, "Task is already cancelled."),
    }
    if isinstance(result, str) and result in errors:
        code, detail = errors[result]
        raise HTTPException(status_code=code, detail=detail)
    return result
