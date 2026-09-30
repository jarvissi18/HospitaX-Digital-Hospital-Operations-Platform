"""
HospitaX AI Operations Router

Provides controlled API endpoints for the AI Operations Assistant.

Flow:

    Natural language request
            ↓
    Gemini operation planner
            ↓
    Registered AI tool
            ↓
    PermissionEngine
            ↓
    Confirmation gate
            ↓
    Existing CRUD / business logic

Important confirmation rule:

    Initial request
            ↓
    AI planner
            ↓
    Permission + validation
            ↓
    Confirmation required
            ↓
    User confirms
            ↓
    Exact approved tool + arguments
            ↓
    Permission + safety re-check
            ↓
    Existing CRUD / business logic

The router never gives Gemini direct database access.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.gemini_operations import (
    describe_ai_plan,
    plan_ai_operation,
)
from app.ai.orchestrator import (
    ExecutionStatus,
    execute_ai_operation,
    get_ai_context,
)
from app.auth.dependencies import get_current_user
from app.database import get_db


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/ai-operations",
    tags=["AI Operations"],
)


# ============================================================
# REQUEST MODELS
# ============================================================


class AIOperationRequest(BaseModel):
    """
    Direct tool execution request.

    Used when the frontend already knows which tool should
    be executed.
    """

    message: str = Field(
        ...,
        min_length=1,
        max_length=8000,
    )

    tool_name: Optional[str] = None

    arguments: Dict[str, Any] = Field(
        default_factory=dict
    )

    patient_id: Optional[int] = None

    confirmed: bool = False


class AIInformationRequest(BaseModel):
    """
    Request for controlled AI context.
    """

    patient_id: Optional[int] = None

    include_operational: bool = True


class AIAssistantRequest(BaseModel):
    """
    Natural-language request for the AI Operations Assistant.

    During the initial request, only message/patient_id are
    normally supplied.

    During confirmation, the frontend sends the exact
    tool_name + arguments from the approved planner output.
    """

    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
    )

    tool_name: Optional[str] = None

    arguments: Dict[str, Any] = Field(
        default_factory=dict
    )

    patient_id: Optional[int] = None

    confirmed: bool = False


# ============================================================
# RESPONSE HELPER
# ============================================================


def _response_payload(response: Any) -> Dict[str, Any]:
    """
    Convert an AIResponse dataclass into a JSON-safe payload.
    """

    return {
        "status": (
            response.status.value
            if hasattr(response.status, "value")
            else response.status
        ),
        "message": response.message,
        "data": response.data,
        "tool_name": response.tool_name,
        "requires_confirmation": (
            response.requires_confirmation
        ),
        "confirmation_message": (
            response.confirmation_message
        ),
        "metadata": response.metadata,
    }


# ============================================================
# PLAN METADATA HELPER
# ============================================================


def _attach_plan_metadata(
    payload: Dict[str, Any],
    plan_description: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Attach planner information without replacing existing
    orchestrator metadata.
    """

    metadata = payload.get("metadata")

    if not isinstance(metadata, dict):
        metadata = {}

    metadata["plan"] = plan_description

    payload["metadata"] = metadata

    return payload


# ============================================================
# DIRECT TOOL EXECUTION
# ============================================================


