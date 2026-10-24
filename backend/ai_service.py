import os
import json
import base64
import re
import time
from io import BytesIO
from dotenv import load_dotenv
from PIL import Image as PilImage
from google import genai
from google.genai import types
import requests
import traceback

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH, override=True)
load_dotenv(override=True)

GEMINI_MODEL = "gemini-3.1-flash-lite"
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
raw_nvidia = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_API_KEY = raw_nvidia.replace("Bearer ", "").strip()
NVIDIA_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# 60-second timeout for primary Gemini AI
GEMINI_TIMEOUT_MS = 60000

client = None
if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY, http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS))
    except Exception as e:
        print("[AI Service] Warning: Failed to initialize Gemini client:", e)


def sanitize_log_message(msg: str) -> str:
    """Strip any API key or secret from log messages."""
    text = str(msg)
    if API_KEY and len(API_KEY) > 6:
        text = text.replace(API_KEY, "[REDACTED_GEMINI_KEY]")
    if NVIDIA_API_KEY and len(NVIDIA_API_KEY) > 6:
        text = text.replace(NVIDIA_API_KEY, "[REDACTED_NVIDIA_KEY]")
    if raw_nvidia and len(raw_nvidia) > 6:
        text = text.replace(raw_nvidia, "[REDACTED_NVIDIA_KEY]")
    text = re.sub(r"nvapi-[A-Za-z0-9_-]+", "[REDACTED_NVIDIA_KEY]", text)
    return text


def is_transient_error(e: Exception) -> bool:
    """Identify temporary errors eligible for a controlled retry (429, 503, 504, timeouts)."""
    err_str = str(e).lower()
    err_name = type(e).__name__.lower()
    transient_indicators = [
        "429", "503", "504", "deadline_exceeded", "timeout", "timed out",
        "resourceexhausted", "unavailable", "service unavailable",
        "read operation timed out", "connection reset", "econnreset"
    ]
    if any(ind in err_str for ind in transient_indicators) or any(ind in err_name for ind in ["timeout", "deadline"]):
        return True
    if hasattr(e, "response") and hasattr(e.response, "status_code"):
        if e.response.status_code in [429, 503, 504]:
            return True
    if hasattr(e, "code") and e.code in [429, 503, 504]:
        return True
    return False


def analyze_complaint(description: str):
    """
    Deterministic rule-based civic complaint classification engine with safeguards:
    - Primary issue classification (Drainage/Sewage takes precedence over road mentions)
    - Department mapping strictly aligned with authority accounts
    - Initial severity and priority assessment
    """
    text = description.lower()

    # 1. DRAINAGE & PUBLIC WORKS (Priority safeguard: sewage/drain on a road goes to Drainage)
    drainage_keywords = [
        "drain", "drainage", "blocked drain", "open drain", "overflowing drain",
        "sewage", "sewer", "sewage overflow", "waterlogging", "manhole",
        "stagnant water", "dirty water", "gutter", "wastewater"
    ]
    if any(k in text for k in drainage_keywords):
        issue = "Drainage"
        department = "Drainage & Public Works"
        if any(word in text for word in [
            "sewage overflow", "flooding", "waterlogging", "dangerous",
            "health hazard", "exposed manhole", "overflowing", "dirty water"
        ]):
            severity = "Critical"
        else:
            severity = "High"

    # 2. WATER SUPPLY / WATER & SANITATION
    elif any(k in text for k in [
        "no water", "water supply", "water shortage", "drinking water",
        "water pipe", "pipeline leak", "pipe leak", "contaminated water",
        "water contamination", "unsafe water"
    ]) or (
        "water" in text and not any(k in text for k in ["rainwater", "road"])
    ):
        issue = "Water Supply"
        department = "Water & Sanitation"
        if any(word in text for word in [
            "contaminated", "unsafe water", "no water for", "three days",
            "3 days", "4 days", "5 days", "week", "poison"
        ]):
            severity = "Critical"
        else:
            severity = "High"

    # 3. ELECTRICITY & LIGHTING
    elif any(k in text for k in [
        "streetlight", "street light", "street lamp", "light not working",
        "electricity", "power cut", "power outage", "no power", "transformer",
        "electric pole", "electric wire", "voltage", "live wire", "hanging wire",
        "sparking", "short circuit"
    ]):
        if any(k in text for k in ["streetlight", "street light", "street lamp", "light not working"]):
            issue = "Streetlight"
            department = "Electricity & Lighting"
            severity = "Medium"
        else:
            issue = "Electricity Supply"
            department = "Electricity & Lighting"
            if any(k in text for k in ["live wire", "hanging wire", "sparking", "fire", "dangerous"]):
                severity = "Critical"
            else:
                severity = "High"

    # 4. SANITATION (GARBAGE & SOLID WASTE)
    elif any(k in text for k in [
        "garbage", "waste", "trash", "rubbish", "garbage collection",
        "dustbin", "dump", "debris", "litter", "uncollected"
    ]):
        issue = "Garbage Collection"
        department = "Sanitation"
        if any(word in text for word in [
            "rotting", "health", "disease", "overflowing", "infestation", "stink"
        ]):
            severity = "High"
        else:
            severity = "Medium"

    # 5. ROADS & INFRASTRUCTURE
    elif any(k in text for k in [
        "pothole", "potholes", "damaged road", "broken road", "road damage",
        "footpath", "pavement", "broken footpath", "road crack", "speed breaker"
    ]):
        issue = "Road Damage"
        department = "Roads & Infrastructure"
        if any(word in text for word in [
            "accident", "dangerous", "major", "deep pothole", "multiple accidents"
        ]):
            severity = "High"
        else:
            severity = "Medium"

    # 6. GENERAL CIVIC SERVICES (UNKNOWN)
    else:
        issue = "Civic Issue"
        department = "General Civic Services"
        severity = "Medium"

    if severity == "Critical":
        priority = "Critical"
    elif severity == "High":
        priority = "High"
    elif severity == "Medium":
        priority = "Medium"
    else:
        priority = "Low"

    return {
        "issue": issue,
        "department": department,
        "severity": severity,
        "priority": priority
    }


