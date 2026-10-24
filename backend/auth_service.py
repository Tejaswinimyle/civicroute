import os
import datetime
import bcrypt
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from models import User, Authority

# Secret and configuration
JWT_SECRET = os.getenv("JWT_SECRET", "civicroute_super_secret_jwt_key_2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

security_bearer = HTTPBearer(auto_error=False)


# -------------------------------------------------------------
# Password Hashing
# -------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash a raw password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# -------------------------------------------------------------
# JWT Tokens
# -------------------------------------------------------------

def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Create a signed JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )


# -------------------------------------------------------------
# Default Authority Seed
# -------------------------------------------------------------

DEFAULT_AUTHORITY_ACCOUNTS = [
    {
        "officer_id": "water001",
        "name": "Water Officer",
        "department": "Water & Sanitation",
        "role": "department_officer",
        "password": "water123"
    },
    {
        "officer_id": "roads001",
        "name": "Roads Officer",
        "department": "Roads & Infrastructure",
        "role": "department_officer",
        "password": "roads123"
    },
    {
        "officer_id": "san001",
        "name": "Sanitation Officer",
        "department": "Sanitation",
        "role": "department_officer",
        "password": "san123"
    },
    {
        "officer_id": "electricity001",
        "name": "Electricity Officer",
        "department": "Electricity & Lighting",
        "role": "department_officer",
        "password": "electricity123"
    },
    {
        "officer_id": "drainage001",
        "name": "Drainage Officer",
        "department": "Drainage & Public Works",
        "role": "department_officer",
        "password": "drainage123"
    },
    {
        "officer_id": "admin001",
        "name": "Central Administrator",
        "department": "Central Administration",
        "role": "admin",
        "password": "admin123"
    }
]


def seed_authorities(db: Session):
    """Seed standard authority accounts if not already present."""
    for item in DEFAULT_AUTHORITY_ACCOUNTS:
        existing = db.query(Authority).filter(Authority.officer_id == item["officer_id"]).first()
        if not existing:
            new_auth = Authority(
                officer_id=item["officer_id"],
                name=item["name"],
                department=item["department"],
                role=item["role"],
                hashed_password=hash_password(item["password"]),
                is_active=True,
                created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )
            db.add(new_auth)
    db.commit()


# -------------------------------------------------------------
# FastAPI Dependencies for Protected Routes
# -------------------------------------------------------------

def get_current_user_payload(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> Optional[Dict[str, Any]]:
    """Extract token payload if bearer header is present, else None."""
    if not credentials or not credentials.credentials:
        return None
    return decode_access_token(credentials.credentials)


def get_current_citizen(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> Dict[str, Any]:
    """Require a valid citizen token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in as a citizen."
        )
    payload = decode_access_token(credentials.credentials)
    if payload.get("sub_type") != "citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: citizen credentials required."
        )
    return payload


def get_current_authority(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> Dict[str, Any]:
    """Require a valid authority token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in with authority credentials."
        )
    payload = decode_access_token(credentials.credentials)
    if payload.get("sub_type") != "authority":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: authority credentials required."
        )
    return payload


def get_current_admin(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> Dict[str, Any]:
    """Require a valid central admin authority token."""
    payload = get_current_authority(credentials)
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: administrative privileges required."
        )
    return payload

