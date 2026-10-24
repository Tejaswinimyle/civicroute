import os
import random
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import case
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
from models import (
    Complaint,
    User,
    Authority,
    Department,
    ComplaintStatusHistory,
    Notification,
    PasswordResetToken
)
from email_service import send_password_reset_email, get_smtp_config
from ai_service import (
    analyze_complaint,
    analyze_complaint_image,
    rewrite_complaint
)
from conversation_service import check_missing_information
from letter_service import generate_complaint_letter
from priority_service import calculate_priority_score
from auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    seed_authorities,
    get_current_citizen,
    get_current_authority,
    get_current_admin,
    get_current_user_payload
)

# -----------------------------
# Initialize Application
# -----------------------------

app = FastAPI(
    title="CivicRoute API",
    description="Intelligent Backend for CivicRoute AI-Powered Complaint Platform",
    version="2.0.0"
)

# CORS Configuration
frontend_url_env = os.getenv("FRONTEND_URL", "").strip()
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if frontend_url_env:
    for origin in frontend_url_env.split(","):
        cleaned = origin.strip()
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Database Tables and Seed Standard Authorities
Base.metadata.create_all(bind=engine)
with SessionLocal() as init_db:
    try:
        seed_authorities(init_db)
    except Exception as e:
        print("Authority seeding notice:", e)


# -----------------------------
# DB Dependency
# -----------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------
# Pydantic Request/Response Models
# -----------------------------

# Auth Models
class CitizenRegisterRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    location: Optional[str] = ""
    password: str


class CitizenLoginRequest(BaseModel):
    login_id: str  # email or phone
    password: str


class AuthorityLoginRequest(BaseModel):
    officer_id: str
    password: str


class AuthorityCreateRequest(BaseModel):
    officer_id: str
    name: str
    department: str
    role: str = "department_officer"
    password: str


class ForgotPasswordRequest(BaseModel):
    identifier: str
    role: Optional[str] = "citizen"


class VerifyResetTokenRequest(BaseModel):
    token: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class CitizenProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None


class CitizenChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ReportProblemRequest(BaseModel):
    category: str
    description: str
    email: Optional[str] = None
    page_url: Optional[str] = None


# Complaint Models
class ComplaintCreate(BaseModel):
    issue: str
    department: str
    severity: str
    priority: str
    description: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    letter: str = ""
    final_letter: Optional[str] = None
    rewritten_description: Optional[str] = None
    approved_description: Optional[str] = None
    image: str = ""
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None
    citizen_phone: Optional[str] = None


class ComplaintAnalyze(BaseModel):
    description: Optional[str] = ""
    image: Optional[str] = ""


class ComplaintRewrite(BaseModel):
    description: str


class ConversationRequest(BaseModel):
    description: str
    location: str = ""
    affected_people: str = ""
    follow_up_answer: str = ""
    missing_field: str = ""


class LetterRequest(BaseModel):
    issue: str
    department: str
    description: str
    location: str
    affected_people: str
    severity: str


class ComplaintStatusUpdate(BaseModel):
    status: str
    remarks: Optional[str] = ""
    updated_by: Optional[str] = ""


# -----------------------------
# Health Check / Root
# -----------------------------

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "CivicRoute API",
        "version": "2.0.0",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


# =============================================================
# AUTHENTICATION ENDPOINTS
# =============================================================

@app.post("/auth/citizen/register")
def citizen_register(req: CitizenRegisterRequest, db: Session = Depends(get_db)):
    """Register a new citizen account."""
    clean_email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A citizen account with this email address already exists."
        )

    new_user = User(
        name=req.name.strip(),
        email=clean_email,
        phone=req.phone.strip() if req.phone else "",
        location=req.location.strip() if req.location else "",
        hashed_password=hash_password(req.password),
        is_active=True,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({
        "sub": str(new_user.id),
        "sub_type": "citizen",
        "email": new_user.email,
        "name": new_user.name
    })

    return {
        "message": "Citizen registered successfully",
        "token": token,
        "citizen": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "phone": new_user.phone,
            "location": new_user.location
        }
    }


