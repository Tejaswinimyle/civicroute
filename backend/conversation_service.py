import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

client = None
try:
    if API_KEY:
        client = genai.Client(api_key=API_KEY, http_options=types.HttpOptions(timeout=10000))
except Exception as e:
    print("Warning: Failed to initialize Gemini client in conversation_service:", e)



def fallback_question(
    description: str,
    location: str = "",
    affected_people: str = "",
    
):
    """
    Fallback questions used when Gemini is temporarily unavailable.
    """

    text = description.lower()

    # Location is usually the first important missing detail
    if not location.strip():

        if any(word in text for word in [
            "road",
            "pothole",
            "street",
            "damaged road"
        ]):
            return {
                "complete": False,
                "question": "Where exactly is the damaged road or pothole located?",
                "missing_field": "location"
            }

        if any(word in text for word in [
            "water",
            "water supply"
        ]):
            return {
                "complete": False,
                "question": "Which area or locality is affected by the water supply problem?",
                "missing_field": "location"
            }

        if any(word in text for word in [
            "garbage",
            "waste",
            "trash"
        ]):
            return {
                "complete": False,
                "question": "Where is the garbage or waste accumulating?",
                "missing_field": "location"
            }

        if any(word in text for word in [
            "streetlight",
            "street light",
            "electricity",
            "power"
        ]):
            return {
                "complete": False,
                "question": "Where exactly is the electrical or streetlight problem occurring?",
                "missing_field": "location"
            }

        return {
            "complete": False,
            "question": "Where exactly is this problem occurring?",
            "missing_field": "location"
        }

    # Ask about affected people next
    if not affected_people.strip():

        return {
            "complete": False,
            "question": "Approximately how many people or households are affected by this problem?",
            "missing_field": "affected_people"
        }

    # Enough basic information
    return {
        "complete": True,
        "question": "",
        "missing_field": None
    }


def check_missing_information(
    description: str,
    location: str = "",
    affected_people: str = "",
    conversation_history: list = None,
    follow_up_answer: str = "",
    missing_field: str = "",
):

    if conversation_history is None:
        conversation_history = []

    follow_up_answer = follow_up_answer.strip()
    missing_field = missing_field.strip().lower()

    # Apply the follow-up answer to the correct field
    if follow_up_answer:
        if missing_field == "location":
            location = follow_up_answer
        elif missing_field == "affected_people":
            affected_people = follow_up_answer

    prompt = f"""
You are the CivicRoute civic complaint assistant.

Your job is to collect only the important information needed
to prepare an official civic complaint.

Original complaint:
{description}

Location already provided:
{location}

Affected people/households already provided:
{affected_people}

Latest follow-up answer:
{follow_up_answer}

Field the previous question was asking about:
{missing_field}

Previous conversation:
{json.dumps(conversation_history)}

Analyze what information is still missing.

Ask ONLY ONE question at a time.

The question must be relevant to the specific complaint.
Do not ask unnecessary questions.
Do not ask for information that has already been provided above.

When enough information is available to create an official
complaint, return complete=true.

Return ONLY valid JSON in exactly this format:

{{
    "complete": true or false,
    "question": "one question or empty string",
    "missing_field": "short field name or null"
}}
"""

    try:
        if client is None:
            raise RuntimeError("Gemini client not initialized")

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json"
            }
        )

        result = json.loads(response.text)

        # Include updated fields in the response
        result["location"] = location
        result["affected_people"] = affected_people

        return result

    except Exception as e:

        print("Gemini unavailable. Using fallback conversation logic.")
        print("Gemini error:", e)

        return fallback_question(
            description=description,
            location=location,
            affected_people=affected_people
        )