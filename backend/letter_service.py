def generate_complaint_letter(
    issue: str,
    department: str,
    description: str,
    location: str,
    affected_people: str,
    severity: str
):
    """
    Generate a formal civic complaint letter.
    """

    letter = f"""To,
The {department}

Subject: Complaint regarding {issue.lower()}

Respected Sir/Madam,

I am writing to bring to your attention a civic issue
regarding {issue.lower()} in {location}.

{description}

The issue is currently affecting approximately
{affected_people}.

Based on the information provided, the severity of
this issue has been assessed as {severity}.

I kindly request the concerned department to
investigate the matter and take appropriate action
at the earliest.

Thank you for your attention to this matter.

Yours faithfully,
A Concerned Citizen
"""

    return letter