@router.post(
    "/execute",
    summary="Execute a registered AI operation",
)
def execute_operation(
    request: AIOperationRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """
    Execute one explicitly selected AI operation.

    This endpoint is intentionally separate from natural-language
    planning.

    The selected tool is still checked by:
        - tool registry
        - PermissionEngine
        - confirmation rules
        - existing CRUD/business logic
    """

    response = execute_ai_operation(
        db=db,
        current_user=current_user,
        message=request.message,
        tool_name=request.tool_name,
        arguments=request.arguments,
        patient_id=request.patient_id,
        confirmed=request.confirmed,
    )

    return _response_payload(response)


# ============================================================
# NATURAL-LANGUAGE AI ASSISTANT
# ============================================================


@router.post(
    "/assistant",
    summary="Process a natural-language hospital operation",
)
def ai_assistant(
    request: AIAssistantRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """
    Process a natural-language request.

    Initial request:

        User message
            ↓
        Gemini planner
            ↓
        Validate selected tool
            ↓
        Confirmation / clarification
            ↓
        Existing orchestrator
            ↓
        Registered backend tool

    Confirmed request:

        Frontend sends exact approved tool + arguments
            ↓
        No new Gemini planning
            ↓
        Existing orchestrator
            ↓
        Permission + confirmation re-check
            ↓
        Registered backend tool

    This prevents a confirmed operation from being
    re-interpreted by Gemini.
    """

    try:

        # ====================================================
        # CONFIRMED EXECUTION PATH
        # ====================================================
        #
        # If the frontend has explicitly confirmed an
        # operation, the backend must use the exact tool
        # and arguments supplied by the frontend.
        #
        # Gemini must NOT reinterpret the request here.
        # ====================================================

        if request.confirmed:

            if not request.tool_name:
                return {
                    "status": "invalid",
                    "message": (
                        "A confirmed AI operation must include "
                        "the approved tool name."
                    ),
                    "data": None,
                    "tool_name": None,
                    "requires_confirmation": False,
                    "confirmation_message": None,
                    "metadata": {},
                }

            response = execute_ai_operation(
                db=db,
                current_user=current_user,
                message=request.message,
                tool_name=request.tool_name,
                arguments=request.arguments,
                patient_id=request.patient_id,
                confirmed=True,
            )

            return _response_payload(response)

        # ====================================================
        # INITIAL NATURAL-LANGUAGE REQUEST
        # ====================================================

        plan = plan_ai_operation(
            message=request.message,
            current_user=current_user,
            patient_id=request.patient_id,
        )

        # ====================================================
        # CLARIFICATION
        # ====================================================

        if plan.requires_clarification:

            return {
                "status": "needs_clarification",
                "message": (
                    plan.clarification_question
                    or "Additional information is required."
                ),
                "data": None,
                "tool_name": plan.tool_name,
                "requires_confirmation": False,
                "confirmation_message": None,
                "metadata": {
                    "plan": describe_ai_plan(plan),
                },
            }

        # ====================================================
        # SAFETY / VALIDATION
        # ====================================================

        if not plan.tool_name:

            return {
                "status": "invalid",
                "message": (
                    "No supported AI operation could be "
                    "determined from the request."
                ),
                "data": None,
                "tool_name": None,
                "requires_confirmation": False,
                "confirmation_message": None,
                "metadata": {
                    "plan": describe_ai_plan(plan),
                },
            }

        # ====================================================
        # EXECUTE THROUGH EXISTING ORCHESTRATOR
        # ====================================================
        #
        # confirmed=False here is intentional.
        #
        # If the selected operation requires confirmation,
        # the orchestrator returns NEEDS_CONFIRMATION.
        #
        # The frontend then sends the exact tool + arguments
        # with confirmed=True, which follows the deterministic
        # execution path above.
        # ====================================================

        response = execute_ai_operation(
            db=db,
            current_user=current_user,
            message=request.message,
            tool_name=plan.tool_name,
            arguments=plan.arguments,
            patient_id=request.patient_id,
            confirmed=False,
        )

        payload = _response_payload(response)

        # ====================================================
        # ATTACH PLANNER INFORMATION
        # ====================================================

        return _attach_plan_metadata(
            payload,
            describe_ai_plan(plan),
        )

    # ========================================================
    # VALIDATION ERRORS
    # ========================================================

    except ValueError as exc:

        return {
            "status": "invalid",
            "message": str(exc),
            "data": None,
            "tool_name": None,
            "requires_confirmation": False,
            "confirmation_message": None,
            "metadata": {},
        }

    # ========================================================
    # PERMISSION ERRORS
    # ========================================================

    except PermissionError as exc:

        return {
            "status": "denied",
            "message": str(exc),
            "data": None,
            "tool_name": None,
            "requires_confirmation": False,
            "confirmation_message": None,
            "metadata": {},
        }

    # ========================================================
    # RUNTIME / AI SERVICE ERRORS
    # ========================================================

    except RuntimeError as exc:

        return {
            "status": "error",
            "message": str(exc),
            "data": None,
            "tool_name": None,
            "requires_confirmation": False,
            "confirmation_message": None,
            "metadata": {},
        }


# ============================================================
# AI CONTEXT
# ============================================================


@router.post(
    "/context",
    summary="Build controlled AI context",
)
def get_context(
    request: AIInformationRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """
    Return controlled context available to the authenticated
    user's AI Operations Assistant.
    """

    context = get_ai_context(
        db=db,
        current_user=current_user,
        patient_id=request.patient_id,
        include_operational=request.include_operational,
    )

    return {
        "status": "success",
        "data": context,
    }


# ============================================================
# AI OPERATIONS STATUS
# ============================================================


@router.get(
    "/status",
    summary="Get AI Operations Assistant status",
)
def ai_operations_status(
    current_user: Any = Depends(get_current_user),
):
    """
    Basic authenticated health/status endpoint.
    """

    return {
        "status": "online",
        "service": "HospitaX AI Operations Assistant",
        "authenticated": True,
        "user_id": getattr(
            current_user,
            "id",
            None,
        ),
        "role": getattr(
            current_user,
            "role",
            None,
        ),
    }