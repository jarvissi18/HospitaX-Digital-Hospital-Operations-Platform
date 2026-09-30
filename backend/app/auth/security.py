import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext


# =====================================================
# ENVIRONMENT
# =====================================================

load_dotenv()


# =====================================================
# SECURITY CONFIG
# =====================================================

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY not found in .env file"
    )


ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
)


ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "1440",
    )
)


# =====================================================
# PASSWORD HASHING
# =====================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(
    password: str,
) -> str:
    """
    Hash a plain-text password using bcrypt.
    """

    return pwd_context.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """
    Verify a plain-text password against
    its stored bcrypt hash.
    """

    return pwd_context.verify(
        plain_password,
        hashed_password,
    )

def hash_pin(
    pin: str,
) -> str:
    """
    Hash a plain-text PIN using bcrypt.
    """

    return pwd_context.hash(
        pin
    )


def verify_pin(
    plain_pin: str,
    hashed_pin: str,
) -> bool:
    """
    Verify a plain-text PIN against
    its stored bcrypt hash.
    """

    return pwd_context.verify(
        plain_pin,
        hashed_pin,
    )

# =====================================================
# JWT ACCESS TOKEN
# =====================================================

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.

    The supplied data is copied so the original
    dictionary is not modified.
    """

    to_encode = data.copy()

    if expires_delta:
        expire = (
            datetime.now(timezone.utc)
            + expires_delta
        )
    else:
        expire = (
            datetime.now(timezone.utc)
            + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

    to_encode["exp"] = expire

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


# =====================================================
# JWT ACCESS TOKEN DECODER
# =====================================================

def decode_access_token(
    token: str,
):
    """
    Decode and validate a JWT access token.

    Returns:
        payload dictionary when valid
        None when invalid or expired
    """

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        return payload

    except JWTError:
        return None