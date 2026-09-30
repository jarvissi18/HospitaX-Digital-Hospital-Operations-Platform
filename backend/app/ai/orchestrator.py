"""
HospitaX AI Operations Assistant - Orchestrator

This module is the central coordinator for authenticated
AI Operations.

Architecture
------------

User Request
    ↓
Authentication
    ↓
AI Planner
    ↓
Tool Validation
    ↓
PermissionEngine
    ↓
Confirmation Gate
    ↓
Argument Normalization
    ↓
Registered AI Tool
    ↓
Existing CRUD / Business Logic
    ↓
Safe Serialization
    ↓
Gemini Response Generator
    ↓
Professional AI Response

IMPORTANT
---------
The orchestrator does NOT directly access database tables.

All operational execution must pass through:
    - registered AI tools
    - PermissionEngine
    - existing CRUD / business logic

Gemini does NOT execute database operations.

Gemini is used only for:
    1. Planning / intent understanding
    2. Final natural-language response generation

The orchestrator remains authoritative for:
    - authentication
    - authorization
    - confirmation
    - tool selection validation
    - argument validation
    - tool execution
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.ai.context import AIContext, build_ai_context

from app.ai.permissions import (
    Action,
    PermissionEngine,
    Resource,
    Scope,
    permission_engine,
)

from app.ai.tools import (
    execute_tool,
    get_tool,
    list_tools,
    tool_requires_confirmation,
)

from app.ai.gemini_service import (
    generate_operations_response,
)

from app.ai.gemini_operations import (
    AIOperationPlan,
    plan_ai_operation,
    describe_ai_plan,
)


# ============================================================
# REQUEST TYPES
# ============================================================


class RequestType(str, Enum):
    INFORMATION = "information"
    ACTION = "action"
    UNKNOWN = "unknown"


class ExecutionStatus(str, Enum):
    SUCCESS = "success"
    NEEDS_CONFIRMATION = "needs_confirmation"
    DENIED = "denied"
    NOT_FOUND = "not_found"
    INVALID = "invalid"
    ERROR = "error"


# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================


@dataclass
class AIRequest:
    """
    Normalized AI operation request.

    patient_id may be supplied at the request level.

    tool_name is optional because a natural-language request
    may first need to pass through the Gemini planner.
    """

    message: str
    patient_id: Optional[int] = None
    tool_name: Optional[str] = None
    arguments: Optional[Dict[str, Any]] = None
    request_type: RequestType = RequestType.UNKNOWN
    confirmed: bool = False


@dataclass
class AIResponse:
    """
    Standard response returned by the AI Operations layer.
    """

    status: ExecutionStatus
    message: str
    data: Any = None
    tool_name: Optional[str] = None
    requires_confirmation: bool = False
    confirmation_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ============================================================
# SERIALIZATION
# ============================================================


def _serialize_value(value: Any) -> Any:
    """
    Convert common SQLAlchemy/Pydantic/Python values into
    JSON-safe structures.

    SQLAlchemy internals are intentionally not exposed.
    """

    if value is None:
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Enum):
        return value.value

    if isinstance(value, dict):
        return {
            str(key): _serialize_value(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple, set)):
        return [
            _serialize_value(item)
            for item in value
        ]

    if hasattr(value, "model_dump"):
        try:
            return _serialize_value(
                value.model_dump()
            )
        except Exception:
            pass

    if hasattr(value, "dict"):
        try:
            return _serialize_value(
                value.dict()
            )
        except Exception:
            pass

    if hasattr(value, "__dict__"):
        try:
            data = {}

            for key, item in value.__dict__.items():

                if key.startswith("_"):
                    continue

                data[key] = _serialize_value(item)

            return data

        except Exception:
            pass

    return str(value)


def _serialize_plan(
    plan: AIOperationPlan,
) -> Dict[str, Any]:
    """
    Serialize an AI operation plan safely.
    """

    return describe_ai_plan(plan)


# ============================================================
# RESPONSE HELPERS
# ============================================================


def _build_ai_clarification_response(
    *,
    plan: AIOperationPlan,
) -> AIResponse:
    """
    Convert a planner clarification request into the standard
    AIResponse structure.
    """

    message = (
        plan.clarification_question
        or "Please provide the missing information."
    )

    return AIResponse(
        status=ExecutionStatus.INVALID,
        message=message,
        data=None,
        tool_name=plan.tool_name,
        requires_confirmation=False,
        confirmation_message=None,
        metadata={
            "planner": _serialize_plan(plan),
            "requires_clarification": True,
        },
    )


def _build_planner_error_response(
    *,
    error: Exception,
) -> AIResponse:
    """
    Build a safe response when Gemini planning fails.
    """

    return AIResponse(
        status=ExecutionStatus.ERROR,
        message=(
            "Unable to understand the AI operation request."
        ),
        data=None,
        tool_name=None,
        requires_confirmation=False,
        confirmation_message=None,
        metadata={
            "error_type": type(error).__name__,
        },
    )


# ============================================================
# ORCHESTRATOR
# ============================================================


def _build_fallback_success_message(
    *,
    tool_name: str,
    tool_result: Any,
) -> str:
    """
    Build a deterministic success message when the optional
    final Gemini response generation is unavailable.

    IMPORTANT:
    This helper does not execute operations, access the database,
    or change authorization/business logic. It only converts an
    already-completed tool result into a safe fallback message.
    """

    if tool_name == "get_attendance":
        if isinstance(tool_result, list):
            count = len(tool_result)
            if count == 1:
                return "Attendance record retrieved successfully."
            return (
                f"Attendance records retrieved successfully "
                f"({count} records)."
            )

        if isinstance(tool_result, dict):
            return "Attendance record retrieved successfully."

        return "Attendance information retrieved successfully."

    return (
        f"Operation '{tool_name}' completed successfully. "
        "The requested result was retrieved."
    )


class AIOperationsOrchestrator:
    """
    Central coordinator for HospitaX AI Operations.

    Responsibilities
    ----------------
    1. Validate incoming requests.
    2. Ask Gemini to create a controlled plan when needed.
    3. Validate registered tools.
    4. Check permissions.
    5. Enforce confirmation requirements.
    6. Normalize patient-scoped arguments.
    7. Execute registered tools.
    8. Serialize results safely.
    9. Generate a final natural-language response.
    """

    def __init__(
        self,
        *,
        engine: PermissionEngine = permission_engine,
    ) -> None:
        self.engine = engine

    # ========================================================
    # REQUEST VALIDATION
    # ========================================================

    def _validate_message(
        self,
        message: Optional[str],
    ) -> Optional[str]:
        """
        Validate the human-readable request message.
        """

        if message is None:
            return "Message is required."

        if not isinstance(message, str):
            return "Message must be a string."

        message = message.strip()

        if not message:
            return "Message cannot be empty."

        if len(message) > 4000:
            return "Message is too long."

        return None

    # ========================================================
    # TOOL VALIDATION
    # ========================================================

    def _validate_tool(
        self,
        tool_name: Optional[str],
    ) -> Optional[AIResponse]:
        """
        Validate that the requested tool is explicitly
        registered.
        """

        if not tool_name:
            return AIResponse(
                status=ExecutionStatus.INVALID,
                message=(
                    "AI operation tool_name is required."
                ),
            )

        tool = get_tool(tool_name)

        if tool is None:
            return AIResponse(
                status=ExecutionStatus.INVALID,
                message=(
                    f"Unknown AI operation: {tool_name}"
                ),
                tool_name=tool_name,
            )

        return None

    # ========================================================
    # PERMISSION CHECK
    # ========================================================

    def _check_tool_permission(
        self,
        *,
        current_user: Any,
        tool_name: str,
    ) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Check whether the authenticated user can perform
        the requested tool operation.
        """

        tool = get_tool(tool_name)

        if tool is None:
            return False, None

        role = getattr(
            current_user,
            "role",
            None,
        )

        if not role:
            return False, {
                "resource": tool.resource.value,
                "action": tool.action.value,
            }

        allowed = self.engine.is_allowed(
            role=role,
            resource=tool.resource,
            action=tool.action,
        )

        if not allowed:
            return False, {
                "resource": tool.resource.value,
                "action": tool.action.value,
            }

        scope = self.engine.get_scope(
            role=role,
            resource=tool.resource,
            action=tool.action,
        )

        if scope == Scope.NONE:
            return False, {
                "resource": tool.resource.value,
                "action": tool.action.value,
                "scope": scope.value,
            }

        return True, {
            "resource": tool.resource.value,
            "action": tool.action.value,
            "scope": scope.value,
        }

    # ========================================================
    # CONFIRMATION
    # ========================================================

    def _build_confirmation_response(
        self,
        *,
        tool_name: str,
        metadata: Optional[Dict[str, Any]],
    ) -> AIResponse:
        """
        Build a standard confirmation response.
        """

        return AIResponse(
            status=ExecutionStatus.NEEDS_CONFIRMATION,
            message=(
                "This operation requires explicit "
                "confirmation before it can be executed."
            ),
            data=None,
            tool_name=tool_name,
            requires_confirmation=True,
            confirmation_message=(
                f"Confirm execution of '{tool_name}'?"
            ),
            metadata=metadata,
        )

    # ========================================================
    # PATIENT ARGUMENT NORMALIZATION
    # ========================================================

    def _normalize_arguments(
        self,
        *,
        arguments: Optional[Dict[str, Any]],
        patient_id: Optional[int],
    ) -> Dict[str, Any]:
        """
        Normalize arguments before passing them to a tool.

        Rules
        -----
        1. Never mutate the original dictionary.
        2. Request-level patient_id is injected safely.
        3. Conflicting patient IDs fail closed.
        """

        normalized: Dict[str, Any] = dict(
            arguments or {}
        )

        if patient_id is None:
            return normalized

        existing_patient_id = normalized.get(
            "patient_id"
        )

        if existing_patient_id is not None:

            try:
                existing_patient_id_int = int(
                    existing_patient_id
                )

            except (
                TypeError,
                ValueError,
            ):

                raise ValueError(
                    "Argument 'patient_id' must be a valid integer."
                )

            if existing_patient_id_int != int(
                patient_id
            ):

                raise ValueError(
                    "Conflicting patient_id values were supplied "
                    "at request and argument levels."
                )

            normalized["patient_id"] = (
                existing_patient_id_int
            )

        else:
            normalized["patient_id"] = int(
                patient_id
            )

        return normalized

    # ========================================================
    # CONTEXT
    # ========================================================

    def build_context(
        self,
        *,
        db: Session,
        current_user: Any,
        patient_id: Optional[int] = None,
        include_operational: bool = True,
    ) -> AIContext:
        """
        Build an authorized AI context.
        """

        return build_ai_context(
            db=db,
            current_user=current_user,
            patient_id=patient_id,
            include_operational=include_operational,
        )

    # ========================================================
    # PLANNING
    # ========================================================

    def _create_operation_plan(
        self,
        *,
        message: str,
        current_user: Any,
        patient_id: Optional[int],
    ) -> AIOperationPlan:
        """
        Ask Gemini to convert the natural-language request into
        one controlled operation plan.

        Gemini only plans.

        It does not execute anything.
        """

        return plan_ai_operation(
            message=message,
            current_user=current_user,
            patient_id=patient_id,
            engine=self.engine,
        )

    # ========================================================
    # FINAL AI RESPONSE
    # ========================================================

    def _generate_final_response(
        self,
        *,
        message: str,
        current_user: Any,
        tool_name: str,
        tool_result: Any,
        patient_id: Optional[int],
    ) -> Dict[str, Any]:
        """
        Generate the final professional natural-language
        response after the authorized tool has executed.

        This function does not execute any operation.
        """

        serialized_result = _serialize_value(
            tool_result
        )

        context_text = (
            f"Authenticated user role: "
            f"{getattr(current_user, 'role', 'Unknown')}\n"
            f"Authenticated user ID: "
            f"{getattr(current_user, 'id', None)}\n"
            f"Selected patient ID: "
            f"{patient_id}\n"
            f"Executed authorized tool: "
            f"{tool_name}"
        )

        tool_results_text = json_safe_dump(
            serialized_result
        )

        return generate_operations_response(
            user_message=message,
            context=context_text,
            tool_results=tool_results_text,
        )

    # ========================================================
    # EXECUTION
    # ========================================================

    def execute(
        self,
        *,
        db: Session,
        current_user: Any,
        message: str,
        tool_name: Optional[str] = None,
        arguments: Optional[Dict[str, Any]] = None,
        patient_id: Optional[int] = None,
        confirmed: bool = False,
    ) -> AIResponse:
        """
        Execute one controlled AI operation.

        If tool_name is missing:

            message
                ↓
            Gemini planner
                ↓
            controlled tool_name + arguments

        If tool_name is already supplied:

            existing explicit operation flow is preserved.

        After successful execution:

            tool result
                ↓
            Gemini response generator
                ↓
            final professional message
        """

        # ----------------------------------------------------
        # MESSAGE VALIDATION
        # ----------------------------------------------------

        message_error = self._validate_message(
            message
        )

        if message_error:
            return AIResponse(
                status=ExecutionStatus.INVALID,
                message=message_error,
            )

        # ----------------------------------------------------
        # NATURAL-LANGUAGE PLANNING
        # ----------------------------------------------------

        planner_metadata: Optional[Dict[str, Any]] = None

        if not tool_name:

            try:
                plan = self._create_operation_plan(
                    message=message,
                    current_user=current_user,
                    patient_id=patient_id,
                )

            except ValueError as exc:
                return AIResponse(
                    status=ExecutionStatus.INVALID,
                    message=str(exc),
                    metadata={
                        "planner_error": True,
                    },
                )

            except Exception as exc:
                return _build_planner_error_response(
                    error=exc
                )

            planner_metadata = {
                "plan": _serialize_plan(plan),
            }

            # ------------------------------------------------
            # PLANNER CLARIFICATION
            # ------------------------------------------------

            if plan.requires_clarification:

                return AIResponse(
                    status=ExecutionStatus.INVALID,
                    message=(
                        plan.clarification_question
                        or "Please provide the missing information."
                    ),
                    data=None,
                    tool_name=plan.tool_name,
                    requires_confirmation=False,
                    confirmation_message=None,
                    metadata=planner_metadata,
                )

            if not plan.tool_name:

                return AIResponse(
                    status=ExecutionStatus.INVALID,
                    message=(
                        "I could not map your request to a "
                        "supported hospital operation."
                    ),
                    data=None,
                    tool_name=None,
                    requires_confirmation=False,
                    confirmation_message=None,
                    metadata=planner_metadata,
                )

            # -----------------------------------------------
            # Use Gemini-selected tool and arguments
            # -----------------------------------------------

            tool_name = plan.tool_name

            arguments = dict(
                plan.arguments
            )

        # ----------------------------------------------------
        # TOOL VALIDATION
        # ----------------------------------------------------

        tool_error = self._validate_tool(
            tool_name
        )

        if tool_error is not None:

            if planner_metadata:
                if tool_error.metadata is None:
                    tool_error.metadata = {}

                tool_error.metadata.update(
                    planner_metadata
                )

            return tool_error

        assert tool_name is not None

        # ----------------------------------------------------
        # PERMISSION VALIDATION
        # ----------------------------------------------------

        allowed, metadata = (
            self._check_tool_permission(
                current_user=current_user,
                tool_name=tool_name,
            )
        )

        if planner_metadata:
            metadata = {
                **(metadata or {}),
                **planner_metadata,
            }

        if not allowed:

            return AIResponse(
                status=ExecutionStatus.DENIED,
                message=(
                    "You are not authorized to "
                    "perform this operation."
                ),
                data=None,
                tool_name=tool_name,
                requires_confirmation=False,
                confirmation_message=None,
                metadata=metadata,
            )

        # ----------------------------------------------------
        # CONFIRMATION VALIDATION
        # ----------------------------------------------------

        try:

            requires_confirmation = (
                tool_requires_confirmation(
                    tool_name,
                    current_user,
                    self.engine,
                )
            )

        except ValueError as exc:

            return AIResponse(
                status=ExecutionStatus.INVALID,
                message=str(exc),
                tool_name=tool_name,
                metadata=metadata,
            )

        if requires_confirmation and not confirmed:

            return self._build_confirmation_response(
                tool_name=tool_name,
                metadata=metadata,
            )

        # ----------------------------------------------------
        # ARGUMENT NORMALIZATION
        # ----------------------------------------------------

        try:

            normalized_arguments = (
                self._normalize_arguments(
                    arguments=arguments,
                    patient_id=patient_id,
                )
            )

        except ValueError as exc:

            return AIResponse(
                status=ExecutionStatus.INVALID,
                message=str(exc),
                tool_name=tool_name,
                metadata=metadata,
            )

        # ----------------------------------------------------
        # SAFE PATIENT ID FOR FINAL RESPONSE
        # ----------------------------------------------------

        final_patient_id = patient_id

        if final_patient_id is None:

            possible_patient_id = (
                normalized_arguments.get(
                    "patient_id"
                )
            )

            if possible_patient_id is not None:

                try:
                    final_patient_id = int(
                        possible_patient_id
                    )

                except (
                    TypeError,
                    ValueError,
                ):
                    final_patient_id = None

        # ----------------------------------------------------
        # TOOL EXECUTION
        # ----------------------------------------------------

        try:

            result = execute_tool(
                tool_name=tool_name,
                db=db,
                current_user=current_user,
                arguments=normalized_arguments,
                engine=self.engine,
            )

        except PermissionError as exc:

            return AIResponse(
                status=ExecutionStatus.DENIED,
                message=str(exc),
                data=None,
                tool_name=tool_name,
                requires_confirmation=False,
                confirmation_message=None,
                metadata=metadata,
            )

        except ValueError as exc:

            return AIResponse(
                status=ExecutionStatus.INVALID,
                message=str(exc),
                data=None,
                tool_name=tool_name,
                requires_confirmation=False,
                confirmation_message=None,
                metadata=metadata,
            )

        except LookupError as exc:

            return AIResponse(
                status=ExecutionStatus.NOT_FOUND,
                message=str(exc),
                data=None,
                tool_name=tool_name,
                requires_confirmation=False,
                confirmation_message=None,
                metadata=metadata,
            )

        except Exception as exc:

            return AIResponse(
                status=ExecutionStatus.ERROR,
                message=(
                    "The AI operation could not be completed."
                ),
                data=None,
                tool_name=tool_name,
                requires_confirmation=False,
                confirmation_message=None,
                metadata={
                    **(metadata or {}),
                    "error_type": type(exc).__name__,
                    "error": str(exc),
                },
            )

        # ----------------------------------------------------
        # SAFE SERIALIZATION
        # ----------------------------------------------------

        serialized_result = _serialize_value(
            result
        )

        # ----------------------------------------------------
        # FINAL GEMINI RESPONSE
        # ----------------------------------------------------

        final_ai_response = self._generate_final_response(
            message=message,
            current_user=current_user,
            tool_name=tool_name,
            tool_result=serialized_result,
            patient_id=final_patient_id,
        )

        # ----------------------------------------------------
        # FINAL RESPONSE FAILURE
        # ----------------------------------------------------

        if not final_ai_response.get(
            "success",
            False,
        ):

            # The controlled operation has already completed
            # successfully. Final Gemini response generation is
            # only a presentation layer, so its failure must not
            # turn a successful operation into a user-facing error.
            fallback_message = _build_fallback_success_message(
                tool_name=tool_name,
                tool_result=serialized_result,
            )

            return AIResponse(
                status=ExecutionStatus.SUCCESS,
                message=fallback_message,
                data=serialized_result,
                tool_name=tool_name,
                requires_confirmation=False,
                confirmation_message=None,
                metadata={
                    **(metadata or {}),
                    "response_generation_failed": True,
                    "response_error": (
                        final_ai_response.get(
                            "message"
                        )
                    ),
                    "response_generated_by_ai": False,
                    "response_fallback_used": True,
                },
            )

        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        return AIResponse(
            status=ExecutionStatus.SUCCESS,
            message=(
                final_ai_response.get(
                    "message"
                )
                or (
                    f"Operation '{tool_name}' "
                    "completed successfully."
                )
            ),
            data=serialized_result,
            tool_name=tool_name,
            requires_confirmation=False,
            confirmation_message=None,
            metadata={
                **(metadata or {}),
                "response_generated_by_ai": True,
            },
        )

    # ========================================================
    # INFORMATION CONTEXT
    # ========================================================

    def get_information_context(
        self,
        *,
        db: Session,
        current_user: Any,
        patient_id: Optional[int] = None,
        include_operational: bool = True,
    ) -> AIResponse:
        """
        Prepare authorized context for information-oriented
        AI requests.

        This does not execute a mutating operation.
        """

        try:

            context = self.build_context(
                db=db,
                current_user=current_user,
                patient_id=patient_id,
                include_operational=include_operational,
            )

            return AIResponse(
                status=ExecutionStatus.SUCCESS,
                message=(
                    "Authorized AI context prepared."
                ),
                data=_serialize_value(
                    context
                ),
                tool_name=None,
                requires_confirmation=False,
                confirmation_message=None,
                metadata={
                    "read_only": True,
                    "patient_context": (
                        patient_id is not None
                    ),
                    "operational_context": (
                        include_operational
                    ),
                },
            )

        except PermissionError as exc:

            return AIResponse(
                status=ExecutionStatus.DENIED,
                message=str(exc),
            )

        except LookupError as exc:

            return AIResponse(
                status=ExecutionStatus.NOT_FOUND,
                message=str(exc),
            )

        except ValueError as exc:

            return AIResponse(
                status=ExecutionStatus.INVALID,
                message=str(exc),
            )

        except Exception as exc:

            return AIResponse(
                status=ExecutionStatus.ERROR,
                message=(
                    "Unable to prepare AI context."
                ),
                metadata={
                    "error_type": type(exc).__name__,
                    "error": str(exc),
                },
            )