def parse_image_data(image_data: str):
    """
    Parses a base64 string or data URL into (bytes, mime_type).
    Validates base64 encoding and verifies the image using Pillow.
    """
    if not image_data or not isinstance(image_data, str):
        raise ValueError("Image data is empty or invalid type.")

    image_str = image_data.strip()
    mime_type = "image/jpeg"

    if "," in image_str:
        header, b64_str = image_str.split(",", 1)
        mime_match = re.search(r"data:([^;]+);base64", header, re.IGNORECASE)
        if mime_match:
            mime_type = mime_match.group(1).lower().strip()
    else:
        b64_str = image_str

    # Clean base64 string: remove all whitespace, newlines, and fix URL-encoded spaces
    b64_str = re.sub(r"\s+", "", b64_str).replace(" ", "+")

    # Fix padding if missing
    missing_padding = len(b64_str) % 4
    if missing_padding:
        b64_str += "=" * (4 - missing_padding)

    try:
        image_bytes = base64.b64decode(b64_str, validate=False)
    except Exception as e:
        raise ValueError(f"Invalid base64-encoded image string: {e}")

    if not image_bytes or len(image_bytes) < 12:
        raise ValueError("Decoded image data is too small to be a valid image file.")

    # Validate image format using PIL
    try:
        with PilImage.open(BytesIO(image_bytes)) as pil_img:
            pil_img.verify()
            detected_format = (pil_img.format or "").lower()
            if detected_format in ["jpeg", "jpg"]:
                mime_type = "image/jpeg"
            elif detected_format in ["png", "webp", "gif", "bmp"]:
                mime_type = f"image/{detected_format}"
    except Exception as e:
        raise ValueError(f"Decoded data is not a valid image format: {e}")

    return image_bytes, mime_type


