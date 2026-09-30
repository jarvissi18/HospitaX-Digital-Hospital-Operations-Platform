from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token
from app.database import get_db


# =====================================================
# ROUTER
# =====================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =====================================================
# LOGIN
# =====================================================

@router.post(
    "/login",
    response_model=schemas.LoginResponse,
)
def login(
    credentials: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    """
    Login using email and password.

    Returns:
        JWT access token
        authenticated user information
    """

    user = crud.authenticate_user(
    db=db,
    identifier=credentials.identifier,
    password=credentials.password,
    pin=credentials.pin,
)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid employee ID/email or password.",
        )

    # -------------------------------------------------
    # PREVENT INACTIVE USERS FROM LOGGING IN
    # -------------------------------------------------

    if user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Your account is inactive. "
                "Please contact an administrator."
            ),
        )

    # -------------------------------------------------
    # CREATE JWT
    #
    # IMPORTANT:
    # `sub` stores the stable database User ID.
    # Do NOT store email here.
    # -------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "id": user.id,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


# =====================================================
# OAUTH2 TOKEN
# =====================================================

@router.post(
    "/token",
    response_model=schemas.Token,
)
def oauth2_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    OAuth2-compatible token endpoint.

    Used by Swagger UI and other OAuth2 clients.

    The React frontend continues to use /auth/login.
    """

    user = crud.authenticate_user(
        db,
        form_data.username,
        form_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # -------------------------------------------------
    # PREVENT INACTIVE USERS FROM RECEIVING A TOKEN
    # -------------------------------------------------

    if user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive.",
        )

    # -------------------------------------------------
    # CREATE JWT
    #
    # `sub` = stable database User ID
    # -------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "id": user.id,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# =====================================================
# REGISTER
# =====================================================

@router.post(
    "/register",
    response_model=schemas.UserResponse,
)
def register(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new user.

    IMPORTANT:
    Users cannot create their own Administrator account.

    New accounts are always created as Receptionist
    unless an existing administrator creates them through
    the dedicated user-management functionality.
    """

    existing = crud.get_user_by_email(
        db,
        user.email,
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    # -------------------------------------------------
    # SECURITY:
    # NEVER TRUST ROLE FROM PUBLIC REGISTRATION
    # -------------------------------------------------

    user_data = user.model_copy(
        update={
            "role": "Receptionist",
        }
    )

    return crud.create_user(
        db,
        user_data,
    )


# =====================================================
# CURRENT USER
# =====================================================

@router.get(
    "/me",
    response_model=schemas.ProfileResponse,
)
def me(
    current_user: models.User = Depends(
        get_current_user,
    ),
):
    """
    Return the currently authenticated user's profile.
    """

    return current_user


# =====================================================
# UPDATE CURRENT USER PROFILE
# =====================================================

@router.put(
    "/profile",
    response_model=schemas.ProfileResponse,
)
def update_profile(
    profile: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user,
    ),
):
    """
    Update the currently authenticated user's
    name and email.

    Users can only modify their own profile.
    """

    full_name = profile.full_name.strip()
    email = str(profile.email).strip().lower()

    # -------------------------------------------------
    # VALIDATE NAME
    # -------------------------------------------------

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required.",
        )

    # -------------------------------------------------
    # CLEAN PROFILE DATA
    # -------------------------------------------------

    clean_profile = schemas.ProfileUpdate(
        full_name=full_name,
        email=email,
    )

    updated = crud.update_profile(
        db,
        current_user.id,
        clean_profile,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if updated == "email_exists":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists.",
        )

    return updated


# =====================================================
# CHANGE PASSWORD
# =====================================================

@router.put(
    "/change-password",
)
def change_password(
    password_data: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user,
    ),
):
    """
    Change password for the currently authenticated user.

    Requires:
        current_password
        new_password
        confirm_password
    """

    # -------------------------------------------------
    # BASIC VALIDATION
    # -------------------------------------------------

    if not password_data.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is required.",
        )

    if not password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password is required.",
        )

    if not password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password confirmation is required.",
        )

    # -------------------------------------------------
    # PASSWORD LENGTH
    # -------------------------------------------------

    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password must contain at least "
                "8 characters."
            ),
        )

    # -------------------------------------------------
    # PREVENT SAME PASSWORD
    # -------------------------------------------------

    if (
        password_data.new_password
        == password_data.current_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password must be different "
                "from the current password."
            ),
        )

    # -------------------------------------------------
    # CONFIRM PASSWORD
    # -------------------------------------------------

    if (
        password_data.new_password
        != password_data.confirm_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match.",
        )

    # -------------------------------------------------
    # UPDATE PASSWORD
    # -------------------------------------------------

    result = crud.change_password(
        db,
        current_user.id,
        password_data,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if result == "wrong_password":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if result == "password_mismatch":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match.",
        )

    return {
        "message": "Password changed successfully.",
    }