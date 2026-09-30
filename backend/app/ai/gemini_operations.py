"""
HospitaX AI Operations - Gemini Tool Planner

This module converts a natural-language hospital request into
a controlled AI operation plan.

IMPORTANT
---------
Gemini does NOT execute database operations.

Gemini only:
    1. Understands the user's natural-language request.
    2. Selects one registered AI tool.
    3. Extracts arguments from the request.
    4. Returns a structured operation plan.

Actual execution is handled separately by:
    AI Orchestrator
        ↓
    PermissionEngine
        ↓
    Confirmation Gate
        ↓
    AI Tool Registry
        ↓
    Existing CRUD / business logic

This module must never directly access the database.
"""

from __future__ import annotations

import json
import re
import traceback
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from google.api_core.exceptions import ResourceExhausted

from app.ai.permissions import PermissionEngine, permission_engine
from app.ai.tools import get_tool, list_tools
from app.ai.gemini_service import generate_content, get_response_text


# ============================================================
# CONSTANTS
# ============================================================

MAX_MESSAGE_LENGTH = 4000


# ============================================================
# TYPES
# ============================================================


@dataclass
class AIOperationPlan:
    """
    Structured plan produced by Gemini.

    Gemini creates the plan.
    The orchestrator decides whether it can actually execute it.
    """

    tool_name: Optional[str]
    arguments: Dict[str, Any]
    reasoning: str
    confidence: str
    requires_clarification: bool
    clarification_question: Optional[str] = None


# ============================================================
# JSON HELPERS
# ============================================================


def _clean_json(text: str) -> str:
    """
    Clean common Markdown/code-fence wrappers from Gemini output.
    """

    if not text:
        return ""

    cleaned = text.strip()

    # Remove Markdown code fences.
    cleaned = re.sub(
        r"^```(?:json)?\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    cleaned = re.sub(
        r"\s*```$",
        "",
        cleaned,
    )

    cleaned = cleaned.strip()

    # Handle accidental text before/after a JSON object.
    first_object = cleaned.find("{")
    last_object = cleaned.rfind("}")

    if (
        first_object >= 0
        and last_object > first_object
    ):
        cleaned = cleaned[
            first_object:last_object + 1
        ]

    return cleaned.strip()


def _parse_json_response(text: str) -> Dict[str, Any]:
    """
    Parse Gemini's structured JSON response.

    Raises:
        ValueError: if the response is not valid JSON.
    """

    cleaned = _clean_json(text)

    if not cleaned:
        raise ValueError(
            "Gemini returned an empty operation plan."
        )

    try:
        result = json.loads(cleaned)

    except json.JSONDecodeError as exc:
        raise ValueError(
            "Gemini returned an invalid operation plan."
        ) from exc

    if not isinstance(result, dict):
        raise ValueError(
            "Gemini operation plan must be a JSON object."
        )

    return result


# ============================================================
# TOOL METADATA
# ============================================================


def _get_authorized_tools(
    *,
    current_user: Any,
    engine: PermissionEngine,
) -> List[Dict[str, Any]]:
    """
    Return only tools that the current user's role is allowed
    to use.

    IMPORTANT:
    This is an optimization and prompt-level restriction only.

    The real permission check still happens in the orchestrator
    immediately before execution.
    """

    role = getattr(
        current_user,
        "role",
        None,
    )

    if not role:
        return []

    authorized_tools: List[Dict[str, Any]] = []

    for tool in list_tools():

        tool_name = tool["name"]

        registered_tool = get_tool(tool_name)

        if registered_tool is None:
            continue

        # IMPORTANT:
        # PermissionEngine exposes is_allowed(), not can_access().
        if not engine.is_allowed(
            role=role,
            resource=registered_tool.resource,
            action=registered_tool.action,
        ):
            continue

        authorized_tools.append(
            {
                "name": registered_tool.name,
                "description": registered_tool.description,
                "resource": registered_tool.resource.value,
                "action": registered_tool.action.value,
                "requires_confirmation": (
                    engine.requires_confirmation(
                        role=role,
                        resource=registered_tool.resource,
                        action=registered_tool.action,
                    )
                ),
            }
        )

    return authorized_tools