def analyze_with_nvidia(image_bytes: bytes, mime_type: str, prompt: str):
    """
    NVIDIA Nemotron vision backup via OpenAI-compatible API with controlled retry for 429/503/504/timeouts.
    """
    if not NVIDIA_API_KEY:
        raise RuntimeError("NVIDIA_API_KEY is not configured.")

    clean_b64 = base64.b64encode(image_bytes).decode("utf-8")
    clean_data_url = f"data:{mime_type};base64,{clean_b64}"

    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": clean_data_url}
                    }
                ]
            }
        ],
        "max_tokens": 1024,
        "temperature": 0.2,
        "stream": False
    }

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    for attempt in range(1, 3):
        try:
            print(f"[AI Service] Calling NVIDIA Nemotron API (attempt {attempt}/2)...")
            response = requests.post(
                NVIDIA_URL,
                headers=headers,
                json=payload,
                timeout=30
            )

            # Retry on transient HTTP status codes (429, 503, 504)
            if response.status_code in [429, 503, 504]:
                if attempt == 1:
                    print(f"[AI Service] NVIDIA returned transient HTTP {response.status_code}. Retrying in 2 seconds (attempt 2/2)...")
                    time.sleep(2.0)
                    continue
                else:
                    response.raise_for_status()

            response.raise_for_status()

            data = response.json()
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("NVIDIA returned no choices in response.")

            content = choices[0].get("message", {}).get("content", "")
            if not content:
                raise RuntimeError("NVIDIA returned an empty response.")

            content = content.strip()
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))

            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)
            return json.loads(content)

        except requests.exceptions.Timeout as e:
            err_msg = sanitize_log_message(f"Timeout: {e}")
            print(f"[AI Service] NVIDIA request timed out on attempt {attempt}: {err_msg}")
            if attempt == 1:
                print("[AI Service] Retrying NVIDIA request in 2 seconds (attempt 2/2)...")
                time.sleep(2.0)
                continue
            raise
        except Exception as e:
            err_msg = sanitize_log_message(f"{type(e).__name__}: {str(e)[:150]}")
            if attempt == 1 and is_transient_error(e):
                print(f"[AI Service] NVIDIA transient error on attempt {attempt}: {err_msg}. Retrying in 2 seconds (attempt 2/2)...")
                time.sleep(2.0)
                continue
            raise


