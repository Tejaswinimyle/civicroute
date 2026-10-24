from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, Authority, Complaint, PasswordResetToken
from auth_service import hash_password, create_access_token

client = TestClient(app)

def test_smtp_status_endpoint():
    res = client.get("/auth/smtp-status")
    assert res.status_code == 200
    data = res.json()
    assert "configured" in data
    assert "missing_vars" in data

def test_forgot_and_reset_password_workflow():
    db = SessionLocal()
    # Create or ensure test user exists
    test_email = "test_reset_citizen@civicroute.org"
    user = db.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            name="Test Reset Citizen",
            email=test_email,
            phone="9876543210",
            location="Ward 5",
            hashed_password=hash_password("oldpassword123"),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 1. Request forgot password
    res = client.post("/auth/forgot-password", json={"identifier": test_email, "role": "citizen"})
    assert res.status_code == 200
    data = res.json()
    assert data["user_type"] == "citizen"
    assert data["identifier"] == test_email
    assert "dev_reset_token" in data
    raw_token = data["dev_reset_token"]
    assert len(raw_token) > 10

    # Ensure token stored in DB is hashed and unused
    token_entry = db.query(PasswordResetToken).filter(PasswordResetToken.identifier == test_email).order_by(PasswordResetToken.id.desc()).first()
    assert token_entry is not None
    assert token_entry.used is False
    assert token_entry.token_hash != raw_token  # Must be hashed!

    # 2. Verify token endpoint
    verify_res = client.post("/auth/verify-reset-token", json={"token": raw_token})
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is True

    # Invalid token check
    invalid_res = client.post("/auth/verify-reset-token", json={"token": "invalid_random_token"})
    assert invalid_res.status_code == 400

    # 3. Reset password
    new_pass = "newSecurePass2026!"
    reset_res = client.post("/auth/reset-password", json={"token": raw_token, "new_password": new_pass})
    assert reset_res.status_code == 200

    # 4. Attempt to reuse the same token must fail (single-use token)
    reuse_res = client.post("/auth/reset-password", json={"token": raw_token, "new_password": "anotherPass123"})
    assert reuse_res.status_code == 400

    # 5. Log in with the new password
    login_res = client.post("/auth/citizen/login", json={"login_id": test_email, "password": new_pass})
    assert login_res.status_code == 200
    assert "token" in login_res.json()

    # Old password should no longer work
    old_login_res = client.post("/auth/citizen/login", json={"login_id": test_email, "password": "oldpassword123"})
    assert old_login_res.status_code == 401

    db.close()


def test_complaint_citizen_id_association_and_privacy():
    db = SessionLocal()
    test_email = "citizen_privacy_test@civicroute.org"
    user = db.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            name="John Privacy Doe",
            email=test_email,
            phone="9123456789",
            location="Green Valley",
            hashed_password=hash_password("pass123"),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    citizen_token = create_access_token({
        "sub": str(user.id),
        "sub_type": "citizen",
        "email": user.email,
        "name": user.name
    })

    # Submit complaint with citizen token
    complaint_data = {
        "issue": "Water Contamination",
        "department": "Water & Sanitation",
        "severity": "Critical",
        "priority": "Urgent",
        "description": "Tap water is coming out discolored with chemical smell.",
        "location": "Green Valley Sector 4"
    }

    create_res = client.post(
        "/complaints",
        json=complaint_data,
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert create_res.status_code == 200
    c_id = create_res.json()["complaint_id"]

    # Verify that in DB, citizen_id, name, email, phone are correctly linked
    db_c = db.query(Complaint).filter(Complaint.complaint_id == c_id).first()
    assert db_c.citizen_id == user.id
    assert db_c.citizen_name == user.name
    assert db_c.citizen_email == user.email
    assert db_c.citizen_phone == user.phone

    # 1. UNFAIR/PUBLIC ACCESS: Unauthenticated GET /complaints/{id} should REDACT citizen contact info
    public_res = client.get(f"/complaints/{c_id}")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["citizen_id"] is None
    assert pub_data["citizen_name"] is None
    assert pub_data["citizen_email"] is None
    assert pub_data["citizen_phone"] is None

    # 2. AUTHORIZED WATER OFFICER: Can see complainant details
    water_token = create_access_token({
        "sub": "101",
        "sub_type": "authority",
        "officer_id": "water001",
        "department": "Water & Sanitation",
        "role": "department_officer",
        "name": "Water Officer"
    })
    officer_res = client.get(f"/complaints/{c_id}", headers={"Authorization": f"Bearer {water_token}"})
    assert officer_res.status_code == 200
    off_data = officer_res.json()
    assert off_data["citizen_id"] == user.id
    assert off_data["citizen_name"] == user.name
    assert off_data["citizen_email"] == user.email
    assert off_data["citizen_phone"] == user.phone

    # 3. ROADS OFFICER (Different Department): Complainant info redacted
    roads_token = create_access_token({
        "sub": "102",
        "sub_type": "authority",
        "officer_id": "roads001",
        "department": "Roads & Infrastructure",
        "role": "department_officer",
        "name": "Roads Officer"
    })
    roads_res = client.get(f"/complaints/{c_id}", headers={"Authorization": f"Bearer {roads_token}"})
    assert roads_res.status_code == 200
    roads_data = roads_res.json()
    assert roads_data["citizen_name"] is None
    assert roads_data["citizen_email"] is None

    # 4. CENTRAL ADMIN: Can see complainant details
    admin_token = create_access_token({
        "sub": "999",
        "sub_type": "authority",
        "officer_id": "admin001",
        "department": "Central Administration",
        "role": "admin",
        "name": "Central Administrator"
    })
    admin_res = client.get(f"/complaints/{c_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_res.status_code == 200
    adm_data = admin_res.json()
    assert adm_data["citizen_id"] == user.id
    assert adm_data["citizen_name"] == user.name
    assert adm_data["citizen_phone"] == user.phone

    db.close()

if __name__ == "__main__":
    test_smtp_status_endpoint()
    test_forgot_and_reset_password_workflow()
    test_complaint_citizen_id_association_and_privacy()
    print("All backend tests PASSED successfully!")