# ============================================================
# PROMPT
# ============================================================


def _build_planner_prompt(
    *,
    message: str,
    current_user: Any,
    patient_id: Optional[int],
    authorized_tools: List[Dict[str, Any]],
) -> str:
    """
    Build the controlled Gemini planning prompt.
    """

    role = getattr(
        current_user,
        "role",
        "Unknown",
    )

    user_id = getattr(
        current_user,
        "id",
        None,
    )

    employee_id = getattr(
        current_user,
        "employee_id",
        None,
    )

    tools_json = json.dumps(
        authorized_tools,
        indent=2,
        ensure_ascii=False,
    )

    patient_context = (
        f"Patient ID explicitly selected by the user: {patient_id}"
        if patient_id is not None
        else "No patient ID was explicitly selected."
    )

    return f"""
You are the planning layer of the HospitaX AI Operations Assistant.

Your job is ONLY to convert a natural-language hospital
operations request into ONE controlled operation plan.

You DO NOT execute anything.

You DO NOT access the database.

You DO NOT invent patient information.

You DO NOT invent clinical facts.

You DO NOT invent medical diagnoses, prescriptions,
discharge information, encounter information, dates,
times, IDs, or other operational values.

The backend will independently validate authorization,
confirmation, schemas, ownership, and business rules.

============================================================
AUTHENTICATED USER
============================================================

Role:
{role}

User ID:
{user_id}

Employee ID:
{employee_id}

{patient_context}

============================================================
AUTHORIZED TOOLS
============================================================

You may select ONLY one of these tools:

{tools_json}

If the requested operation cannot be represented by one
of these tools, return tool_name as null and ask for
clarification.

============================================================
IMPORTANT RULES
============================================================

1. Select exactly ONE registered tool.

2. Never invent a tool name.

3. Never create SQL.

4. Never create database queries.

5. Never call a backend function.

6. Never claim that an operation was completed.

7. You are only creating a PLAN.

8. Use IDs only when:
   - the user explicitly provides them, OR
   - the selected patient ID was supplied by the API request.

9. Do not guess IDs.

10. Do not fabricate missing required information.

11. If required information is missing for an operation,
    set requires_clarification to true.

12. When clarification is required:
    - tool_name may still contain the most appropriate tool.
    - arguments must contain only information actually known.
    - clarification_question must clearly state what is missing.

13. For read-only requests, prefer a VIEW tool.

14. For create/update/action requests, select the corresponding
    registered action tool if authorized.

15. Never select a tool that is not present in the authorized
    tool list.

16. If the user's request is ambiguous between multiple tools,
    ask for clarification instead of guessing.

17. Do not interpret natural language as permission.
    Backend authorization is authoritative.

18. Do not invent clinical content merely to satisfy a schema.

19. Keep reasoning short and factual.

20. confidence must be one of:
    "high"
    "medium"
    "low"

21. For work-task assignment, when the user explicitly says
    "Doctor 7", "Nurse 8", etc., the numeric value is the
    existing backend user ID and must be placed in
    "assigned_to_id". Do NOT ask for an Employee ID when the
    numeric user ID is already explicitly provided.

22. For due dates, preserve an explicitly supplied date/time.
    Never replace an explicit date/time with a clarification
    question.

============================================================
CLINICAL SAFETY
============================================================

The AI Operations Assistant is an operational assistant.

It must NOT autonomously:

- diagnose diseases
- determine a diagnosis
- select medications
- recommend prescriptions
- prescribe medications
- invent clinical findings
- invent laboratory results
- invent vital signs
- invent encounter information
- invent discharge information
- fabricate patient history

If the user asks the AI to diagnose a patient or select/
recommend medication, do not select an operational tool.

Return:

- tool_name: null
- requires_clarification: true
- clarification_question explaining that the assistant
  cannot perform that autonomous clinical decision.

The assistant may summarize existing clinical information
when an authorized read/summarization tool exists.

============================================================
USER REQUEST
============================================================

{message}

============================================================
REQUIRED JSON RESPONSE
============================================================

Return ONLY valid JSON.

Use exactly this structure:

{{
  "tool_name": "registered_tool_name_or_null",
  "arguments": {{}},
  "reasoning": "Short explanation of why this tool matches.",
  "confidence": "high",
  "requires_clarification": false,
  "clarification_question": null
}}

============================================================
EXAMPLES
============================================================

Example 1:

User:
"Show all patients"

Response:

{{
  "tool_name": "get_patients",
  "arguments": {{}},
  "reasoning": "The user requested a patient list.",
  "confidence": "high",
  "requires_clarification": false,
  "clarification_question": null
}}

Example 2:

User:
"Show patient 13"

Response:

{{
  "tool_name": "get_patient",
  "arguments": {{
    "patient_id": 13
  }},
  "reasoning": "The user explicitly provided patient ID 13.",
  "confidence": "high",
  "requires_clarification": false,
  "clarification_question": null
}}

Example 3:

User:
"Show my work"

Response:

{{
  "tool_name": "get_my_work_tasks",
  "arguments": {{}},
  "reasoning": "The user requested their assigned work.",
  "confidence": "high",
  "requires_clarification": false,
  "clarification_question": null
}}

Example 4:

User:
"Create a discharge for patient 13"

If required discharge information is missing:

{{
  "tool_name": "create_discharge",
  "arguments": {{
    "patient_id": 13
  }},
  "reasoning": "The user requested discharge creation, but required information is missing.",
  "confidence": "high",
  "requires_clarification": true,
  "clarification_question": "Which clinical encounter should be used for the discharge?"
}}

Example 5:

User:
"What disease does patient 13 have?"

Response:

{{
  "tool_name": null,
  "arguments": {{}},
  "reasoning": "Autonomous diagnosis is not permitted.",
  "confidence": "high",
  "requires_clarification": true,
  "clarification_question": "I can summarize authorized clinical information, but I cannot autonomously diagnose a patient."
}}

Example 6:

User:
"Which medicine should I prescribe to patient 13?"

Response:

{{
  "tool_name": null,
  "arguments": {{}},
  "reasoning": "Autonomous medication selection and prescribing are not permitted.",
  "confidence": "high",
  "requires_clarification": true,
  "clarification_question": "I can help retrieve or summarize existing prescription information, but I cannot select or prescribe medication autonomously."
}}

============================================================
FINAL INSTRUCTION
============================================================

Return ONLY the JSON operation plan.

Do not add Markdown.

Do not add commentary.

Do not claim execution.

Do not claim success.

"""


