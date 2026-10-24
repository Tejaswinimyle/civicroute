import sys
import os
import sqlite3

sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app
from database import DB_PATH

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("CIVICROUTE FULL BACKEND TEST SUITE")
    print("=" * 60)

    # 1. Health check
    res = client.get("/")
    assert res.status_code == 200, res.text
    print("[1] Root health check: OK")

    # 2. Existing database records check
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cnt = cur.execute("SELECT count(*) FROM complaints;").fetchone()[0]
    conn.close()
    assert cnt >= 9, f"Existing complaint records must be >= 9, found {cnt}"
    print(f"[2] Existing database complaints preserved: {cnt} records found: OK")

    # 3. Citizen Registration & Login
    test_email = "test_citizen_2026@civicroute.org"
    # Try login first or register
    reg_res = client.post("/auth/citizen/register", json={
        "name": "Jane Citizen",
        "email": test_email,
        "phone": "9876543210",
        "location": "Ward 4, Green Park",
        "password": "Password@123"
    })
    if reg_res.status_code == 200:
        citizen_token = reg_res.json()["token"]
        print("[3] Citizen registration: OK")
    else:
        # already registered in previous run, login
        login_res = client.post("/auth/citizen/login", json={
            "login_id": test_email,
            "password": "Password@123"
        })
        assert login_res.status_code == 200, login_res.text
        citizen_token = login_res.json()["token"]
        print("[3] Citizen login (existing): OK")

    # Verify /auth/citizen/me
    me_res = client.get("/auth/citizen/me", headers={"Authorization": f"Bearer {citizen_token}"})
    assert me_res.status_code == 200, me_res.text
    assert me_res.json()["email"] == test_email
    print("[3b] Citizen profile me: OK")

    # 4. Authority Logins (Officers + Admin)
    officers = [
        ("water001", "water123", "Water & Sanitation"),
        ("roads001", "roads123", "Roads & Infrastructure"),
        ("san001", "san123", "Sanitation"),
        ("electricity001", "electricity123", "Electricity & Lighting"),
        ("drainage001", "drainage123", "Drainage & Public Works"),
        ("admin001", "admin123", "Central Administration"),
    ]
    tokens = {}
    for oid, pwd, dept in officers:
        ares = client.post("/auth/authority/login", json={"officer_id": oid, "password": pwd})
        assert ares.status_code == 200, f"Failed authority login for {oid}: {ares.text}"
        tokens[oid] = ares.json()["token"]
        assert ares.json()["authority"]["department"] == dept
    print(f"[4] Authority authentication for all 6 departments: OK")

    # 5. Deterministic AI Department Classification Safeguards
    # Critical test case from user prompt:
    # "Drain is blocked near our house and dirty water is coming onto the road. Nobody has cleaned it."
    # MUST route to Drainage & Public Works, NOT Roads!
    t1 = client.post("/analyze", json={
        "description": "Drain is blocked near our house and dirty water is coming onto the road. Nobody has cleaned it."
    })
    assert t1.status_code == 200, t1.text
    res1 = t1.json()["analysis"]
    assert res1["department"] == "Drainage & Public Works", f"Expected Drainage & Public Works, got {res1['department']}"
    print("[5a] Deterministic safeguard (Drainage with road mention -> Drainage & Public Works): OK")

    # Pothole test
    t2 = client.post("/analyze", json={"description": "Deep potholes on the main highway causing vehicle damage"})
    assert t2.json()["analysis"]["department"] == "Roads & Infrastructure"
    print("[5b] Road classification -> Roads & Infrastructure: OK")

    # Contaminated water
    t3 = client.post("/analyze", json={"description": "Contaminated drinking water coming from taps for 3 days"})
    assert t3.json()["analysis"]["department"] == "Water & Sanitation"
    assert t3.json()["analysis"]["severity"] == "Critical"
    print("[5c] Water contamination -> Water & Sanitation (Critical): OK")

    # Garbage
    t4 = client.post("/analyze", json={"description": "Overflowing garbage dump with rotting waste attracting flies"})
    assert t4.json()["analysis"]["department"] == "Sanitation"
    print("[5d] Garbage collection -> Sanitation: OK")

    # Streetlight
    t5 = client.post("/analyze", json={"description": "Streetlight not working on 5th cross road"})
    assert t5.json()["analysis"]["department"] == "Electricity & Lighting"
    print("[5e] Streetlight -> Electricity & Lighting: OK")

    # 6. Conversation clarifying engine
    c_res = client.post("/conversation", json={
        "description": "Drain is blocked and dirty water is overflowing",
        "location": "",
        "affected_people": "",
        "follow_up_answer": "Ward 7, Main Street",
        "missing_field": "location"
    })
    assert c_res.status_code == 200
    print("[6] Multi-turn conversation clarification: OK")

    # 7. Letter generation
    l_res = client.post("/generate-letter", json={
        "issue": "Drainage",
        "department": "Drainage & Public Works",
        "description": "Drain is blocked and dirty water is overflowing onto the street.",
        "location": "Ward 7, Main Street",
        "affected_people": "50 households",
        "severity": "Critical"
    })
    assert l_res.status_code == 200
    letter_text = l_res.json()["letter"]
    assert "Drainage & Public Works" in letter_text
    print("[7] Official complaint letter generation: OK")

    # 8. Submit complaint with both original AI letter and citizen-edited final letter
    edited_letter = letter_text.replace("A Concerned Citizen", "Jane Citizen (Verified Citizen)")
    sub_res = client.post("/complaints", json={
        "issue": "Drainage",
        "department": "Drainage & Public Works",
        "severity": "Critical",
        "priority": "Critical",
        "description": "Drain is blocked and dirty water is overflowing onto the street.",
        "rewritten_description": "A wastewater drain blockage has caused contaminated runoff to flood the street.",
        "approved_description": "A wastewater drain blockage has caused contaminated runoff to flood the street in Ward 7.",
        "location": "Ward 7, Main Street",
        "latitude": 17.445,
        "longitude": 78.465,
        "letter": letter_text,
        "final_letter": edited_letter,
        "citizen_name": "Jane Citizen",
        "citizen_email": test_email,
        "citizen_phone": "9876543210"
    }, headers={"Authorization": f"Bearer {citizen_token}"})

    assert sub_res.status_code == 200, sub_res.text
    created_id = sub_res.json()["complaint_id"]
    priority_score = sub_res.json()["priority_score"]
    assert priority_score >= 60.0, f"Critical drainage score should be >= 60, got {priority_score}"
    assert sub_res.json()["final_letter"] == edited_letter
    print(f"[8] Submit complaint with citizen edited final letter (ID: {created_id}, Score: {priority_score}): OK")

    # 9. Get complaint by ID and verify history & descriptions
    get_res = client.get(f"/complaints/{created_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["letter"] == letter_text
    assert detail["final_letter"] == edited_letter
    assert len(detail["history"]) >= 1
    assert detail["history"][0]["new_status"] == "Submitted"
    print("[9] Retrieve complaint with dual letter storage and status history: OK")

    # 10. Authority role-based isolation:
    # drainage officer can see it; roads officer cannot see it in department view
    drainage_list = client.get("/complaints", headers={"Authorization": f"Bearer {tokens['drainage001']}"}).json()
    roads_list = client.get("/complaints", headers={"Authorization": f"Bearer {tokens['roads001']}"}).json()
    assert any(c["complaint_id"] == created_id for c in drainage_list), "Drainage officer must see drainage complaint"
    assert not any(c["complaint_id"] == created_id for c in roads_list), "Roads officer must NOT see drainage complaint"
    print("[10] Department-based role isolation (drainage officer vs roads officer): OK")

    # 11. Central Admin sees all departments
    admin_list = client.get("/complaints", headers={"Authorization": f"Bearer {tokens['admin001']}"}).json()
    assert any(c["complaint_id"] == created_id for c in admin_list), "Admin must see complaints from all departments"
    print("[11] Central Admin multi-department visibility: OK")

    # 12. Status Update with audit history & notification
    status_update = client.put(
        f"/complaints/{created_id}/status",
        json={"status": "Under Review", "remarks": "Assigned junior engineer to inspect blocked sewer."},
        headers={"Authorization": f"Bearer {tokens['drainage001']}"}
    )
    assert status_update.status_code == 200, status_update.text
    assert status_update.json()["status"] == "Under Review"

    # Verify notification created
    notifs = client.get("/notifications", headers={"Authorization": f"Bearer {citizen_token}"}).json()
    assert any(n["complaint_id"] == created_id for n in notifs), "Citizen notification must be recorded"
    print("[12] Complaint status transition with audit trail & citizen notification: OK")

    # 13. Priority Queue: Critical health hazards appear higher than minor issues
    pq = client.get("/analytics/priority-queue").json()
    assert len(pq) > 0
    scores = [item["priority_score"] for item in pq]
    assert scores == sorted(scores, reverse=True), "Priority queue must be sorted descending by priority score"
    print("[13] Transparent intelligent priority queue ordering: OK")

    # 14. Department Analytics Summary
    summary = client.get("/analytics/department-summary").json()
    assert summary["total_complaints"] >= 10
    assert len(summary["departments"]) >= 1
    print("[14] Department analytics summary: OK")

    print("\n" + "=" * 60)
    print("ALL 14 BACKEND TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