def analyze_complaint_image(image_data: str, description: str = ""):
    """
    CivicRoute multimodal analyzer with fallback chain:
    1. Gemini (gemini-3.1-flash-lite) primary (60s timeout, 1 retry for transient errors)
    2. NVIDIA Nemotron (nvidia/nemotron-3-nano-omni-30b-a3b-reasoning) backup (1 retry for transient errors)
    3. Python keyword rule classifier fallback (for text) / clear temporary-unavailability message (for photo-only)
    """
    has_image = bool(image_data and image_data.strip())
    desc_clean = description.strip() if description else ""

    print(f"[AI Service] analyze_complaint_image called - has_image: {has_image}, desc_len: {len(desc_clean)}")

    if not has_image:
        if desc_clean:
            base_res = analyze_complaint(desc_clean)
            return {
                **base_res,
                "description": desc_clean,
                "confidence": "Medium",
                "is_civic_issue": True,
                "ai_provider": "Keyword Classifier"
            }

        return {
            "issue": "Civic Issue",
            "department": "General Civic Services",
            "severity": "Medium",
            "priority": "Medium",
            "description": "No complaint description or image provided.",
            "confidence": "Low",
            "is_civic_issue": False,
            "ai_provider": "None"
        }

    try:
        image_bytes, mime_type = parse_image_data(image_data)
        print(f"[AI Service] Image parsed successfully - bytes: {len(image_bytes)}, detected MIME: {mime_type}")
    except Exception as e:
        err_msg = sanitize_log_message(f"{type(e).__name__}: {str(e)[:150]}")
        print(f"[AI Service] Image decoding error: {err_msg}")
        if desc_clean:
            base_res = analyze_complaint(desc_clean)
            return {
                **base_res,
                "description": desc_clean,
                "confidence": "Medium",
                "is_civic_issue": True,
                "notice": "Uploaded image was corrupted or invalid format. Classified using your complaint description.",
                "ai_provider": "Keyword Classifier"
            }
        return {
            "issue": "Invalid Image",
            "department": "General Civic Services",
            "severity": "Low",
            "priority": "Low",
            "description": "The uploaded file could not be decoded as a valid image. Please upload a valid PNG, JPG, or WEBP photo.",
            "confidence": "Low",
            "is_civic_issue": False,
            "notice": "The uploaded image was corrupted or an unsupported format.",
            "ai_provider": "None"
        }

    user_context = desc_clean if desc_clean else "None provided"

    prompt = f"""You are CivicRoute's civic problem inspection AI.
Examine this citizen-uploaded photograph.

Citizen context: "{user_context}"

Identify whether this is a civic infrastructure problem.

Choose exactly one department:
- Water & Sanitation
- Roads & Infrastructure
- Sanitation
- Electricity & Lighting
- Drainage & Public Works
- General Civic Services

Classify the issue and assess severity and priority as:
Critical, High, Medium, or Low.

Generate a factual description in 1-3 sentences.
Do not invent details or claim something is visible if it is not.

Important:
- Blocked drains, sewage overflow, and waterlogging belong to Drainage & Public Works.
- General garbage accumulation belongs to Sanitation.
- Road potholes, cracks, and damaged roads belong to Roads & Infrastructure.
- Streetlight or electrical issues belong to Electricity & Lighting.
- Drinking water leaks or water contamination belong to Water & Sanitation.
- If the image is unclear, blurry, or unrelated to civic infrastructure, set is_civic_issue to false.

Return ONLY valid JSON:
{{
  "issue": "Short issue name",
  "department": "Responsible department",
  "severity": "Critical / High / Medium / Low",
  "priority": "Critical / High / Medium / Low",
  "description": "Factual description",
  "confidence": "High / Medium / Low",
  "is_civic_issue": true
}}"""

    result = None
    provider = None

    # 1. Primary: Gemini (gemini-3.1-flash-lite) with 60-second timeout and 1 controlled retry
    if client is not None:
        for attempt in range(1, 3):
            try:
                print(f"[AI Service] Attempting Gemini image analysis (attempt {attempt}/2, model: {GEMINI_MODEL}, timeout: {GEMINI_TIMEOUT_MS}ms)...")
                image_part = types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type
                )
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=[image_part, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                        http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS)
                    )
                )
                raw_text = (response.text or "").strip()
                json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group(0))
                else:
                    result = json.loads(raw_text)
                provider = "Gemini"
                print(f"[AI Service] Gemini image analysis successful on attempt {attempt}.")
                break
            except Exception as e:
                err_msg = sanitize_log_message(f"{type(e).__name__}: {str(e)[:150]}")
                print(f"[AI Service] Gemini image analysis attempt {attempt} failed: {err_msg}")
                if attempt == 1 and is_transient_error(e):
                    print("[AI Service] Temporary error detected on Gemini. Retrying in 2 seconds (attempt 2/2)...")
                    time.sleep(2.0)
                else:
                    break

    # 2. Backup: NVIDIA Nemotron with 1 controlled retry
    if result is None and NVIDIA_API_KEY:
        try:
            print(f"[AI Service] Attempting NVIDIA Nemotron backup ({NVIDIA_MODEL})...")
            result = analyze_with_nvidia(image_bytes, mime_type, prompt)
            provider = "NVIDIA Nemotron"
            print("[AI Service] NVIDIA Nemotron analysis successful.")
        except Exception as e:
            err_msg = sanitize_log_message(f"{type(e).__name__}: {str(e)[:150]}")
            print(f"[AI Service] NVIDIA Nemotron analysis failed after retries: {err_msg}")

    # 3. Fallback: Python Keyword Classifier (for text) or clear temporary-unavailability message (for photo-only)
    if result is None:
        print("[AI Service] Both AI providers unavailable.")
        if desc_clean:
            print("[AI Service] Falling back to Python keyword classifier on user text description.")
            fallback_res = analyze_complaint(desc_clean)
            return {
                **fallback_res,
                "description": desc_clean,
                "confidence": "Medium",
                "is_civic_issue": True,
                "notice": "AI image analysis is temporarily busy. Classified based on your written description.",
                "ai_provider": "Python Fallback Classifier"
            }

        print("[AI Service] Photo-only upload with both AI providers unavailable. Returning temporary unavailability notice.")
        return {
            "issue": "AI Vision Unavailable",
            "department": "General Civic Services",
            "severity": "Medium",
            "priority": "Medium",
            "description": "Live image analysis is temporarily unavailable due to high AI service demand. Please enter a short description of the problem or try uploading again shortly.",
            "confidence": "Low",
            "is_civic_issue": False,
            "notice": "Both image-analysis providers are temporarily unavailable. Please provide a brief text description.",
            "ai_provider": "None"
        }

    # 4. Handle non-civic or unclear images
    is_civic = result.get("is_civic_issue", True)
    if isinstance(is_civic, str):
        is_civic = is_civic.lower() in ["true", "1", "yes"]

    if not is_civic:
        print("[AI Service] Photograph detected as non-civic or unclear.")
        if desc_clean:
            fallback_res = analyze_complaint(desc_clean)
            return {
                **fallback_res,
                "description": desc_clean,
                "confidence": "Medium",
                "is_civic_issue": True,
                "notice": "Image was unclear or unrelated. Classified using your complaint description.",
                "ai_provider": provider
            }
        return {
            "issue": result.get("issue", "Unverified Civic Issue"),
            "department": "General Civic Services",
            "severity": "Low",
            "priority": "Low",
            "description": result.get(
                "description",
                "The photograph does not clearly show a civic infrastructure issue."
            ),
            "confidence": "Low",
            "is_civic_issue": False,
            "notice": "Photograph appears unclear or unrelated to public infrastructure.",
            "ai_provider": provider
        }

    # 5. Normalize department, severity, priority
    valid_departments = [
        "Water & Sanitation",
        "Roads & Infrastructure",
        "Sanitation",
        "Electricity & Lighting",
        "Drainage & Public Works",
        "General Civic Services"
    ]
    dept = result.get("department", "General Civic Services")
    # Department alias mapping
    dept_lower = dept.lower()
    if "drain" in dept_lower or "sewer" in dept_lower or "sewage" in dept_lower:
        dept = "Drainage & Public Works"
    elif "road" in dept_lower or "pothole" in dept_lower or ("street" in dept_lower and "light" not in dept_lower):
        dept = "Roads & Infrastructure"
    elif "water" in dept_lower:
        dept = "Water & Sanitation"
    elif "sanitat" in dept_lower or "garbage" in dept_lower or "waste" in dept_lower:
        dept = "Sanitation"
    elif "electric" in dept_lower or "light" in dept_lower:
        dept = "Electricity & Lighting"
    elif dept not in valid_departments:
        dept = "General Civic Services"

    valid_levels = ["Critical", "High", "Medium", "Low"]
    severity = str(result.get("severity", "Medium")).capitalize()
    if severity not in valid_levels:
        severity = "Medium"

    priority = str(result.get("priority", severity)).capitalize()
    if priority not in valid_levels:
        priority = severity

    return {
        "issue": result.get("issue", "Civic Issue"),
        "department": dept,
        "severity": severity,
        "priority": priority,
        "description": result.get("description", desc_clean if desc_clean else "Civic issue identified."),
        "confidence": result.get("confidence", "High"),
        "is_civic_issue": True,
        "ai_provider": provider
    }