# ============================================================
# PLAN VALIDATION
# ============================================================


def _validate_plan(
    *,
    plan: Dict[str, Any],
    authorized_tools: List[Dict[str, Any]],
) -> AIOperationPlan:
    """
    Validate Gemini's returned plan before it reaches the
    orchestrator.
    """

    tool_name = plan.get("tool_name")

    if tool_name is not None:

        if not isinstance(tool_name, str):
            raise ValueError(
                "Gemini returned an invalid tool name."
            )

        tool_name = tool_name.strip()

        if not tool_name:
            tool_name = None

    authorized_names = {
        tool["name"]
        for tool in authorized_tools
    }

    if tool_name is not None:

        if tool_name not in authorized_names:
            raise ValueError(
                "Gemini selected a tool that is not authorized "
                "for the current user."
            )

    arguments = plan.get(
        "arguments",
        {},
    )

    if arguments is None:
        arguments = {}

    if not isinstance(arguments, dict):
        raise ValueError(
            "Gemini operation arguments must be an object."
        )

    reasoning = str(
        plan.get(
            "reasoning",
            "",
        )
    ).strip()

    confidence = str(
        plan.get(
            "confidence",
            "low",
        )
    ).strip().lower()

    if confidence not in {
        "high",
        "medium",
        "low",
    }:
        confidence = "low"

    requires_clarification = bool(
        plan.get(
            "requires_clarification",
            False,
        )
    )

    clarification_question = plan.get(
        "clarification_question"
    )

    if clarification_question is not None:

        clarification_question = str(
            clarification_question
        ).strip()

        if not clarification_question:
            clarification_question = None

    if requires_clarification and not clarification_question:

        clarification_question = (
            "Please provide the missing information "
            "required for this operation."
        )

    if tool_name is None:

        requires_clarification = True

        if not clarification_question:

            clarification_question = (
                "I could not determine a supported hospital "
                "operation from your request. Please clarify "
                "what you want me to do."
            )

    return AIOperationPlan(
        tool_name=tool_name,
        arguments=arguments,
        reasoning=reasoning,
        confidence=confidence,
        requires_clarification=requires_clarification,
        clarification_question=clarification_question,
    )


