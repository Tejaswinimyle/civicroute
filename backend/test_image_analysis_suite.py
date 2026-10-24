import os
import sys
import base64
import unittest
from io import BytesIO
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app
import ai_service

class TestCivicRouteImageAnalysis(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # 1. Drainage image
        img_drain = Image.new("RGB", (200, 200), color=(40, 50, 40))
        draw = ImageDraw.Draw(img_drain)
        draw.rectangle([20, 50, 180, 150], fill=(20, 30, 20), outline=(100, 100, 80))
        draw.text((30, 80), "BLOCKED DRAIN & SEWAGE WATER", fill=(200, 200, 200))
        buf = BytesIO()
        img_drain.save(buf, format="JPEG")
        cls.drain_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

        # 2. Pothole image
        img_road = Image.new("RGB", (200, 200), color=(80, 80, 80))
        draw = ImageDraw.Draw(img_road)
        draw.ellipse([40, 40, 160, 160], fill=(30, 30, 30), outline=(200, 200, 200))
        draw.text((50, 90), "POTHOLE IN ROAD", fill=(255, 255, 255))
        buf = BytesIO()
        img_road.save(buf, format="JPEG")
        cls.road_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    def test_01_text_only_complaint(self):
        """Test that text-only complaints work and return proper response structure."""
        response = self.client.post("/analyze", json={
            "description": "The drain is blocked near my house and dirty sewage water is coming onto the road.",
            "image": ""
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        analysis = data["analysis"]
        self.assertEqual(analysis["department"], "Drainage & Public Works")
        self.assertEqual(analysis["issue"], "Drainage")
        self.assertIn(analysis["severity"], ["Critical", "High"])
        self.assertTrue(analysis["is_civic_issue"])
        print("[TEST 1 PASSED] Text-only complaint classified successfully.")

    def test_02_text_only_with_null_and_missing_fields(self):
        """Test that null image or missing image does not trigger HTTP 422."""
        response1 = self.client.post("/analyze", json={
            "description": "Deep pothole on main road causing accidents",
            "image": None
        })
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response1.json()["analysis"]["department"], "Roads & Infrastructure")

        response2 = self.client.post("/analyze", json={
            "description": "Streetlight not working"
        })
        self.assertEqual(response2.status_code, 200)
        self.assertEqual(response2.json()["analysis"]["department"], "Electricity & Lighting")
        print("[TEST 2 PASSED] Null/missing fields handled without 422.")

    def test_03_invalid_image_data_handling(self):
        """Test that invalid base64 or corrupted image strings never throw HTTP 500 or crash."""
        # A) Invalid base64 with text description
        response = self.client.post("/analyze", json={
            "description": "Sewage overflow on market street",
            "image": "data:image/jpeg;base64,not_valid_base64_%%@@!!"
        })
        self.assertEqual(response.status_code, 200)
        analysis = response.json()["analysis"]
        self.assertEqual(analysis["department"], "Drainage & Public Works")
        self.assertIn("notice", analysis)

        # B) Invalid base64 without text description
        response_no_text = self.client.post("/analyze", json={
            "description": "",
            "image": "not_base64_corrupt_data"
        })
        self.assertEqual(response_no_text.status_code, 200)
        analysis_no_text = response_no_text.json()["analysis"]
        self.assertFalse(analysis_no_text["is_civic_issue"])
        self.assertEqual(analysis_no_text["issue"], "Invalid Image")
        print("[TEST 3 PASSED] Invalid/corrupted images handled safely without HTTP 500.")

    def test_04_drainage_image_classification(self):
        """Test drainage classification with image and context."""
        response = self.client.post("/analyze", json={
            "description": "Dirty wastewater and blocked drain outside residence",
            "image": self.drain_b64
        })
        self.assertEqual(response.status_code, 200)
        analysis = response.json()["analysis"]
        self.assertEqual(analysis["department"], "Drainage & Public Works")
        self.assertTrue(any(w in analysis["issue"].lower() for w in ["drain", "sewage", "water"]))
        self.assertTrue(analysis["is_civic_issue"])
        print(f"[TEST 4 PASSED] Drainage classified to {analysis['department']} (Provider: {analysis.get('ai_provider')}).")

    def test_05_pothole_image_classification(self):
        """Test pothole/road damage classification."""
        response = self.client.post("/analyze", json={
            "description": "Large deep pothole on the road damaging vehicles",
            "image": self.road_b64
        })
        self.assertEqual(response.status_code, 200)
        analysis = response.json()["analysis"]
        self.assertEqual(analysis["department"], "Roads & Infrastructure")
        self.assertTrue(analysis["is_civic_issue"])
        print(f"[TEST 5 PASSED] Pothole classified to {analysis['department']} (Provider: {analysis.get('ai_provider')}).")

    def test_06_gemini_to_nvidia_to_python_fallback(self):
        """Verify the full fallback chain: Gemini -> NVIDIA -> Python Keyword Classifier."""
        orig_client = ai_service.client
        orig_nv_key = ai_service.NVIDIA_API_KEY

        try:
            # 1. Force Gemini failure by setting client to None -> NVIDIA should take over
            ai_service.client = None
            res_nvidia = ai_service.analyze_complaint_image(
                image_data=self.drain_b64,
                description="Dirty wastewater and blocked drain"
            )
            self.assertIn(res_nvidia.get("ai_provider"), ["NVIDIA Nemotron", "Python Fallback Classifier"])
            self.assertEqual(res_nvidia["department"], "Drainage & Public Works")
            print(f"[TEST 6a PASSED] Gemini failure successfully fell back to {res_nvidia.get('ai_provider')}.")

            # 2. Force both Gemini and NVIDIA failure with text -> Python keyword classifier should take over
            ai_service.NVIDIA_API_KEY = ""
            res_python = ai_service.analyze_complaint_image(
                image_data=self.drain_b64,
                description="Drain is blocked and water is overflowing"
            )
            self.assertEqual(res_python.get("ai_provider"), "Python Fallback Classifier")
            self.assertEqual(res_python["department"], "Drainage & Public Works")
            self.assertEqual(res_python["severity"], "Critical")
            print("[TEST 6b PASSED] Gemini+NVIDIA failure with text successfully fell back to Python Fallback Classifier.")

        finally:
            ai_service.client = orig_client
            ai_service.NVIDIA_API_KEY = orig_nv_key

    def test_07_photo_only_upload_when_both_ai_fail(self):
        """Verify that photo-only uploads never pretend the Python text classifier analyzed the image."""
        orig_client = ai_service.client
        orig_nv_key = ai_service.NVIDIA_API_KEY

        try:
            ai_service.client = None
            ai_service.NVIDIA_API_KEY = ""

            res = ai_service.analyze_complaint_image(
                image_data=self.drain_b64,
                description=""  # Photo-only upload
            )
            self.assertNotEqual(res.get("ai_provider"), "Python Fallback Classifier")
            self.assertEqual(res.get("ai_provider"), "None")
            self.assertFalse(res.get("is_civic_issue"))
            self.assertEqual(res.get("issue"), "AI Vision Unavailable")
            self.assertIn("temporarily unavailable", res.get("description", "").lower())
            print("[TEST 7 PASSED] Photo-only upload correctly reports temporary unavailability without pretending Python classified it.")

        finally:
            ai_service.client = orig_client
            ai_service.NVIDIA_API_KEY = orig_nv_key

    def test_08_gemini_timeout_and_transient_error_detection(self):
        """Verify 60-second Gemini timeout setting and transient error detection."""
        self.assertEqual(ai_service.GEMINI_TIMEOUT_MS, 60000)

        # Test transient error classifications
        e1 = Exception("504 DEADLINE_EXCEEDED")
        e2 = Exception("503 Service Unavailable")
        e3 = Exception("Read operation timed out")
        e4 = Exception("429 ResourceExhausted")
        e5 = Exception("400 Bad Request")

        self.assertTrue(ai_service.is_transient_error(e1))
        self.assertTrue(ai_service.is_transient_error(e2))
        self.assertTrue(ai_service.is_transient_error(e3))
        self.assertTrue(ai_service.is_transient_error(e4))
        self.assertFalse(ai_service.is_transient_error(e5))
        print("[TEST 8 PASSED] 60s timeout configured and transient error detector verified.")

    def test_09_log_sanitization(self):
        """Verify API keys are never leaked in log output."""
        sample_log = f"Error with key {ai_service.API_KEY} and nvapi-abc123xyz456"
        sanitized = ai_service.sanitize_log_message(sample_log)
        if ai_service.API_KEY:
            self.assertNotIn(ai_service.API_KEY, sanitized)
        self.assertNotIn("nvapi-abc123xyz456", sanitized)
        self.assertIn("[REDACTED", sanitized)
        print("[TEST 9 PASSED] Error log sanitization verified.")

    def test_10_complaint_rewriting(self):
        """Test that complaint rewriting functions properly."""
        rewritten = ai_service.rewrite_complaint("Water is coming out from the tubes near my house.")
        self.assertTrue(len(rewritten) > 10)
        self.assertIsInstance(rewritten, str)
        print(f"[TEST 10 PASSED] Complaint rewritten successfully: '{rewritten}'")

if __name__ == "__main__":
    unittest.main()
