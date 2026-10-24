from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, Notification
from auth_service import hash_password, create_access_token

client = TestClient(app)

def test_full_citizen_settings_and_support_suite():
    db = SessionLocal()
    email = "suite_test_citizen@civicroute.org"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name="Suite Test Citizen",
            email=email,
            phone="9876500000",
            location="East Zone Ward 3",
            hashed_password=hash_password("suitePass2026"),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.hashed_password = hash_password("suitePass2026")
        user.name = "Suite Test Citizen"
        user.phone = "9876500000"
        user.location = "East Zone Ward 3"
        db.commit()
        db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "sub_type": "citizen",
        "email": user.email,
        "name": user.name
    })

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Profile Retrieval
    res_me = client.get("/auth/citizen/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == email
    assert res_me.json()["name"] == "Suite Test Citizen"

    # 2. Profile Update
    res_up = client.put(
        "/auth/citizen/profile",
        headers=headers,
        json={
            "name": "Suite Updated Citizen",
            "phone": "9876511111",
            "location": "North Zone Ward 9"
        }
    )
    assert res_up.status_code == 200
    assert res_up.json()["citizen"]["name"] == "Suite Updated Citizen"
    assert res_up.json()["citizen"]["phone"] == "9876511111"
    assert res_up.json()["citizen"]["location"] == "North Zone Ward 9"

    # 3. Secure Password Change
    # 3a. Incorrect current password rejected
    res_wrong = client.post(
        "/auth/citizen/change-password",
        headers=headers,
        json={"current_password": "wrongOldPassword", "new_password": "newSecurePassword2026"}
    )
    assert res_wrong.status_code == 400

    # 3b. Short password rejected
    res_short = client.post(
        "/auth/citizen/change-password",
        headers=headers,
        json={"current_password": "suitePass2026", "new_password": "123"}
    )
    assert res_short.status_code == 400

    # 3c. Valid password update
    res_pwd = client.post(
        "/auth/citizen/change-password",
        headers=headers,
        json={"current_password": "suitePass2026", "new_password": "newSecurePassword2026"}
    )
    assert res_pwd.status_code == 200

    # 3d. Verify login with new password
    login_new = client.post("/auth/citizen/login", json={"login_id": email, "password": "newSecurePassword2026"})
    assert login_new.status_code == 200
    assert "token" in login_new.json()

    # 4. Support Desk API
    res_sup = client.get("/support/info")
    assert res_sup.status_code == 200
    assert "@" in res_sup.json()["support_email"]

    res_prob = client.post(
        "/support/report-problem",
        json={
            "category": "Camera Upload Issue",
            "description": "User experienced intermittent black frame when switching to rear camera.",
            "email": email,
            "page_url": "/report"
        }
    )
    assert res_prob.status_code == 200
    assert "report_id" in res_prob.json()

    db.close()
    print("SUCCESS: Complete Citizen Settings and Support Suite PASSED!")

if __name__ == "__main__":
    test_full_citizen_settings_and_support_suite()

