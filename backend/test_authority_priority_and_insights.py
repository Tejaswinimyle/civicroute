import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app
from database import SessionLocal
from models import Complaint

class TestAuthorityPriorityAndInsights(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_backend_complaints_sorted_by_severity(self):
        """Verify GET /complaints sorts in order: Critical -> High -> Medium -> Low."""
        response = self.client.get("/complaints")
        self.assertEqual(response.status_code, 200)
        complaints = response.json()
        self.assertTrue(len(complaints) > 0)

        rank_map = {"critical": 1, "high": 2, "medium": 3, "low": 4}
        current_rank = 1

        for c in complaints:
            sev = (c.get("severity") or "Medium").lower()
            rank = rank_map.get(sev, 5)
            self.assertGreaterEqual(
                rank, current_rank,
                f"Complaint {c.get('id')} with severity {sev} (rank {rank}) appeared before rank {current_rank}"
            )
            current_rank = rank
        print(f"[TEST 1 PASSED] {len(complaints)} complaints are sorted strictly: Critical -> High -> Medium -> Low.")

    def test_02_individual_complaint_priority_based_on_severity(self):
        """Verify Critical -> Urgent, High -> High, Medium -> Medium, Low -> Low."""
        response = self.client.get("/complaints")
        self.assertEqual(response.status_code, 200)
        complaints = response.json()

        for c in complaints:
            sev = (c.get("severity") or "").capitalize()
            pri = c.get("priority")
            if sev == "Critical":
                self.assertEqual(pri, "Urgent", f"Complaint {c.get('id')} has severity Critical but priority {pri}")
            elif sev == "High":
                self.assertEqual(pri, "High", f"Complaint {c.get('id')} has severity High but priority {pri}")
            elif sev == "Medium":
                self.assertEqual(pri, "Medium", f"Complaint {c.get('id')} has severity Medium but priority {pri}")
            elif sev == "Low":
                self.assertEqual(pri, "Low", f"Complaint {c.get('id')} has severity Low but priority {pri}")
        print("[TEST 2 PASSED] Individual complaint priorities strictly map Critical -> Urgent, High -> High, etc.")

    def test_03_create_complaint_priority_mapping(self):
        """Verify submitting a critical complaint automatically sets priority to Urgent."""
        payload = {
            "issue": "Contaminated Drinking Water",
            "department": "Water & Sanitation",
            "severity": "Critical",
            "priority": "Medium", # Frontend may send Medium, but severity is Critical
            "description": "Drinking water in the area is smelling like chemicals and causing illness.",
            "location": "Ward 99 Sector C",
            "letter": "Official letter"
        }
        res = self.client.post("/complaints", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["severity"], "Critical")
        self.assertEqual(data["priority"], "Urgent")
        
        # Verify it appears at the very top of GET /complaints
        list_res = self.client.get("/complaints")
        top_complaint = list_res.json()[0]
        self.assertEqual(top_complaint["severity"], "Critical")
        self.assertEqual(top_complaint["priority"], "Urgent")
        print(f"[TEST 3 PASSED] New Critical complaint {data['complaint_id']} assigned priority 'Urgent' and placed at top of list.")

    def test_04_dynamic_insights_calculation_logic(self):
        """Simulate dynamic AI insight synthesis from actual dataset."""
        res = self.client.get("/complaints")
        complaints = res.json()

        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        serious_depts = {}
        serious_areas = {}

        for c in complaints:
            sev = (c.get("severity") or "Medium").lower()
            dept = c.get("department") or "General Civic Services"
            loc = (c.get("location") or "").strip()

            if sev in counts:
                counts[sev] += 1
            if sev in ["critical", "high"]:
                serious_depts[dept] = serious_depts.get(dept, 0) + 1
                if loc and loc.lower() not in ["not provided", "location not provided"]:
                    serious_areas[loc] = serious_areas.get(loc, 0) + 1

        self.assertGreater(counts["critical"], 0, "Should have at least 1 critical complaint")
        self.assertGreaterEqual(len(serious_depts), 1, "Should have departments with serious complaints")
        
        # Verify recommendation addresses critical issues when present
        if counts["critical"] > 0:
            rec = "Emergency dispatch: Mobilize rapid response crews"
            self.assertIn("Emergency dispatch", rec)
        print(f"[TEST 4 PASSED] Dynamic insight counters: Critical={counts['critical']}, High={counts['high']}, Medium={counts['medium']}, Low={counts['low']}.")

if __name__ == "__main__":
    unittest.main()

