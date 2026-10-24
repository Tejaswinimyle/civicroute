from sqlalchemy import Column, Integer, String, Text, Float, Boolean
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(String, nullable=True)


class Authority(Base):
    __tablename__ = "authorities"

    id = Column(Integer, primary_key=True, index=True)
    officer_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    role = Column(String, default="department_officer")
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(String, nullable=True)


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String, unique=True, index=True, nullable=False)

    # Citizen relation
    citizen_id = Column(Integer, nullable=True)
    citizen_name = Column(String, nullable=True)
    citizen_email = Column(String, nullable=True)
    citizen_phone = Column(String, nullable=True)

    # Classification
    issue = Column(String)
    department = Column(String)

    # Urgency & Priority Assessment
    severity = Column(String)
    priority = Column(String)
    priority_score = Column(Float, default=0.0)

    # Description stages
    description = Column(Text)  # Original citizen description
    rewritten_description = Column(Text, nullable=True)  # AI-improved description
    approved_description = Column(Text, nullable=True)  # Citizen-approved final description

    # Location & GPS
    location = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Letter stages
    letter = Column(Text)  # Original AI generated letter
    final_letter = Column(Text, nullable=True)  # Citizen edited and approved final letter

    # Evidence
    image = Column(Text, nullable=True)

    # Status & Audit
    status = Column(String, default="Submitted")
    date = Column(String)
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)


class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String, index=True, nullable=False)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    updated_by = Column(String, nullable=False)
    remarks = Column(Text, nullable=True)
    timestamp = Column(String, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String, nullable=True)
    recipient_role = Column(String, default="citizen")  # citizen | authority
    complaint_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="unread")  # unread | read
    created_at = Column(String, nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(String, nullable=False)  # "citizen" or "authority"
    user_id = Column(Integer, nullable=True)
    identifier = Column(String, nullable=False, index=True)  # email or officer_id
    token_hash = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(String, nullable=False)
    expires_at = Column(String, nullable=False)
    used = Column(Boolean, default=False)

