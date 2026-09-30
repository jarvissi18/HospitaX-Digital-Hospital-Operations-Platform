"""
HospitaX AI - Gemini Service

Responsibilities
----------------
1. Provide the centralized Gemini API communication layer.
2. Preserve patient voice extraction.
3. Provide AI Operations natural-language responses.
4. Provide structured intent extraction.
5. Handle Gemini quota/API failures safely.
6. Never access the database directly.
7. Never execute CRUD operations directly.
8. Never make authorization decisions.
9. Never expose the Gemini API key.
10. Never claim an operation succeeded unless that information
    comes from authorized backend tool results.

Architecture
------------

    AI Router
        ↓
    AI Orchestrator
        ↓
    Gemini Service
        ↓
    Google Gemini API

The Orchestrator remains responsible for:
- authentication
- authorization
- PermissionEngine
- tool selection validation
- confirmation
- tool execution
- business logic
- database access
"""


from __future__ import annotations


# ============================================================
# STANDARD LIBRARY
# ============================================================

import json
import os
import re
from typing import Any, Dict, Optional


# ============================================================
# ENVIRONMENT
# ============================================================

from dotenv import load_dotenv


load_dotenv()


# ============================================================
# GEMINI SDK
# ============================================================

from google import genai
from google.genai import types

from google.api_core.exceptions import (
    ResourceExhausted,
)


# ============================================================
# HOSPITAX AI PROMPTS
# ============================================================

from app.ai.prompts import (
    build_full_system_prompt,
)


# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)


if not GEMINI_API_KEY:

    raise ValueError(
        "GEMINI_API_KEY not found in .env file."
    )


MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash",
)


# ============================================================
# GEMINI CLIENT CONFIGURATION
# ============================================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ============================================================
# CONSTANTS
# ============================================================

MAX_PROMPT_LENGTH = 50000

MAX_USER_MESSAGE_LENGTH = 8000

MAX_CONTEXT_LENGTH = 50000

MAX_TOOL_RESULTS_LENGTH = 50000

MAX_VOICE_TRANSCRIPT_LENGTH = 10000

MAX_INTENT_TOOLS_LENGTH = 30000


# ============================================================
# COMMON TEXT HELPERS
# ============================================================


def clean_text(
    text: Any,
) -> str:
    """
    Normalize generated text.

    Returns an empty string for None/empty values.
    """

    if text is None:

        return ""

    return re.sub(
        r"\n{3,}",
        "\n\n",
        str(text).strip(),
    )


