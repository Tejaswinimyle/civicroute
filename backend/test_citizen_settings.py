from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, Notification
from auth_service import hash_password, create_access_token

client = TestClient(app)

def test_citizen_profile_update_and_change_password():
    db = SessionLocal()
    test_email = "settings_test_citizen@civicroute.org"
    user = db.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            name="Initial Citizen Name",
            email=test_email,
            phone="9988776655",
            location="Downtown Ward 1",
            hashed_password=hash_password("initPass123"),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.hashed_password = hash_password("initPass123")
        user.name = "Initial Citizen Name"
        db.commit()
        db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "sub_type": "citizen",
        "email": user.email,
        "name": user.name
    })

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch profile
    me_res = client.get("/auth/citizen/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == test_email
    assert me_data["name"] == user.name

    # 2. Update editable profile info (name, phone, location)
    update_res = client.put(
        "/auth/citizen/profile",
        headers=headers,
        json={
            "name": "Updated Citizen Name",
            "phone": "9999988888",
            "location": "Uptown Ward 4"
        }
    )
    assert update_res.status_code == 200
    up_data = update_res.json()
    assert up_data["citizen"]["name"] == "Updated Citizen Name"
    assert up_data["citizen"]["phone"] == "9999988888"
    assert up_data["citizen"]["location"] == "Uptown Ward 4"

    # Verify DB has updated values
    db.refresh(user)
    assert user.name == "Updated Citizen Name"
    assert user.phone == "9999988888"
    assert user.location == "Uptown Ward 4"

    # 3. Change password with incorrect current password -> should fail
    wrong_pwd_res = client.post(
        "/auth/citizen/change-password",
        headers=headers,
        json={
            "current_password": "WrongPassword!",
            "new_password": "newSecurePassword2026"
        }
    )
    assert wrong_pwd_res.status_code == 400
    assert "incorrect" in wrong_pwd_res.json()["detail"].lower()

    # 4. Change password with short new password -> should fail
    short_pwd_res = client.post(
        "/auth/citizen/change-password",
        headers=headers,
        json={
            "current_password": "initPass123",
            "new_password": "123"
        }
    )
    assert short_pwd_res.status_code == 400
    assert "at least 6" in short_pwd_res.json()["detail"].lower()

    # 5. Change password successfully
    success_pwd_res = client.post(
        "/auth/citizen/change-password",
        headers=headers,
        json={
            "current_password": "initPass123",
            "new_password": "newSecurePassword2026"
        }
    )
    assert success_pwd_res.status_code == 200

    # 6. Verify login works with new password and fails with old
    login_new = client.post("/auth/citizen/login", json={"login_id": test_email, "password": "newSecurePassword2026"})
    assert login_new.status_code == 200

    login_old = client.post("/auth/citizen/login", json={"login_id": test_email, "password": "initPass123"})
    assert login_old.status_code == 401

    # 7. Support info
    support_res = client.get("/support/info")
    assert support_res.status_code == 200
    assert "support_email" in support_res.json()

    # 8. Report a problem
    prob_res = client.post(
        "/support/report-problem",
        json={
            "category": "Bug Report",
            "description": "Camera modal closed unexpectedly on low memory device.",
            "email": test_email,
            "page_url": "/report"
        }
    )
    assert prob_res.status_code == 200
    assert "report_id" in prob_res.json()

    db.close()
    print("ALL CITIZEN SETTINGS & SUPPORT BACKEND TESTS PASSED!")

if __name__ == "__main__":
    test_citizen_profile_update_and_change_password()

