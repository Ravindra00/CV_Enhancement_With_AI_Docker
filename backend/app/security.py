"""
Security utilities: password hashing (bcrypt via passlib) and JWT token handling.
Uses passlib CryptContext with bcrypt, suppressing the passlib/bcrypt 4.x
version-mismatch warning that causes a spurious ValueError in the bug-detect path.
"""

import warnings
import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt

# Suppress passlib's noisy bcrypt backend warning on Python 3.11 + bcrypt 4.x
logging.getLogger('passlib').setLevel(logging.ERROR)
warnings.filterwarnings('ignore', '.*trapped.*')

from passlib.context import CryptContext

# Use sha256_crypt as primary + bcrypt as secondary (avoids bcrypt bug-detect crash)
pwd_context = CryptContext(
    schemes=["bcrypt", "sha256_crypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)

from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password, scheme="bcrypt")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns None if invalid."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
