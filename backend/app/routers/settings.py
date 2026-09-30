from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas, models
from app.auth.dependencies import get_current_user


# =====================================================
# ADMIN AUTHORIZATION
# =====================================================

def admin_required(
    current_user: models.User = Depends(get_current_user),
):
    """
    Allow only Administrator users to access
    system settings.
    """

    if current_user.role != "Administrator":
        raise HTTPException(
            status_code=403,
            detail="Administrator access required.",
        )

    return current_user


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/settings",
    tags=["Settings"],
)


# =====================================================
# GET SETTINGS
# =====================================================

@router.get(
    "/",
    response_model=schemas.SettingsResponse,
    dependencies=[Depends(admin_required)],
)
def get_settings(
    db: Session = Depends(get_db),
):
    """
    Get current hospital and administrator settings.

    Only Administrator users can access settings.
    """

    return crud.get_settings(db)


# =====================================================
# UPDATE SETTINGS
# =====================================================

@router.put(
    "/",
    response_model=schemas.SettingsResponse,
    dependencies=[Depends(admin_required)],
)
def update_settings(
    settings: schemas.SettingsUpdate,
    db: Session = Depends(get_db),
):
    """
    Update hospital and administrator settings.

    Only Administrator users can modify settings.
    """

    return crud.update_settings(
        db,
        settings,
    )