# ============================================================
# MAIN PLANNER
# ============================================================


def plan_ai_operation(
    *,
    message: str,
    current_user: Any,
    patient_id: Optional[int] = None,
    engine: PermissionEngine = permission_engine,
) -> AIOperationPlan:
    """
    Convert a natural-language request into a controlled
    operation plan.

    This function NEVER executes the selected operation.
    """

    if not isinstance(message, str):

        raise ValueError(
            "AI request message must be text."
        )

    message = message.strip()

    if not message:

        raise ValueError(
            "AI request message cannot be empty."
        )

    if len(message) > MAX_MESSAGE_LENGTH:

        raise ValueError(
            "AI request message is too long."
        )

    # --------------------------------------------------------
    # DETERMINISTIC CLINICAL SAFETY GUARD
    # --------------------------------------------------------
    #
    # Do this before Gemini.
    #
    # This prevents a clinical safety request from being
    # accidentally converted into an operational tool call.
    # --------------------------------------------------------

    normalized_message = re.sub(
        r"\s+",
        " ",
        message.lower(),
    ).strip()

    unsafe_clinical_patterns = (
        r"\bdiagnose\b",
        r"\bmake a diagnosis\b",
        r"\bwhat disease does\b",
        r"\bwhat is the diagnosis\b",
        r"\bwhich disease\b",
        r"\bselect (?:a )?medication\b",
        r"\bchoose (?:a )?medication\b",
        r"\brecommend (?:a )?medication\b",
        r"\brecommend (?:a )?medicine\b",
        r"\bwhich medicine should\b",
        r"\bwhich medication should\b",
        r"\bwhat medicine should\b",
        r"\bwhat medication should\b",
        r"\bprescribe\b",
        r"\bprescription recommendation\b",
    )

    if any(
        re.search(
            pattern,
            normalized_message,
        )
        for pattern in unsafe_clinical_patterns
    ):

        return AIOperationPlan(
            tool_name=None,
            arguments={},
            reasoning=(
                "The requested action involves autonomous "
                "clinical decision-making, which is not "
                "permitted by the AI Operations Assistant."
            ),
            confidence="high",
            requires_clarification=True,
            clarification_question=(
                "I can retrieve or summarize authorized "
                "clinical information, but I cannot "
                "autonomously diagnose a patient or select "
                "or prescribe medication."
            ),
        )

    # --------------------------------------------------------
    # AUTHORIZED TOOL DISCOVERY
    # --------------------------------------------------------

    authorized_tools = _get_authorized_tools(
        current_user=current_user,
        engine=engine,
    )

    # --------------------------------------------------------
    # DETERMINISTIC HIGH-CONFIDENCE READ ROUTING
    # --------------------------------------------------------
    #
    # Basic read requests should not be left entirely to an
    # LLM classifier. A request such as "Show patient 13" is
    # unambiguous and must resolve to the patient VIEW tool.
    #
    # This is NOT an authorization bypass:
    # - only tools already present in authorized_tools are used
    # - the normal PermissionEngine check still runs before
    #   actual execution
    # - this function still only creates a plan
    #
    # Gemini remains responsible for natural/ambiguous requests.
    # --------------------------------------------------------

    authorized_tool_names = {
        str(tool.get("name"))
        for tool in authorized_tools
        if tool.get("name")
    }

    def _deterministic_read_plan() -> Optional[AIOperationPlan]:
        # ----------------------------------------------------
        # SHOW / GET ONE PATIENT
        # ----------------------------------------------------
        patient_match = re.fullmatch(
            r"(?:show|get|view|find)\s+patient\s+#?(\d+)",
            normalized_message,
            flags=re.IGNORECASE,
        )

        if patient_match:
            if "get_patient" not in authorized_tool_names:
                return None

            requested_patient_id = int(
                patient_match.group(1)
            )

            # An API-provided patient_id is authoritative.
            # Never allow deterministic routing to bypass the
            # existing patient-context conflict protection.
            if patient_id is not None and requested_patient_id != int(
                patient_id
            ):
                raise ValueError(
                    "Gemini request patient_id conflicts with "
                    "the authenticated API patient context."
                )

            return AIOperationPlan(
                tool_name="get_patient",
                arguments={
                    "patient_id": requested_patient_id,
                },
                reasoning=(
                    "The user explicitly requested one patient "
                    "record by patient ID."
                ),
                confidence="high",
                requires_clarification=False,
                clarification_question=None,
            )

        # ----------------------------------------------------
        # PATIENT LIST
        # ----------------------------------------------------
        if re.fullmatch(
            r"(?:show|get|view|list|find)\s+"
            r"(?:all\s+)?patients"
            r"|(?:show|get|view|open)\s+patient\s+list",
            normalized_message,
            flags=re.IGNORECASE,
        ):
            if "get_patients" not in authorized_tool_names:
                return None

            return AIOperationPlan(
                tool_name="get_patients",
                arguments={},
                reasoning=(
                    "The user requested the available patient "
                    "records."
                ),
                confidence="high",
                requires_clarification=False,
                clarification_question=None,
            )

        # ----------------------------------------------------
        # ADMINISTRATOR: CREATE WORK TASK
        # ----------------------------------------------------
        # Resolve explicit relative date/time phrases locally.
        # The resulting plan still passes through authorization,
        # confirmation, tool validation, and business logic.
        # ----------------------------------------------------
        work_task_match = re.fullmatch(
            r"create\s+(?:a\s+)?work\s+task\s+for\s+"
            r"(?P<role>doctor|nurse|receptionist|housekeeper)\s+"
            r"(?P<user_id>\d+)\s+"
            r"(?:titled\s+)?"
            r"(?P<title>.+?)"
            r"\s+(?:—|–|-)?\s*due\s+"
            r"(?:(?P<due_day>today|tomorrow)|"
            r"(?P<due_date>\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}))"
            r"\s*,?\s*(?:at\s+)?"
            r"(?P<hour>1[0-2]|0?[1-9])"
            r"(?::(?P<minute>[0-5]\d))?"
            r"\s*(?P<ampm>a\.m\.|p\.m\.|am|pm)\??$",
            normalized_message,
            flags=re.IGNORECASE,
        )

        if work_task_match:
            if "create_work_task" not in authorized_tool_names:
                return None

            assigned_to_id = int(work_task_match.group("user_id"))
            role = work_task_match.group("role").title()
            title = work_task_match.group("title").strip()
            # Remove optional visual separators that may be used in
            # confirmation-style natural language.
            title = re.sub(r"^[—–-]\s*|\s+[—–-]\s*$", "", title).strip()

            due_day = work_task_match.group("due_day")
            due_date_text = work_task_match.group("due_date")
            hour_text = work_task_match.group("hour")
            minute_text = work_task_match.group("minute")
            ampm = work_task_match.group("ampm")

            arguments: Dict[str, Any] = {
                "title": title,
                "assigned_to_id": assigned_to_id,
            }

            if due_day is None and due_date_text is None:
                return AIOperationPlan(
                    tool_name="create_work_task",
                    arguments=arguments,
                    reasoning=(
                        "The work task can be identified, but its due "
                        "date/time was not provided."
                    ),
                    confidence="high",
                    requires_clarification=True,
                    clarification_question=(
                        "Please provide the due date and time for the task."
                    ),
                )

            if hour_text is None or ampm is None:
                return AIOperationPlan(
                    tool_name="create_work_task",
                    arguments=arguments,
                    reasoning=(
                        "The work task has a due date but the due time "
                        "is incomplete."
                    ),
                    confidence="high",
                    requires_clarification=True,
                    clarification_question=(
                        "Please provide the due time, for example 10 AM."
                    ),
                )

            hour = int(hour_text)
            minute = int(minute_text or 0)
            ampm_normalized = ampm.lower().replace(".", "")

            if ampm_normalized == "pm" and hour != 12:
                hour += 12
            elif ampm_normalized == "am" and hour == 12:
                hour = 0

            today = datetime.now().date()

            if due_date_text:
                try:
                    due_date = datetime.strptime(
                        due_date_text.strip().title(),
                        "%d %b %Y",
                    ).date()
                except ValueError:
                    try:
                        due_date = datetime.strptime(
                            due_date_text.strip().title(),
                            "%d %B %Y",
                        ).date()
                    except ValueError as exc:
                        raise ValueError(
                            "Invalid work-task due date. Please use a date such as 30 Sep 2026."
                        ) from exc
            else:
                due_date = (
                    today
                    if due_day.lower() == "today"
                    else today + timedelta(days=1)
                )

            due_at = datetime(
                due_date.year,
                due_date.month,
                due_date.day,
                hour,
                minute,
            )

            arguments["due_at"] = due_at.isoformat()

            return AIOperationPlan(
                tool_name="create_work_task",
                arguments=arguments,
                reasoning=(
                    f"Create the requested work task for {role} "
                    f"user {assigned_to_id} with the explicitly "
                    f"provided due date and time."
                ),
                confidence="high",
                requires_clarification=False,
                clarification_question=None,
            )

        # ----------------------------------------------------
        # ATTENDANCE READ ROUTING
        # ----------------------------------------------------
        #
        # Existing PermissionEngine authorization remains
        # authoritative. This only adds deterministic planning
        # for the already-registered get_attendance tool.
        # ----------------------------------------------------

        if "get_attendance" in authorized_tool_names:

            # My attendance
            if re.fullmatch(
                r"(?:show|get|view|check)\s+"
                r"(?:my\s+)?attendance(?:\s+today)?",
                normalized_message,
                flags=re.IGNORECASE,
            ):
                return AIOperationPlan(
                    tool_name="get_attendance",
                    arguments={},
                    reasoning="The user requested attendance information.",
                    confidence="high",
                    requires_clarification=False,
                    clarification_question=None,
                )

            # Attendance for a specific staff/user ID
            attendance_user_match = re.fullmatch(
                r"(?:show|get|view|check)\s+attendance\s+"
                r"(?:of|for)\s+(?:staff\s+)?(?:user\s+)?#?(\d+)"
                r"(?:\s+(?:on|for)\s+(\d{4}-\d{2}-\d{2}))?",
                normalized_message,
                flags=re.IGNORECASE,
            )

            if attendance_user_match:
                arguments: Dict[str, Any] = {
                    "user_id": int(attendance_user_match.group(1))
                }

                requested_date = attendance_user_match.group(2)
                if requested_date:
                    arguments["attendance_date"] = requested_date

                return AIOperationPlan(
                    tool_name="get_attendance",
                    arguments=arguments,
                    reasoning=(
                        "The user explicitly requested attendance for "
                        "a specific staff user."
                    ),
                    confidence="high",
                    requires_clarification=False,
                    clarification_question=None,
                )

            # Attendance for a specific date
            attendance_date_match = re.fullmatch(
                r"(?:show|get|view|check)\s+"
                r"(?:all\s+)?(?:staff\s+)?attendance\s+"
                r"(?:on|for)\s+(\d{4}-\d{2}-\d{2})",
                normalized_message,
                flags=re.IGNORECASE,
            )

            if attendance_date_match:
                return AIOperationPlan(
                    tool_name="get_attendance",
                    arguments={
                        "attendance_date": attendance_date_match.group(1)
                    },
                    reasoning=(
                        "The user explicitly requested attendance "
                        "records for a specific date."
                    ),
                    confidence="high",
                    requires_clarification=False,
                    clarification_question=None,
                )

            # Attendance history
            if re.fullmatch(
                r"(?:show|get|view|check)\s+"
                r"(?:my\s+)?attendance\s+history",
                normalized_message,
                flags=re.IGNORECASE,
            ):
                return AIOperationPlan(
                    tool_name="get_attendance",
                    arguments={},
                    reasoning="The user requested attendance history.",
                    confidence="high",
                    requires_clarification=False,
                    clarification_question=None,
                )

        # ----------------------------------------------------
        # CURRENT USER'S WORK
        # ----------------------------------------------------
        if re.fullmatch(
            r"(?:show|get|view|list)\s+"
            r"(?:my\s+work|my\s+tasks|assigned\s+work|"
            r"my\s+assigned\s+work)",
            normalized_message,
            flags=re.IGNORECASE,
        ):
            if "get_my_work_tasks" not in authorized_tool_names:
                return None

            return AIOperationPlan(
                tool_name="get_my_work_tasks",
                arguments={},
                reasoning=(
                    "The user requested work tasks assigned "
                    "to the authenticated user."
                ),
                confidence="high",
                requires_clarification=False,
                clarification_question=None,
            )

        return None

    deterministic_plan = _deterministic_read_plan()

    if deterministic_plan is not None:
        return deterministic_plan

    if not authorized_tools:

        return AIOperationPlan(
            tool_name=None,
            arguments={},
            reasoning=(
                "The authenticated user has no AI operations "
                "available through the current permission set."
            ),
            confidence="high",
            requires_clarification=True,
            clarification_question=(
                "There are no available AI operations for "
                "your current role."
            ),
        )

    # --------------------------------------------------------
    # BUILD PLANNER PROMPT
    # --------------------------------------------------------

    prompt = _build_planner_prompt(
        message=message,
        current_user=current_user,
        patient_id=patient_id,
        authorized_tools=authorized_tools,
    )

    try:

        # ----------------------------------------------------
        # GEMINI PLANNING
        # ----------------------------------------------------

        response = generate_content(
            prompt
        )

        response_text = get_response_text(
            response
        )

        # ----------------------------------------------------
        # JSON PARSING
        # ----------------------------------------------------

        raw_plan = _parse_json_response(
            response_text
        )

        # ----------------------------------------------------
        # PLAN VALIDATION
        # ----------------------------------------------------

        plan = _validate_plan(
            plan=raw_plan,
            authorized_tools=authorized_tools,
        )
        
        

        # ----------------------------------------------------
        # BACKEND ARGUMENT NORMALIZATION
        # ----------------------------------------------------
        #
        # Gemini may naturally use "assigned_to_user_id".
        # The existing HospitaX WorkTaskCreate schema uses
        # "assigned_to_id". Normalize the AI-layer alias before
        # the plan reaches the registered tool executor.
        # ----------------------------------------------------

        if plan.tool_name == "create_work_task":

            # Normalize common AI aliases to the existing
            # WorkTaskCreate backend field: assigned_to_id.
            for alias in (
                "assigned_to_user_id",
                "assignee_user_id",
                "assigned_user_id",
                "assignee_id",
            ):
                if (
                    alias in plan.arguments
                    and "assigned_to_id" not in plan.arguments
                ):
                    plan.arguments["assigned_to_id"] = (
                        plan.arguments.pop(alias)
                    )
                    break

        # ----------------------------------------------------
        # SAFE PATIENT ID NORMALIZATION
        # ----------------------------------------------------

        if patient_id is not None:

            existing_patient_id = (
                plan.arguments.get(
                    "patient_id"
                )
            )

            if existing_patient_id is not None:

                try:

                    existing_patient_id = int(
                        existing_patient_id
                    )

                except (
                    TypeError,
                    ValueError,
                ) as exc:

                    raise ValueError(
                        "Gemini returned an invalid patient_id."
                    ) from exc

                if existing_patient_id != int(
                    patient_id
                ):

                    raise ValueError(
                        "Gemini returned a patient_id that "
                        "conflicts with the authenticated request."
                    )

            else:

                plan.arguments[
                    "patient_id"
                ] = int(patient_id)

        # ----------------------------------------------------
        # FINAL WORK-TASK ARGUMENT CONTRACT CHECK
        # ----------------------------------------------------
        #
        # Defensive/idempotent final boundary check. The
        # orchestrator must receive the backend field name
        # "assigned_to_id".
        # ----------------------------------------------------

        if plan.tool_name == "create_work_task":

            # Normalize common AI aliases to the existing
            # WorkTaskCreate backend field: assigned_to_id.
            for alias in (
                "assigned_to_user_id",
                "assignee_user_id",
                "assigned_user_id",
                "assignee_id",
            ):
                if (
                    alias in plan.arguments
                    and "assigned_to_id" not in plan.arguments
                ):
                    plan.arguments["assigned_to_id"] = (
                        plan.arguments.pop(alias)
                    )
                    break

        return plan

    # --------------------------------------------------------
    # VALIDATION ERRORS
    # --------------------------------------------------------

    except ValueError:
        raise

    # --------------------------------------------------------
    # GEMINI QUOTA ERROR
    # --------------------------------------------------------

    except ResourceExhausted as exc:

        print(
            "\n"
            + "=" * 70
        )

        print(
            "[AI PLANNER QUOTA ERROR]"
        )

        print(
            f"Exception Type: {type(exc).__name__}"
        )

        print(
            "Gemini API quota has been exhausted."
        )

        print(
            "=" * 70
            + "\n"
        )

        raise RuntimeError(
            "Gemini API quota exceeded. "
            "Please try again later."
        ) from exc

    # --------------------------------------------------------
    # OTHER PLANNER ERRORS
    # --------------------------------------------------------

    except Exception as exc:

        # ====================================================
        # DIAGNOSTIC LOGGING
        # ====================================================
        #
        # This intentionally logs only the exception type,
        # message, and traceback.
        #
        # Do NOT log:
        # - API keys
        # - passwords
        # - JWT tokens
        # - complete prompts
        # - patient records
        #
        # The purpose is to identify the real planner failure
        # during local development.
        # ====================================================

        print(
            "\n"
            + "=" * 70
        )

        print(
            "[AI PLANNER ERROR]"
        )

        print(
            f"Exception Type: {type(exc).__name__}"
        )

        print(
            f"Exception Message: {exc}"
        )

        print(
            "Traceback:"
        )

        traceback.print_exc()

        print(
            "=" * 70
            + "\n"
        )

        raise RuntimeError(
            "Unable to create an AI operation plan."
        ) from exc


# ============================================================
# SAFE DESCRIPTION HELPER
# ============================================================


def describe_ai_plan(
    plan: AIOperationPlan,
) -> Dict[str, Any]:
    """
    Convert an operation plan into a JSON-safe dictionary.

    This is intended for API responses and logging.
    """

    return {
        "tool_name": plan.tool_name,
        "arguments": plan.arguments,
        "reasoning": plan.reasoning,
        "confidence": plan.confidence,
        "requires_clarification": (
            plan.requires_clarification
        ),
        "clarification_question": (
            plan.clarification_question
        ),
    }