def clean_json(
    text: str,
) -> str:
    """
    Remove common Markdown code fences and surrounding text
    from a JSON response.
    """

    if not text:

        return ""

    cleaned = str(
        text
    ).strip()

    # --------------------------------------------------------
    # Remove ```json
    # --------------------------------------------------------

    cleaned = re.sub(
        r"^```json\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Remove generic ```
    # --------------------------------------------------------

    cleaned = re.sub(
        r"^```\s*",
        "",
        cleaned,
    )

    cleaned = re.sub(
        r"\s*```$",
        "",
        cleaned,
    )

    cleaned = cleaned.strip()

    # --------------------------------------------------------
    # If Gemini added explanatory text around JSON,
    # extract the JSON object/array boundaries.
    # --------------------------------------------------------

    first_object = cleaned.find(
        "{"
    )

    last_object = cleaned.rfind(
        "}"
    )

    first_array = cleaned.find(
        "["
    )

    last_array = cleaned.rfind(
        "]"
    )

    # Prefer whichever valid JSON structure appears first.
    if (
        first_object >= 0
        and last_object > first_object
    ):

        if (
            first_array < 0
            or first_object <= first_array
        ):

            cleaned = cleaned[
                first_object:last_object + 1
            ]

    elif (
        first_array >= 0
        and last_array > first_array
    ):

        cleaned = cleaned[
            first_array:last_array + 1
        ]

    return cleaned.strip()


def get_response_text(
    response: Any,
) -> str:
    """
    Safely extract text from a Gemini response.

    Supports the current Google GenAI SDK response shape.

    Some Gemini responses can have no text content.
    Never allow that to crash the application.
    """

    if response is None:

        return ""

    # --------------------------------------------------------
    # Current Google GenAI SDK .text property
    # --------------------------------------------------------

    try:

        text = getattr(
            response,
            "text",
            None,
        )

        if text:

            return clean_text(
                text
            )

    except Exception:
        pass

    # --------------------------------------------------------
    # Candidate/content fallback
    # --------------------------------------------------------

    try:

        candidates = getattr(
            response,
            "candidates",
            None,
        )

        if candidates:

            for candidate in candidates:

                content = getattr(
                    candidate,
                    "content",
                    None,
                )

                if content is None:
                    continue

                parts = getattr(
                    content,
                    "parts",
                    None,
                )

                if not parts:
                    continue

                collected = []

                for part in parts:

                    part_text = getattr(
                        part,
                        "text",
                        None,
                    )

                    if part_text:

                        collected.append(
                            str(part_text)
                        )

                if collected:

                    return clean_text(
                        "\n".join(
                            collected
                        )
                    )

    except Exception:
        pass

    return ""


def validate_text(
    text: Optional[str],
    *,
    max_length: int = 20000,
) -> str:
    """
    Validate text before sending it to Gemini.
    """

    if text is None:

        raise ValueError(
            "Text cannot be empty."
        )

    normalized = str(
        text
    ).strip()

    if not normalized:

        raise ValueError(
            "Text cannot be empty."
        )

    if len(normalized) > max_length:

        raise ValueError(
            "Text exceeds the maximum allowed length "
            f"of {max_length} characters."
        )

    return normalized


# ============================================================
# GEMINI ERROR HELPERS
# ============================================================


def _is_quota_error(
    exc: Exception,
) -> bool:
    """
    Detect Gemini quota/rate-limit errors across the
    current Google GenAI SDK and underlying HTTP/API errors.

    The new google-genai SDK does not necessarily expose
    every 429 response as google.api_core.ResourceExhausted,
    so we inspect the exception safely as a fallback.
    """

    if isinstance(
        exc,
        ResourceExhausted,
    ):
        return True

    status_code = getattr(
        exc,
        "status_code",
        None,
    )

    if status_code == 429:
        return True

    code = getattr(
        exc,
        "code",
        None,
    )

    if code == 429:
        return True

    response = getattr(
        exc,
        "response",
        None,
    )

    if response is not None:

        response_status = getattr(
            response,
            "status_code",
            None,
        )

        if response_status == 429:
            return True

    message = str(
        exc
    ).lower()

    quota_markers = (
        "429",
        "resource exhausted",
        "resource_exhausted",
        "quota exceeded",
        "quotaexceeded",
        "rate limit",
        "ratelimit",
        "too many requests",
        "generate_content_free_tier_requests",
    )

    return any(
        marker in message
        for marker in quota_markers
    )


def _raise_normalized_gemini_error(
    exc: Exception,
) -> None:
    """
    Convert current Gemini quota errors into the
    ResourceExhausted type already handled by the
    existing HospitaX AI layers.

    Other exceptions are re-raised unchanged.
    """

    if _is_quota_error(
        exc
    ):

        raise ResourceExhausted(
            "Gemini API quota exceeded."
        ) from exc

    raise exc


# ============================================================
# LOW-LEVEL GEMINI CALL
# ============================================================


def generate_content(
    prompt: str,
    *,
    system_instruction: Optional[str] = None,
    stream: bool = False,
) -> Any:
    """
    Centralized Gemini generation call.

    This function knows nothing about:
    - users
    - roles
    - permissions
    - patients
    - database
    - CRUD

    It only communicates with Gemini.

    Uses the current Google GenAI SDK:
        google-genai
    """

    prompt = validate_text(
        prompt,
        max_length=MAX_PROMPT_LENGTH,
    )

    if system_instruction:

        system_instruction = validate_text(
            system_instruction,
            max_length=MAX_PROMPT_LENGTH,
        )

    try:

        # ----------------------------------------------------
        # CURRENT GOOGLE GENAI SDK
        # ----------------------------------------------------
        #
        # Non-streaming:
        #
        # client.models.generate_content(...)
        #
        # Streaming:
        #
        # client.models.generate_content_stream(...)
        #
        # ----------------------------------------------------

        config = None

        if system_instruction:

            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
            )

        if stream:

            return client.models.generate_content_stream(
                model=MODEL_NAME,
                contents=prompt,
                config=config,
            )

        return client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config,
        )

    except ResourceExhausted:

        raise

    except Exception as exc:

        _raise_normalized_gemini_error(
            exc
        )

        raise