def rewrite_complaint(description: str):
    """
    Rewrite a citizen's complaint in clear, formal language.
    Preserve the original meaning and do not invent details.
    """
    original_text = description.strip()

    if not original_text:
        raise ValueError("Complaint description cannot be empty.")

    prompt = f"""You are CivicRoute's official complaint-writing assistant.

Rewrite the citizen's complaint below into clear, grammatically correct,
professional language suitable for submission to a government department.

STRICT RULES:
1. Preserve the exact meaning of the citizen's complaint.
2. Do not invent dates, locations, people, damage, events, or other facts.
3. Do not exaggerate the severity of the problem.
4. Keep all factual details supplied by the citizen.
5. Use simple, formal and respectful language.
6. Return only the rewritten complaint, without headings or explanations.

Citizen's original complaint:
{original_text}"""

    # Primary: Gemini with 60s timeout
    if client is not None:
        for attempt in range(1, 3):
            try:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS)
                    )
                )
                rewritten_text = (response.text or "").strip()
                if rewritten_text:
                    return rewritten_text
                break
            except Exception as e:
                err_msg = sanitize_log_message(f"{type(e).__name__}: {str(e)[:150]}")
                print(f"[AI Service] Gemini rewrite attempt {attempt} failed: {err_msg}")
                if attempt == 1 and is_transient_error(e):
                    time.sleep(2.0)
                else:
                    break

    # Backup: NVIDIA Nemotron
    if NVIDIA_API_KEY:
        try:
            headers = {
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": NVIDIA_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 512,
                "temperature": 0.2
            }
            resp = requests.post(NVIDIA_URL, headers=headers, json=payload, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if content:
                    return content
        except Exception as e:
            err_msg = sanitize_log_message(f"{type(e).__name__}: {str(e)[:150]}")
            print(f"[AI Service] NVIDIA rewrite backup failed: {err_msg}")

    # Fallback to original text
    return original_text
