import re
from typing import Dict, Any, Tuple


def calculate_priority_score(
    issue: str,
    department: str,
    severity: str,
    description: str = "",
    affected_people: str = "",
    similar_reports_count: int = 1
) -> Tuple[float, str, Dict[str, Any]]:
    """
    Transparent, configurable civic priority calculation based on:
    - Base Severity (up to 40 points)
    - Public Health & Safety Hazard (up to 30 points)
    - Impact Scope / Affected Population (up to 20 points)
    - Immediate Urgency & Escalation (up to 10 points)

    Note: Frequency of reports is bounded to prevent minor high-volume issues
    from displacing individual critical health/safety hazards.
    """
    text = (description + " " + issue).lower()
    score = 0.0

    # 1. Base Severity (Max 40)
    sev_upper = (severity or "Medium").capitalize()
    if sev_upper == "Critical":
        sev_points = 40.0
    elif sev_upper == "High":
        sev_points = 30.0
    elif sev_upper == "Medium":
        sev_points = 18.0
    else:
        sev_points = 8.0
    score += sev_points

    # 2. Public Health & Safety Risk (Max 30)
    hazard_points = 5.0
    critical_hazards = [
        "contaminated", "unsafe drinking", "poison", "live wire", "fallen wire",
        "exposed manhole", "deep manhole", "fire", "sparking", "sewage inside",
        "hospital", "school", "child", "drowning", "electrocution"
    ]
    high_hazards = [
        "sewage overflow", "overflowing sewage", "waterlogging", "dirty water",
        "accident", "multiple accidents", "deep pothole", "potholes",
        "rotting", "disease", "epidemic", "stagnant water", "pipeline leak"
    ]

    if any(k in text for k in critical_hazards):
        hazard_points = 30.0
    elif any(k in text for k in high_hazards):
        hazard_points = 22.0
    elif department in ["Drainage & Public Works", "Water & Sanitation", "Water Supply"]:
        hazard_points = 15.0
    else:
        hazard_points = 10.0
    score += hazard_points

    # 3. Community Impact / Affected People (Max 20)
    impact_points = 5.0
    # Try parsing number from affected_people string or description
    parsed_count = 0
    num_matches = re.findall(r"\b(\d+)\b", affected_people)
    if num_matches:
        try:
            parsed_count = int(num_matches[0])
        except ValueError:
            parsed_count = 0

    if parsed_count >= 200 or "entire area" in text or "entire locality" in text:
        impact_points = 20.0
    elif parsed_count >= 50 or "many households" in text or "whole street" in text:
        impact_points = 15.0
    elif parsed_count >= 10:
        impact_points = 10.0
    else:
        impact_points = 5.0
    score += impact_points

    # 4. Urgency & Frequency Bounded Factor (Max 10)
    urgency_points = 0.0
    urgent_keywords = ["immediate", "emergency", "danger", "urgent", "days", "week", "unattended"]
    if any(k in text for k in urgent_keywords):
        urgency_points += 5.0

    # Frequency contributes marginally (max 5 pts) so 50 minor reports don't override 1 critical water hazard
    freq_bonus = min(5.0, (similar_reports_count - 1) * 0.5)
    urgency_points += freq_bonus
    score += urgency_points

    # Clamp total score between 0 and 100
    final_score = round(min(100.0, max(5.0, score)), 1)

    # Determine priority tier
    if final_score >= 75.0 or sev_upper == "Critical":
        priority_label = "Urgent"
    elif final_score >= 50.0 or sev_upper == "High":
        priority_label = "High"
    elif final_score >= 30.0:
        priority_label = "Medium"
    else:
        priority_label = "Low"

    breakdown = {
        "severity_score": sev_points,
        "hazard_score": hazard_points,
        "impact_score": impact_points,
        "urgency_score": urgency_points,
        "total_score": final_score,
        "priority": priority_label
    }

    return final_score, priority_label, breakdown