# ============================================================
# JSON SAFE DUMP
# ============================================================


def json_safe_dump(
    value: Any,
) -> str:
    """
    Convert serialized tool results into a compact JSON string
    for Gemini.

    This function never accesses the database.
    """

    try:

        import json

        return json.dumps(
            value,
            ensure_ascii=False,
            indent=2,
            default=str,
        )

    except Exception:

        return str(value)


# ============================================================
# DEFAULT ORCHESTRATOR
# ============================================================


ai_orchestrator = AIOperationsOrchestrator()


# ============================================================
# CONVENIENCE FUNCTIONS
# ============================================================


def execute_ai_operation(
    db: Session,
    current_user: Any,
    message: str,
    tool_name: Optional[str] = None,
    arguments: Optional[Dict[str, Any]] = None,
    patient_id: Optional[int] = None,
    confirmed: bool = False,
) -> AIResponse:
    """
    Convenience wrapper around the default orchestrator.

    tool_name is optional.

    If tool_name is omitted, the natural-language message is
    passed through the Gemini planner.
    """

    return ai_orchestrator.execute(
        db=db,
        current_user=current_user,
        message=message,
        tool_name=tool_name,
        arguments=arguments,
        patient_id=patient_id,
        confirmed=confirmed,
    )


def get_ai_context(
    db: Session,
    current_user: Any,
    patient_id: Optional[int] = None,
    include_operational: bool = True,
) -> AIResponse:
    """
    Convenience wrapper for authorized AI context generation.
    """

    return ai_orchestrator.get_information_context(
        db=db,
        current_user=current_user,
        patient_id=patient_id,
        include_operational=include_operational,
    )