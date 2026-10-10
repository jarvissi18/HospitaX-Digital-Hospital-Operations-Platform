
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# =====================================================
# GET MY NOTIFICATIONS
# =====================================================

@router.get(
    "",
    response_model=List[schemas.NotificationResponse],
)
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id
        )
        .order_by(models.Notification.created_at.desc())
        .all()
    )


# =====================================================
# GET UNREAD COUNT
# =====================================================

@router.get(
    "/unread-count",
    response_model=schemas.NotificationUnreadCount,
)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read.is_(False),
        )
        .count()
    )

    return {"unread_count": count}


# =====================================================
# MARK ONE NOTIFICATION AS READ
# =====================================================

@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    notification.is_read = True
    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marked as read.",
        "notification": schemas.NotificationResponse.model_validate(
            notification
        ),
    }


# =====================================================
# MARK ALL MY NOTIFICATIONS AS READ
# =====================================================

@router.patch("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    updated_count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read.is_(False),
        )
        .update(
            {models.Notification.is_read: True},
            synchronize_session=False,
        )
    )

    db.commit()

    return {
        "message": "All notifications marked as read.",
        "updated_count": updated_count,
    }
