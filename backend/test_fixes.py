"""
Integration test for CivicRoute fixes:
1. Follow-up conversation with follow_up_answer + missing_field forwarding
2. Image analysis with client-null guard
3. /analyze endpoint error handling
"""
import sys
import os
import base64

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_text_analysis():
    """Test 1: Basic text analysis still works."""
    print("--- TEST 1: Text-only analysis ---")
    response = client.post("/analyze", json={
        "description": "There is garbage piled up near the market for weeks",
        "image": ""
    })
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "analysis" in data
    analysis = data["analysis"]
    print(f"  Issue: {analysis['issue']}")
    print(f"  Department: {analysis['department']}")
    print(f"  Severity: {analysis['severity']}")
    assert analysis["issue"] != "", "Issue should not be empty"
    print("  PASSED ✓")


def test_conversation_initial():
    """Test 2: Initial conversation asks for location when missing."""
    print("\n--- TEST 2: Initial conversation (no location) ---")
    response = client.post("/conversation", json={
        "description": "Garbage piled up near the market",
        "location": "",
        "affected_people": "",
        "follow_up_answer": "",
        "missing_field": ""
    })
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    print(f"  Complete: {data.get('complete')}")
    print(f"  Question: {data.get('question', '')[:80]}")
    print(f"  Missing field: {data.get('missing_field')}")
    assert data.get("complete") == False, "Should not be complete without location"
    assert data.get("question"), "Should have a question"
    print("  PASSED ✓")


def test_conversation_with_follow_up_location():
    """Test 3: Follow-up answer for location is applied correctly."""
    print("\n--- TEST 3: Follow-up answer (location) ---")
    response = client.post("/conversation", json={
        "description": "Garbage piled up near the market",
        "location": "",
        "affected_people": "",
        "follow_up_answer": "Sector 15, Chandigarh",
        "missing_field": "location"
    })
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    print(f"  Complete: {data.get('complete')}")
    print(f"  Question: {data.get('question', '')[:80]}")
    print(f"  Missing field: {data.get('missing_field')}")
    # Location was provided via follow_up_answer, so it should either
    # ask about affected_people or be complete
    if not data.get("complete"):
        assert data.get("missing_field") != "location", \
            "Should not ask for location again after it was provided"
    print("  PASSED ✓")


def test_conversation_all_provided():
    """Test 4: When all info is provided, conversation is complete."""
    print("\n--- TEST 4: All info provided ---")
    response = client.post("/conversation", json={
        "description": "Garbage piled up near the market",
        "location": "Sector 15, Chandigarh",
        "affected_people": "About 200 households",
        "follow_up_answer": "",
        "missing_field": ""
    })
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    print(f"  Complete: {data.get('complete')}")
    assert data.get("complete") == True, "Should be complete when all info is provided"
    print("  PASSED ✓")


def test_image_analysis_with_tiny_image():
    """Test 5: Image analysis handles a small valid image."""
    print("\n--- TEST 5: Image analysis (tiny image) ---")
    # Create a minimal 1x1 red pixel PNG
    import struct, zlib
    def make_tiny_png():
        signature = b'\x89PNG\r\n\x1a\n'
        ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
        ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
        ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
        raw = b'\x00\xff\x00\x00'  # filter byte + RGB
        idat_data = zlib.compress(raw)
        idat_crc = zlib.crc32(b'IDAT' + idat_data) & 0xffffffff
        idat = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data + struct.pack('>I', idat_crc)
        iend_crc = zlib.crc32(b'IEND') & 0xffffffff
        iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
        return signature + ihdr + idat + iend

    png_bytes = make_tiny_png()
    b64 = base64.b64encode(png_bytes).decode()
    data_url = f"data:image/png;base64,{b64}"

    response = client.post("/analyze", json={
        "description": "Garbage dump near the road",
        "image": data_url
    })
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "analysis" in data, "Should have analysis in response"
    analysis = data["analysis"]
    print(f"  Issue: {analysis.get('issue')}")
    print(f"  Department: {analysis.get('department')}")
    print(f"  Confidence: {analysis.get('confidence', 'N/A')}")
    print(f"  Notice: {analysis.get('notice', 'None')}")
    # Even if image analysis fails (no API key), it should fall back gracefully
    assert analysis.get("issue"), "Should have an issue"
    assert analysis.get("department"), "Should have a department"
    print("  PASSED ✓")


def test_analyze_empty_request():
    """Test 6: Empty analysis request should not crash."""
    print("\n--- TEST 6: Empty analysis request ---")
    response = client.post("/analyze", json={
        "description": "",
        "image": ""
    })
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "analysis" in data
    print(f"  Issue: {data['analysis']['issue']}")
    print("  PASSED ✓")


def test_conversation_follow_up_affected_people():
    """Test 7: Full conversation flow — location then affected_people."""
    print("\n--- TEST 7: Full conversation flow ---")

    # Step 1: Initial — no location
    r1 = client.post("/conversation", json={
        "description": "Broken streetlight on the main road causing safety issues at night",
        "location": "",
        "affected_people": "",
        "follow_up_answer": "",
        "missing_field": ""
    })
    d1 = r1.json()
    print(f"  Step 1 - Complete: {d1.get('complete')}, Field: {d1.get('missing_field')}")
    assert d1.get("complete") == False

    # Step 2: Provide location via follow-up
    r2 = client.post("/conversation", json={
        "description": "Broken streetlight on the main road causing safety issues at night",
        "location": "",
        "affected_people": "",
        "follow_up_answer": "MG Road, near the bus stop",
        "missing_field": "location"
    })
    d2 = r2.json()
    print(f"  Step 2 - Complete: {d2.get('complete')}, Field: {d2.get('missing_field')}")

    # Step 3: Provide affected people
    r3 = client.post("/conversation", json={
        "description": "Broken streetlight on the main road causing safety issues at night",
        "location": "MG Road, near the bus stop",
        "affected_people": "",
        "follow_up_answer": "About 500 people use this road daily",
        "missing_field": "affected_people"
    })
    d3 = r3.json()
    print(f"  Step 3 - Complete: {d3.get('complete')}, Field: {d3.get('missing_field')}")
    assert d3.get("complete") == True, "Should be complete after providing all info"
    print("  PASSED ✓")


if __name__ == "__main__":
    print("=" * 60)
    print("CivicRoute Integration Tests")
    print("=" * 60)

    test_text_analysis()
    test_conversation_initial()
    test_conversation_with_follow_up_location()
    test_conversation_all_provided()
    test_image_analysis_with_tiny_image()
    test_analyze_empty_request()
    test_conversation_follow_up_affected_people()

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