@app.post("/auth/citizen/login")
def citizen_login(req: CitizenLoginRequest, db: Session = Depends(get_db)):
    """Log in an existing citizen via email or phone."""
    clean_login = req.login_id.strip().lower()
    user = db.query(User).filter(
        (User.email == clean_login) | (User.phone == req.login_id.strip())
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email/phone or password."
        )

    token = create_access_token({
        "sub": str(user.id),
        "sub_type": "citizen",
        "email": user.email,
        "name": user.name
    })

    return {
        "message": "Login successful",
        "token": token,
        "citizen": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "location": user.location
        }
    }


@app.get("/auth/citizen/me")
def citizen_profile(
    citizen: Dict[str, Any] = Depends(get_current_citizen),
    db: Session = Depends(get_db)
):
    """Get current citizen profile and complaint count."""
    user = db.query(User).filter(User.id == int(citizen["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen profile not found.")

    complaints_count = db.query(Complaint).filter(
        (Complaint.citizen_id == user.id) | (Complaint.citizen_email == user.email)
    ).count()

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "location": user.location,
        "total_complaints": complaints_count,
        "created_at": user.created_at
    }


@app.put("/auth/citizen/profile")
@app.put("/auth/citizen/me")
def update_citizen_profile(
    req: CitizenProfileUpdateRequest,
    citizen: Dict[str, Any] = Depends(get_current_citizen),
    db: Session = Depends(get_db)
):
    """Update editable profile information for the authenticated citizen."""
    user = db.query(User).filter(User.id == int(citizen["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen account not found.")

    if req.name is not None and req.name.strip():
        user.name = req.name.strip()
    if req.phone is not None:
        user.phone = req.phone.strip()
    if req.location is not None:
        user.location = req.location.strip()

    db.commit()
    db.refresh(user)

    complaints_count = db.query(Complaint).filter(
        (Complaint.citizen_id == user.id) | (Complaint.citizen_email == user.email)
    ).count()

    return {
        "message": "Profile updated successfully.",
        "citizen": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "location": user.location,
            "total_complaints": complaints_count,
            "created_at": user.created_at
        }
    }


@app.post("/auth/citizen/change-password")
def change_citizen_password(
    req: CitizenChangePasswordRequest,
    citizen: Dict[str, Any] = Depends(get_current_citizen),
    db: Session = Depends(get_db)
):
    """Change password for authenticated citizen after verifying current password."""
    user = db.query(User).filter(User.id == int(citizen["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen account not found.")

    if not verify_password(req.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(req.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    user.hashed_password = hash_password(req.new_password.strip())
    db.commit()

    return {
        "message": "Password changed successfully. Your account is secured."
    }


@app.get("/support/info")
def support_info():
    """Get configurable support contact info."""
    support_email = os.getenv("SUPPORT_EMAIL", "support@civicroute.org")
    return {
        "support_email": support_email,
        "service_name": "CivicRoute Citizen Support",
        "hours": "24/7 Digital Intake with Local Office Hours Mon-Fri 9:00 AM - 5:00 PM",
        "response_time": "Typically within 24 to 48 hours"
    }


@app.post("/support/report-problem")
def report_problem(req: ReportProblemRequest, db: Session = Depends(get_db)):
    """Allow citizens or visitors to report technical platform problems."""
    cat = req.category.strip() if req.category else "General"
    desc = req.description.strip()
    if not desc:
        raise HTTPException(status_code=400, detail="Problem description is required.")

    report_id = f"PR-{random.randint(10000, 99999)}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    notif = Notification(
        recipient_email=os.getenv("SUPPORT_EMAIL", "support@civicroute.org"),
        recipient_role="admin",
        complaint_id=report_id,
        title=f"Platform Problem Report: {cat}",
        message=f"Category: {cat}\nReporter Email: {req.email or 'Not provided'}\nPage: {req.page_url or 'N/A'}\nDescription: {desc}",
        status="unread",
        created_at=now_str
    )
    db.add(notif)
    db.commit()

    return {
        "message": "Problem report received successfully. Our technical team has been notified.",
        "report_id": report_id,
        "status": "Logged"
    }


@app.post("/auth/authority/login")
def authority_login(req: AuthorityLoginRequest, db: Session = Depends(get_db)):
    """Log in an officer or central administrator."""
    clean_id = req.officer_id.strip().lower()
    auth = db.query(Authority).filter(Authority.officer_id == clean_id).first()

    if not auth or not verify_password(req.password, auth.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid officer ID or password."
        )

    token = create_access_token({
        "sub": str(auth.id),
        "sub_type": "authority",
        "officer_id": auth.officer_id,
        "department": auth.department,
        "role": auth.role,
        "name": auth.name
    })

    return {
        "message": "Authority login successful",
        "token": token,
        "authority": {
            "officerId": auth.officer_id,
            "name": auth.name,
            "department": auth.department,
            "role": auth.role
        }
    }


@app.get("/auth/authority/me")
def authority_profile(
    auth: Dict[str, Any] = Depends(get_current_authority),
    db: Session = Depends(get_db)
):
    """Get current officer/admin profile."""
    officer = db.query(Authority).filter(Authority.officer_id == auth.get("officer_id")).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Authority account not found.")

    return {
        "officer_id": officer.officer_id,
        "name": officer.name,
        "department": officer.department,
        "role": officer.role,
        "created_at": officer.created_at
    }


@app.post("/auth/authority/create")
def create_authority_account(
    req: AuthorityCreateRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Only central administrators can create new authority officer accounts."""
    clean_id = req.officer_id.strip().lower()
    existing = db.query(Authority).filter(Authority.officer_id == clean_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"An authority account with officer ID '{clean_id}' already exists."
        )

    new_auth = Authority(
        officer_id=clean_id,
        name=req.name.strip(),
        department=req.department.strip(),
        role=req.role.strip(),
        hashed_password=hash_password(req.password),
        is_active=True,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(new_auth)
    db.commit()
    db.refresh(new_auth)

    return {
        "message": f"Authority account for {new_auth.name} created successfully.",
        "officer_id": new_auth.officer_id,
        "department": new_auth.department,
        "role": new_auth.role
    }


# -----------------------------
# Password Reset Endpoints
# -----------------------------

@app.get("/auth/smtp-status")
def smtp_status():
    """Check current SMTP configuration status."""
    config = get_smtp_config()
    return {
        "configured": config["is_configured"],
        "missing_vars": config["missing_vars"],
        "host": config["host"] if config["host"] else None,
        "port": config["port"],
        "from_email": config["from_email"] if config["from_email"] else None
    }


@app.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate real password reset flow.
    Generates a secure, expiring SHA-256 hashed token in SQLite.
    Delivers email via SMTP if configured; otherwise provides clear
    instructions on missing environment variables and dev reset link.
    """
    clean_id = req.identifier.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Please enter your email, phone, or officer ID.")

    user_type = None
    user_id = None
    recipient_email = None
    recipient_name = None

    # 1. Search Citizen by email or phone
    citizen = db.query(User).filter(
        (User.email == clean_id.lower()) | (User.phone == clean_id)
    ).first()

    if citizen:
        user_type = "citizen"
        user_id = citizen.id
        recipient_email = citizen.email
        recipient_name = citizen.name
    else:
        # 2. Search Authority by officer_id
        auth = db.query(Authority).filter(Authority.officer_id == clean_id.lower()).first()
        if auth:
            user_type = "authority"
            user_id = auth.id
            recipient_email = f"{auth.officer_id}@civicroute.local"
            recipient_name = auth.name

    if not user_type:
        raise HTTPException(
            status_code=404,
            detail=f"No citizen or authority account found matching '{clean_id}'."
        )

    # Invalidate previous unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_type == user_type,
        PasswordResetToken.identifier == clean_id.lower(),
        PasswordResetToken.used == False
    ).update({"used": True})

    # Generate cryptographically secure random token (URL safe)
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    now = datetime.now()
    expires_at = (now + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")

    token_entry = PasswordResetToken(
        user_type=user_type,
        user_id=user_id,
        identifier=clean_id.lower(),
        token_hash=token_hash,
        created_at=now.strftime("%Y-%m-%d %H:%M:%S"),
        expires_at=expires_at,
        used=False
    )
    db.add(token_entry)
    db.commit()

    reset_link = f"http://localhost:5173/reset-password?token={raw_token}"
    email_result = send_password_reset_email(
        to_email=recipient_email,
        recipient_name=recipient_name or "CivicRoute User",
        reset_link=reset_link,
        raw_token=raw_token
    )

    return {
        "message": "Password reset token generated successfully.",
        "user_type": user_type,
        "identifier": clean_id,
        "expires_in_hours": 1,
        "email_delivery": email_result,
        "dev_reset_token": raw_token,
        "dev_reset_link": reset_link
    }


@app.post("/auth/verify-reset-token")
def verify_reset_token(req: VerifyResetTokenRequest, db: Session = Depends(get_db)):
    """Verify that a password reset token is valid, unused and unexpired."""
    raw_token = req.token.strip()
    if not raw_token:
        raise HTTPException(status_code=400, detail="Token is required.")

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="Reset token is invalid or has already been used.")

    try:
        exp_time = datetime.strptime(record.expires_at, "%Y-%m-%d %H:%M:%S")
        if exp_time < datetime.now():
            raise HTTPException(status_code=400, detail="This reset token has expired. Please request a new one.")
    except ValueError:
        pass

    return {
        "valid": True,
        "user_type": record.user_type,
        "identifier": record.identifier
    }


@app.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Apply the new password using bcrypt hash and mark token as used."""
    raw_token = req.token.strip()
    new_pwd = req.new_password.strip()

    if not raw_token:
        raise HTTPException(status_code=400, detail="Reset token is required.")

    if len(new_pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="Reset token is invalid or has already been used.")

    try:
        exp_time = datetime.strptime(record.expires_at, "%Y-%m-%d %H:%M:%S")
        if exp_time < datetime.now():
            raise HTTPException(status_code=400, detail="This reset token has expired. Please request a new one.")
    except ValueError:
        pass

    new_hash = hash_password(new_pwd)

    if record.user_type == "citizen":
        user = db.query(User).filter(User.id == record.user_id).first()
        if not user:
            user = db.query(User).filter(User.email == record.identifier).first()
        if not user:
            raise HTTPException(status_code=404, detail="Citizen account not found.")
        user.hashed_password = new_hash
    elif record.user_type == "authority":
        auth = db.query(Authority).filter(Authority.id == record.user_id).first()
        if not auth:
            auth = db.query(Authority).filter(Authority.officer_id == record.identifier).first()
        if not auth:
            raise HTTPException(status_code=404, detail="Authority account not found.")
        auth.hashed_password = new_hash
    else:
        raise HTTPException(status_code=400, detail="Unsupported user type.")

    record.used = True
    db.commit()

    return {
        "message": "Password has been successfully reset. You can now log in with your new password.",
        "user_type": record.user_type
    }


# =============================================================
# AI ANALYSIS, REWRITING, CONVERSATION, LETTER GENERATION
# =============================================================

@app.post("/analyze")
def analyze(complaint: ComplaintAnalyze):
    try:
        desc = (complaint.description or "").strip()
        img = (complaint.image or "").strip()

        print(f"[API /analyze] Request received - desc_len: {len(desc)}, has_image: {bool(img)}, image_len: {len(img)}")

        if img:
            result = analyze_complaint_image(
                image_data=img,
                description=desc
            )
        else:
            base_result = analyze_complaint(desc)
            result = {
                **base_result,
                "description": desc if desc else "Civic complaint",
                "confidence": "High" if desc else "Low",
                "is_civic_issue": True if desc else False,
                "ai_provider": "Keyword Classifier"
            }

        return {
            "message": "Complaint analyzed successfully",
            "analysis": result
        }
    except Exception as e:
        print(f"[API /analyze] Endpoint error: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Complaint analysis failed: {str(e)}"
        )


@app.post("/rewrite-complaint")
def rewrite_complaint_endpoint(request: ComplaintRewrite):
    if not request.description.strip():
        raise HTTPException(
            status_code=400,
            detail="Complaint description cannot be empty."
        )

    try:
        rewritten_text = rewrite_complaint(request.description)
        return {
            "message": "Complaint rewritten successfully",
            "original_description": request.description,
            "rewritten_description": rewritten_text
        }
    except Exception as e:
        print("Complaint rewriting error:", e)
        raise HTTPException(
            status_code=503,
            detail="AI rewriting is temporarily unavailable. Please try again."
        )


@app.post("/conversation")
def conversation(request: ConversationRequest):
    try:
        result = check_missing_information(
            description=request.description,
            location=request.location,
            affected_people=request.affected_people,
            follow_up_answer=request.follow_up_answer,
            missing_field=request.missing_field,
        )
        return result
    except Exception as e:
        print("Conversation endpoint error:", e)
        return {
            "complete": False,
            "question": "Something went wrong. Please try again.",
            "missing_field": "",
            "error": str(e),
            "error_type": type(e).__name__
        }


@app.post("/generate-letter")
def generate_letter(request: LetterRequest):
    letter = generate_complaint_letter(
        issue=request.issue,
        department=request.department,
        description=request.description,
        location=request.location,
        affected_people=request.affected_people,
        severity=request.severity
    )
    return {
        "message": "Complaint letter generated successfully",
        "letter": letter
    }


# =============================================================
# COMPLAINT MANAGEMENT ENDPOINTS
# =============================================================

@app.post("/complaints")
def create_complaint(
    complaint: ComplaintCreate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Submit a civic complaint.
    Stores:
    - Unique ID
    - Citizen identity (if authenticated)
    - Original, rewritten, and citizen-approved descriptions
    - Original AI letter and citizen-edited final letter
    - Calculates transparent intelligent priority score
    - Creates audit history and notification records
    """
    # Extract user if token present
    citizen_id = None
    citizen_email = complaint.citizen_email or None
    citizen_name = complaint.citizen_name or None
    citizen_phone = complaint.citizen_phone or None

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = decode_access_token(token)
            if payload.get("sub_type") == "citizen":
                citizen_id = int(payload.get("sub"))
                # Lookup authenticated user in database to ensure authoritative details
                user = db.query(User).filter(User.id == citizen_id).first()
                if user:
                    citizen_name = user.name
                    citizen_email = user.email
                    citizen_phone = user.phone or citizen_phone
                else:
                    citizen_email = payload.get("email") or citizen_email
                    citizen_name = payload.get("name") or citizen_name
        except Exception:
            pass

    # If citizen_id not linked from token, check if user exists by email
    if not citizen_id and citizen_email:
        existing_user = db.query(User).filter(User.email == citizen_email.strip().lower()).first()
        if existing_user:
            citizen_id = existing_user.id
            citizen_name = citizen_name or existing_user.name
            citizen_phone = citizen_phone or existing_user.phone

    # Generate unique complaint ID
    for _ in range(10):
        complaint_id = f"CV-{random.randint(10000, 99999)}"
        existing = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
        if not existing:
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate unique complaint ID.")

    # Calculate intelligent priority score
    active_desc = complaint.approved_description or complaint.rewritten_description or complaint.description
    priority_score, calculated_priority, priority_breakdown = calculate_priority_score(
        issue=complaint.issue,
        department=complaint.department,
        severity=complaint.severity,
        description=active_desc,
        affected_people=complaint.location
    )

    # Map individual complaint priority strictly by severity:
    # Critical -> Urgent, High -> High, Medium -> Medium, Low -> Low
    sev_norm = (complaint.severity or "").strip().capitalize()
    if sev_norm == "Critical":
        effective_priority = "Urgent"
    elif sev_norm == "High":
        effective_priority = "High"
    elif sev_norm == "Medium":
        effective_priority = "Medium"
    elif sev_norm == "Low":
        effective_priority = "Low"
    else:
        effective_priority = calculated_priority or complaint.priority or "Medium" 
    final_letter_content = complaint.final_letter or complaint.letter
    current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    new_complaint = Complaint(
        complaint_id=complaint_id,
        citizen_id=citizen_id,
        citizen_name=citizen_name,
        citizen_email=citizen_email,
        citizen_phone=citizen_phone,
        issue=complaint.issue,
        department=complaint.department,
        severity=complaint.severity,
        priority=effective_priority,
        priority_score=priority_score,
        description=complaint.description,
        rewritten_description=complaint.rewritten_description or "",
        approved_description=complaint.approved_description or complaint.description,
        location=complaint.location,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        letter=complaint.letter,
        final_letter=final_letter_content,
        image=complaint.image,
        status="Submitted",
        date=current_time_str,
        created_at=current_time_str,
        updated_at=current_time_str
    )
    db.add(new_complaint)

    # Initial audit status history entry
    status_entry = ComplaintStatusHistory(
        complaint_id=complaint_id,
        previous_status=None,
        new_status="Submitted",
        updated_by=citizen_name or "Citizen",
        remarks="Complaint filed through CivicRoute platform.",
        timestamp=current_time_str
    )
    db.add(status_entry)

    # Submission notification for citizen
    if citizen_email:
        citizen_notif = Notification(
            recipient_email=citizen_email,
            recipient_role="citizen",
            complaint_id=complaint_id,
            title="Complaint Submitted",
            message=f"Your complaint {complaint_id} has been submitted to {complaint.department}.",
            status="unread",
            created_at=current_time_str
        )
        db.add(citizen_notif)

    db.commit()
    db.refresh(new_complaint)

    return {
        "message": "Complaint submitted successfully",
        "complaint_id": new_complaint.complaint_id,
        "status": new_complaint.status,
        "department": new_complaint.department,
        "severity": new_complaint.severity,
        "priority": new_complaint.priority,
        "priority_score": new_complaint.priority_score,
        "letter": new_complaint.letter,
        "final_letter": new_complaint.final_letter,
        "image": new_complaint.image
    }


def _can_view_citizen_details(complaint: Complaint, payload: Optional[Dict[str, Any]]) -> bool:
    """
    Privacy check:
    - Central Admins have access across all departments.
    - Department Officers have access to complainant details for their assigned department.
    - Citizens can view their own details.
    - Unauthenticated callers or other officers have citizen personal details redacted.
    """
    if not payload:
        return False
    sub_type = payload.get("sub_type")
    if sub_type == "authority":
        role = payload.get("role")
        if role == "admin":
            return True
        dept = (payload.get("department") or "").strip().lower()
        c_dept = (complaint.department or "").strip().lower()
        if dept and c_dept and (dept in c_dept or c_dept in dept):
            return True
        return False
    elif sub_type == "citizen":
        sub_id = payload.get("sub")
        email = (payload.get("email") or "").strip().lower()
        if sub_id and complaint.citizen_id == int(sub_id):
            return True
        if email and (complaint.citizen_email or "").strip().lower() == email:
            return True
        return False
    return False


@app.get("/complaints")
def get_complaints(
    department: Optional[str] = None,
    status: Optional[str] = None,
    citizen_email: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retrieve complaints with role-based access control:
    - Department Officers see only complaints assigned to their department.
    - Central Admins see all departments.
    - Authenticated Citizens see their own complaints.
    - Unauthenticated callers preserve existing public dashboard compatibility.
    - Complainant personal contact info is redacted for unauthenticated/unauthorized callers.
    """
    query = db.query(Complaint)
    caller_payload = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            caller_payload = decode_access_token(token)
            sub_type = caller_payload.get("sub_type")

            if sub_type == "authority":
                auth_role = caller_payload.get("role")
                auth_dept = caller_payload.get("department")

                if auth_role != "admin" and auth_dept:
                    query = query.filter(Complaint.department.ilike(f"%{auth_dept}%"))

            elif sub_type == "citizen":
                c_email = caller_payload.get("email")
                c_id = caller_payload.get("sub")
                query = query.filter(
                    (Complaint.citizen_id == int(c_id)) | (Complaint.citizen_email == c_email)
                )
        except Exception:
            caller_payload = None

    # Optional query parameters
    if department:
        query = query.filter(Complaint.department.ilike(f"%{department.strip()}%"))
    if status:
        query = query.filter(Complaint.status == status.strip())
    if citizen_email:
        query = query.filter(Complaint.citizen_email == citizen_email.strip().lower())

    severity_order = case(
        (Complaint.severity.ilike("critical"), 1),
        (Complaint.severity.ilike("high"), 2),
        (Complaint.severity.ilike("medium"), 3),
        (Complaint.severity.ilike("low"), 4),
        else_=5
    )

    complaints = query.order_by(severity_order, Complaint.id.desc()).all()

    result = []
    for complaint in complaints:
        can_view = _can_view_citizen_details(complaint, caller_payload)
        result.append({
            "id": complaint.complaint_id,
            "complaint_id": complaint.complaint_id,
            "citizen_id": complaint.citizen_id if can_view else None,
            "citizen_name": complaint.citizen_name if can_view else None,
            "citizen_email": complaint.citizen_email if can_view else None,
            "citizen_phone": complaint.citizen_phone if can_view else None,
            "issue": complaint.issue,
            "department": complaint.department,
            "severity": complaint.severity,
            "priority": "Urgent" if (complaint.severity or "").strip().capitalize() == "Critical" else (complaint.priority or "Medium"),
            "priority_score": complaint.priority_score,
            "description": complaint.description,
            "rewritten_description": complaint.rewritten_description,
            "approved_description": complaint.approved_description,
            "location": complaint.location,
            "latitude": complaint.latitude,
            "longitude": complaint.longitude,
            "letter": complaint.letter,
            "final_letter": complaint.final_letter or complaint.letter,
            "image": complaint.image,
            "status": complaint.status,
            "date": complaint.date,
            "created_at": complaint.created_at,
            "updated_at": complaint.updated_at
        })

    return result


@app.get("/complaints/{complaint_id}")
def get_complaint(
    complaint_id: str,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retrieve complete complaint record including history.
    Complainant personal details are only shown to authorized officers and admins.
    """
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    caller_payload = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            caller_payload = decode_access_token(token)
        except Exception:
            caller_payload = None

    can_view = _can_view_citizen_details(complaint, caller_payload)

    history = db.query(ComplaintStatusHistory).filter(
        ComplaintStatusHistory.complaint_id == complaint_id
    ).order_by(ComplaintStatusHistory.id.asc()).all()

    return {
        "id": complaint.complaint_id,
        "complaint_id": complaint.complaint_id,
        "citizen_id": complaint.citizen_id if can_view else None,
        "citizen_name": complaint.citizen_name if can_view else None,
        "citizen_email": complaint.citizen_email if can_view else None,
        "citizen_phone": complaint.citizen_phone if can_view else None,
        "issue": complaint.issue,
        "department": complaint.department,
        "severity": complaint.severity,
        "priority": complaint.priority,
        "priority_score": complaint.priority_score,
        "description": complaint.description,
        "rewritten_description": complaint.rewritten_description,
        "approved_description": complaint.approved_description,
        "location": complaint.location,
        "latitude": complaint.latitude,
        "longitude": complaint.longitude,
        "letter": complaint.letter,
        "final_letter": complaint.final_letter or complaint.letter,
        "image": complaint.image,
        "status": complaint.status,
        "date": complaint.date,
        "created_at": complaint.created_at,
        "updated_at": complaint.updated_at,
        "history": [
            {
                "previous_status": h.previous_status,
                "new_status": h.new_status,
                "updated_by": h.updated_by,
                "remarks": h.remarks,
                "timestamp": h.timestamp
            }
            for h in history
        ]
    }


@app.put("/complaints/{complaint_id}/status")
def update_complaint_status(
    complaint_id: str,
    request: ComplaintStatusUpdate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Update complaint status with audit trail and notification.
    Enforces department permissions for officers.
    """
    allowed_statuses = ["Submitted", "Under Review", "In Progress", "Resolved"]
    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid complaint status", "allowed_statuses": allowed_statuses}
        )

    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated_by_str = request.updated_by or "Department Officer"

    # Enforce role and department match if token provided
    if authorization and authorization.startswith("Bearer "):
        try:
            payload = decode_access_token(authorization.split(" ")[1])
            if payload.get("sub_type") == "authority":
                officer_dept = payload.get("department")
                officer_role = payload.get("role")
                updated_by_str = f"{payload.get('name')} ({payload.get('officer_id')})"

                if officer_role != "admin" and officer_dept:
                    if officer_dept.lower() not in complaint.department.lower():
                        raise HTTPException(
                            status_code=403,
                            detail="You can only manage complaints within your assigned department."
                        )
        except HTTPException:
            raise
        except Exception:
            pass

    prev_status = complaint.status
    complaint.status = request.status
    complaint.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Record in history
    history_entry = ComplaintStatusHistory(
        complaint_id=complaint_id,
        previous_status=prev_status,
        new_status=request.status,
        updated_by=updated_by_str,
        remarks=request.remarks or f"Status changed to {request.status}",
        timestamp=complaint.updated_at
    )
    db.add(history_entry)

    # Notify citizen
    if complaint.citizen_email:
        notif = Notification(
            recipient_email=complaint.citizen_email,
            recipient_role="citizen",
            complaint_id=complaint_id,
            title=f"Complaint Status: {request.status}",
            message=f"Your complaint {complaint_id} status has been updated to '{request.status}'. Remarks: {request.remarks or 'None'}",
            status="unread",
            created_at=complaint.updated_at
        )
        db.add(notif)

    db.commit()
    db.refresh(complaint)

    return {
        "message": "Complaint status updated successfully",
        "complaint_id": complaint.complaint_id,
        "previous_status": prev_status,
        "status": complaint.status,
        "updated_by": updated_by_str,
        "updated_at": complaint.updated_at
    }


@app.delete("/complaints/{complaint_id}")
def delete_complaint(complaint_id: str, db: Session = Depends(get_db)):
    """Delete a complaint and its associated history."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Delete history and notifications
    db.query(ComplaintStatusHistory).filter(ComplaintStatusHistory.complaint_id == complaint_id).delete()
    db.query(Notification).filter(Notification.complaint_id == complaint_id).delete()
    db.delete(complaint)
    db.commit()

    return {
        "message": "Complaint deleted successfully",
        "complaint_id": complaint_id
    }


# =============================================================
# ANALYTICS & PRIORITY QUEUE ENDPOINTS
# =============================================================

@app.get("/analytics/priority-queue")
def get_priority_queue(
    department: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Returns complaints ordered by priority score descending.
    Prioritizes critical health/safety hazards over mere complaint volume.
    """
    query = db.query(Complaint).filter(Complaint.status != "Resolved")

    # Department officer isolation
    if authorization and authorization.startswith("Bearer "):
        try:
            payload = decode_access_token(authorization.split(" ")[1])
            if payload.get("sub_type") == "authority" and payload.get("role") != "admin":
                dept = payload.get("department")
                if dept:
                    query = query.filter(Complaint.department.ilike(f"%{dept}%"))
        except Exception:
            pass

    if department:
        query = query.filter(Complaint.department.ilike(f"%{department}%"))

    queue = query.order_by(Complaint.priority_score.desc(), Complaint.id.desc()).all()

    return [
        {
            "complaint_id": c.complaint_id,
            "issue": c.issue,
            "department": c.department,
            "severity": c.severity,
            "priority": "Urgent" if (c.severity or "").strip().capitalize() == "Critical" else (c.priority or "Medium"),
            "priority_score": c.priority_score,
            "description": c.approved_description or c.description,
            "location": c.location,
            "status": c.status,
            "date": c.date
        }
        for c in queue
    ]


@app.get("/analytics/department-summary")
def get_department_summary(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Provides departmental metrics, severity breakdown, and resolution rate."""
    complaints = db.query(Complaint).all()

    dept_stats: Dict[str, Any] = {}
    total_count = len(complaints)

    for c in complaints:
        dept = c.department or "General Civic Services"
        if dept not in dept_stats:
            dept_stats[dept] = {
                "department": dept,
                "total": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "submitted": 0,
                "in_progress": 0,
                "resolved": 0,
            }

        dept_stats[dept]["total"] += 1
        sev = (c.severity or "Medium").lower()
        if sev == "critical":
            dept_stats[dept]["critical"] += 1
        elif sev == "high":
            dept_stats[dept]["high"] += 1
        elif sev == "medium":
            dept_stats[dept]["medium"] += 1
        else:
            dept_stats[dept]["low"] += 1

        stat = (c.status or "Submitted").lower()
        if stat == "resolved":
            dept_stats[dept]["resolved"] += 1
        elif stat in ["in progress", "under review"]:
            dept_stats[dept]["in_progress"] += 1
        else:
            dept_stats[dept]["submitted"] += 1

    return {
        "total_complaints": total_count,
        "departments": list(dept_stats.values())
    }


# =============================================================
# NOTIFICATION ENDPOINTS
# =============================================================

@app.get("/notifications")
def get_notifications(
    authorization: Optional[str] = Header(None),
    email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve notifications for a citizen or authority."""
    query = db.query(Notification)

    if authorization and authorization.startswith("Bearer "):
        try:
            payload = decode_access_token(authorization.split(" ")[1])
            if payload.get("sub_type") == "citizen":
                user_email = payload.get("email")
                query = query.filter(Notification.recipient_email == user_email)
        except Exception:
            pass
    elif email:
        query = query.filter(Notification.recipient_email == email.strip().lower())

    notifs = query.order_by(Notification.id.desc()).limit(30).all()
    return [
        {
            "id": n.id,
            "complaint_id": n.complaint_id,
            "title": n.title,
            "message": n.message,
            "status": n.status,
            "created_at": n.created_at
        }
        for n in notifs
    ]


@app.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.status = "read"
    db.commit()
    return {"message": "Notification marked as read", "id": notification_id}
