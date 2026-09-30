from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app import crud
from app.auth.security import decode_access_token
from app.database import get_db


# =====================================================
# OAUTH2 / JWT AUTHENTICATION
# =====================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
)


# =====================================================
# CURRENT AUTHENTICATED USER
# =====================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Resolve the authenticated user from the JWT.

    JWT `sub` contains the user's database ID.
    """

    payload = decode_access_token(token)

    # -------------------------------------------------
    # INVALID / EXPIRED TOKEN
    # -------------------------------------------------

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # -------------------------------------------------
    # READ USER ID FROM TOKEN
    # -------------------------------------------------

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # -------------------------------------------------
    # VALIDATE USER ID
    # -------------------------------------------------

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # -------------------------------------------------
    # LOAD USER
    # -------------------------------------------------

    user = crud.get_user_by_id(
        db,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # -------------------------------------------------
    # ACTIVE ACCOUNT CHECK
    # -------------------------------------------------

    if user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account is inactive.",
        )

    return user