# ============================================================
# PATIENT VOICE REGISTRATION
# ============================================================


def parse_patient_voice(
    transcript: str,
) -> Dict[str, Any]:
    """
    Convert a patient registration voice transcript into
    explicitly mentioned patient fields.

    Allowed fields:
    - name
    - age
    - gender
    - village
    - disease
    - mobile

    Important:
    This function extracts information only.

    It does not create/update a patient record.
    """

    try:

        transcript = validate_text(
            transcript,
            max_length=MAX_VOICE_TRANSCRIPT_LENGTH,
        )

    except ValueError as exc:

        return {
            "success": False,
            "message": str(exc),
        }

    prompt = f"""
You are an AI hospital data-entry assistant.

Extract ONLY patient information explicitly mentioned
in the transcript.

STRICT RULES:

1. Return ONLY valid JSON.

2. Do NOT guess values.

3. Do NOT create fake values.

4. Do NOT infer missing fields.

5. Do NOT include fields that are not mentioned.

6. If only the name is spoken, return only the name.

7. If only the age is spoken, return only the age.

8. Never return empty strings.

9. Never return 0 for a missing age.

10. Return only detected fields.

11. Do not add explanations outside JSON.

Allowed fields:

- name
- age
- gender
- village
- disease
- mobile

Examples:

Transcript:
Rahul

Output:
{{"name":"Rahul"}}

Transcript:
Age 25

Output:
{{"age":25}}

Transcript:
Village Udgir

Output:
{{"village":"Udgir"}}

Transcript:
Mobile 9876543210

Output:
{{"mobile":"9876543210"}}

Transcript:
Rahul age 25 fever

Output:
{{
  "name": "Rahul",
  "age": 25,
  "disease": "Fever"
}}

Transcript:
{transcript}

Return ONLY JSON.
"""

    try:

        response = generate_content(
            prompt
        )

        text = get_response_text(
            response
        )

        if not text:

            return {
                "success": False,
                "message": (
                    "Empty response received from Gemini."
                ),
            }

        cleaned_json = clean_json(
            text
        )

        data = json.loads(
            cleaned_json
        )

        if not isinstance(
            data,
            dict,
        ):

            return {
                "success": False,
                "message": (
                    "AI returned an invalid patient object."
                ),
            }

        allowed_fields = {
            "name",
            "age",
            "gender",
            "village",
            "disease",
            "mobile",
        }

        cleaned_data: Dict[str, Any] = {}

        for key, value in data.items():

            if key not in allowed_fields:
                continue

            if value is None:
                continue

            if (
                isinstance(
                    value,
                    str,
                )
                and not value.strip()
            ):
                continue

            if key == "age":

                try:

                    age = int(
                        value
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue

                if age <= 0:
                    continue

                if age > 130:
                    continue

                cleaned_data[key] = age

                continue

            cleaned_data[key] = value

        cleaned_data["success"] = True

        return cleaned_data

    except ResourceExhausted:

        return {
            "success": False,
            "message": (
                "Gemini API quota exceeded. "
                "Please try again later."
            ),
        }

    except json.JSONDecodeError:

        return {
            "success": False,
            "message": (
                "AI returned invalid JSON."
            ),
        }

    except Exception as exc:

        print(
            "[GEMINI VOICE ERROR]",
            repr(exc),
        )

        return {
            "success": False,
            "message": (
                "Something went wrong while "
                "processing the patient voice input."
            ),
        }


# ============================================================
# AI OPERATIONS SYSTEM PROMPT
# ============================================================


def get_operations_system_prompt() -> str:
    """
    Return the centralized HospitaX AI Operations system prompt.
    """

    return build_full_system_prompt()


# ============================================================
# AI OPERATIONS RESPONSE
# ============================================================


def generate_operations_response(
    *,
    user_message: str,
    context: str,
    tool_results: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate the final natural-language response for the
    AI Operations Assistant.

    IMPORTANT
    ---------
    This function does NOT:

    - select permissions
    - execute tools
    - access the database
    - modify records
    - decide authorization

    It only converts already-authorized context/tool results
    into a professional response.
    """

    try:

        user_message = validate_text(
            user_message,
            max_length=MAX_USER_MESSAGE_LENGTH,
        )

        context = validate_text(
            context,
            max_length=MAX_CONTEXT_LENGTH,
        )

        if tool_results is not None:

            tool_results = validate_text(
                tool_results,
                max_length=MAX_TOOL_RESULTS_LENGTH,
            )

    except ValueError as exc:

        return {
            "success": False,
            "message": str(exc),
        }

    system_prompt = (
        get_operations_system_prompt()
    )

    prompt_parts = [
        "You are responding to an authenticated "
        "HospitaX hospital staff member.",
        "",
        "IMPORTANT:",
        "Use only the authorized application context "
        "and authorized tool results supplied below.",
        "",
        "Do not invent hospital data.",
        "Do not invent patient information.",
        "Do not invent clinical findings.",
        "Do not invent IDs.",
        "Do not invent dates or times.",
        "Do not claim an operation succeeded unless "
        "the authorized tool results explicitly indicate success.",
        "",
        "AUTHORIZED APPLICATION CONTEXT:",
        context,
    ]

    if tool_results:

        prompt_parts.extend(
            [
                "",
                "AUTHORIZED TOOL RESULTS:",
                tool_results,
            ]
        )

    prompt_parts.extend(
        [
            "",
            "USER REQUEST:",
            user_message,
            "",
            "Return a concise, factual and professional "
            "response.",
        ]
    )

    prompt = "\n".join(
        prompt_parts
    )

    try:

        response = generate_content(
            prompt,
            system_instruction=system_prompt,
        )

        text = get_response_text(
            response
        )

        if not text:

            return {
                "success": False,
                "message": (
                    "Gemini returned an empty response."
                ),
            }

        return {
            "success": True,
            "message": text,
        }

    except ResourceExhausted:

        return {
            "success": False,
            "message": (
                "Gemini API quota exceeded. "
                "Please try again later."
            ),
        }

    except Exception as exc:

        print(
            "[GEMINI OPERATIONS ERROR]",
            repr(exc),
        )

        return {
            "success": False,
            "message": (
                "Something went wrong while generating "
                "the AI Operations response."
            ),
        }


# ============================================================
# STRUCTURED INTENT EXTRACTION
# ============================================================


def extract_operations_intent(
    *,
    user_message: str,
    available_tools: str,
    context: str = "",
) -> Dict[str, Any]:
    """
    Convert a natural-language HospitaX request into a
    structured intent.

    IMPORTANT:
    This function does NOT authorize or execute anything.

    PermissionEngine + Orchestrator remain authoritative.
    """

    try:

        user_message = validate_text(
            user_message,
            max_length=MAX_USER_MESSAGE_LENGTH,
        )

        available_tools = validate_text(
            available_tools,
            max_length=MAX_INTENT_TOOLS_LENGTH,
        )

        if context:

            context = validate_text(
                context,
                max_length=MAX_CONTEXT_LENGTH,
            )

    except ValueError as exc:

        return {
            "success": False,
            "message": str(exc),
        }

    prompt = f"""
Convert the user's HospitaX request into a structured
JSON intent.

You MUST select an operation ONLY from the available
tool names provided below.

AVAILABLE TOOLS:

{available_tools}

AUTHORIZED CONTEXT:

{context or "No additional context provided."}

USER REQUEST:

{user_message}

Return ONLY valid JSON using exactly:

{{
  "request_type": "information|action|clarification|unknown",
  "tool_name": null,
  "patient_id": null,
  "arguments": {{}},
  "requires_clarification": false,
  "clarification_question": null
}}

RULES:

1. Never invent patient IDs.

2. Never invent dates.

3. Never invent names.

4. Never invent missing arguments.

5. If multiple patients could match,
   request clarification.

6. If the request cannot be mapped to an available
   tool, use tool_name=null.

7. Do not perform any action.

8. Do not claim that an action succeeded.

9. Do not decide authorization.

10. The backend PermissionEngine is authoritative.

11. Return ONLY JSON.
"""

    try:

        response = generate_content(
            prompt,
            system_instruction=(
                "You are a strict structured intent "
                "extraction component for HospitaX. "
                "Return only valid JSON."
            ),
        )

        text = clean_json(
            get_response_text(
                response
            )
        )

        if not text:

            return {
                "success": False,
                "message": (
                    "Gemini returned an empty intent."
                ),
            }

        data = json.loads(
            text
        )

        if not isinstance(
            data,
            dict,
        ):

            return {
                "success": False,
                "message": (
                    "Gemini returned an invalid intent."
                ),
            }

        # ----------------------------------------------------
        # REQUEST TYPE
        # ----------------------------------------------------

        request_type = data.get(
            "request_type"
        )

        allowed_request_types = {
            "information",
            "action",
            "clarification",
            "unknown",
        }

        if request_type not in allowed_request_types:

            request_type = "unknown"

        # ----------------------------------------------------
        # TOOL NAME
        # ----------------------------------------------------

        tool_name = data.get(
            "tool_name"
        )

        if tool_name is not None:

            tool_name = str(
                tool_name
            ).strip()

            if not tool_name:

                tool_name = None

        # ----------------------------------------------------
        # PATIENT ID
        # ----------------------------------------------------

        patient_id = data.get(
            "patient_id"
        )

        if patient_id is not None:

            try:

                patient_id = int(
                    patient_id
                )

                if patient_id <= 0:

                    patient_id = None

            except (
                TypeError,
                ValueError,
            ):

                patient_id = None

        # ----------------------------------------------------
        # ARGUMENTS
        # ----------------------------------------------------

        arguments = data.get(
            "arguments"
        )

        if not isinstance(
            arguments,
            dict,
        ):

            arguments = {}

        # Copy to prevent accidental mutation.
        arguments = dict(
            arguments
        )

        # ----------------------------------------------------
        # CLARIFICATION
        # ----------------------------------------------------

        requires_clarification = bool(
            data.get(
                "requires_clarification",
                False,
            )
        )

        clarification_question = data.get(
            "clarification_question"
        )

        if clarification_question is not None:

            clarification_question = str(
                clarification_question
            ).strip()

            if not clarification_question:

                clarification_question = None

        if (
            request_type == "clarification"
            and not clarification_question
        ):

            clarification_question = (
                "Please provide the missing information "
                "required for this request."
            )

            requires_clarification = True

        return {
            "success": True,
            "intent": {
                "request_type": request_type,
                "tool_name": tool_name,
                "patient_id": patient_id,
                "arguments": arguments,
                "requires_clarification": (
                    requires_clarification
                ),
                "clarification_question": (
                    clarification_question
                ),
            },
        }

    except ResourceExhausted:

        return {
            "success": False,
            "message": (
                "Gemini API quota exceeded. "
                "Please try again later."
            ),
        }

    except json.JSONDecodeError:

        return {
            "success": False,
            "message": (
                "AI returned invalid intent JSON."
            ),
        }

    except Exception as exc:

        print(
            "[GEMINI INTENT ERROR]",
            repr(exc),
        )

        return {
            "success": False,
            "message": (
                "Something went wrong while "
                "processing the AI request."
            ),
        }


# ============================================================
# SAFE CONFIGURATION INFORMATION
# ============================================================


def get_gemini_configuration() -> Dict[str, Any]:
    """
    Return safe Gemini configuration information.

    NEVER return the actual API key.
    """

    return {
        "configured": bool(
            GEMINI_API_KEY
        ),
        "model": MODEL_NAME,
        "provider": "Google Gemini",
        "sdk": "google-genai",
    }