"""
AI Operations Assistant - Context Engine

Purpose
-------
Build a controlled context for the AI assistant from the
authenticated user's role and authorized backend data.

IMPORTANT
---------
This module:
- does NOT call Gemini
- does NOT execute mutations
- does NOT bypass PermissionEngine
- does NOT expose the SQLAlchemy session to the AI
- uses existing CRUD read functions
- fails closed when access is not explicitly allowed

The orchestrator will consume the ContextResult generated here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app import crud
from app.ai.permissions import (
    Action,
    PermissionEngine,
    Resource,
    Scope,
    permission_engine,
)


# ============================================================
# CONTEXT TYPES
# ============================================================


@dataclass
class UserContext:
    """
    Minimal authenticated-user context.

    Do not place passwords, password hashes, JWTs or other
    credentials into this object.
    """

    user_id: int
    role: str
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: bool = False


@dataclass
class PatientContext:
    """
    Patient-centered context assembled from authorized reads.
    """

    patient: Any = None
    clinical_encounters: Any = None
    nursing_observations: Any = None
    prescriptions: Any = None
    referrals: Any = None
    appointments: Any = None
    queue_entries: Any = None
    lab_orders: Any = None
    lab_history: Any = None
    lab_results: Any = None
    transfers: Any = None
    discharges: Any = None
    follow_ups: Any = None


@dataclass
class OperationalContext:
    """
    Context for operational requests that do not require a
    specific patient.
    """

    my_work_tasks: Any = None
    appointments: Any = None


@dataclass
class AIContext:
    """
    Complete controlled context passed to the orchestrator.
    """

    user: UserContext
    patient: Optional[PatientContext] = None
    operational: Optional[OperationalContext] = None

    requested_patient_id: Optional[int] = None

    metadata: Dict[str, Any] = field(
        default_factory=dict
    )


# ============================================================
# CONTEXT ENGINE
# ============================================================


class ContextEngine:
    """
    Builds authorized context for AI operations.

    The engine uses explicit permissions before every data
    category is loaded.
    """

    def __init__(
        self,
        engine: PermissionEngine = permission_engine,
    ) -> None:
        self.permission_engine = engine

    # ========================================================
    # USER CONTEXT
    # ========================================================

    def build_user_context(
        self,
        current_user: Any,
    ) -> UserContext:
        """
        Build safe user context.

        Sensitive authentication fields are intentionally
        excluded.
        """

        return UserContext(
            user_id=int(current_user.id),
            role=str(current_user.role),
            full_name=getattr(
                current_user,
                "full_name",
                None,
            ),
            employee_id=getattr(
                current_user,
                "employee_id",
                None,
            ),
            is_active=(
                getattr(
                    current_user,
                    "is_active",
                    None,
                )
                == "true"
            ),
        )

    # ========================================================
    # PERMISSION HELPER
    # ========================================================

    def _can_view(
        self,
        current_user: Any,
        resource: Resource,
    ) -> bool:
        """
        Check whether the current role has explicit VIEW
        permission for a resource.
        """

        return self.permission_engine.is_allowed(
            role=current_user.role,
            resource=resource,
            action=Action.VIEW,
        )

    # ========================================================
    # PATIENT CONTEXT
    # ========================================================

    def build_patient_context(
        self,
        *,
        db: Session,
        current_user: Any,
        patient_id: int,
    ) -> PatientContext:
        """
        Build patient-centered context.

        Each data category is independently permission checked.

        A denied category is not queried and is not represented
        as accessible information.
        """

        context = PatientContext()

        # ----------------------------------------------------
        # PATIENT
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.PATIENT,
        ):
            context.patient = crud.get_patient(
                db,
                patient_id,
            )

        # ----------------------------------------------------
        # CLINICAL ENCOUNTERS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.CLINICAL_ENCOUNTER,
        ):
            context.clinical_encounters = (
                crud.get_clinical_encounters_for_patient(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # NURSING OBSERVATIONS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.NURSING_OBSERVATION,
        ):
            context.nursing_observations = (
                crud.get_nursing_observations_for_patient(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # PRESCRIPTIONS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.PRESCRIPTION,
        ):
            context.prescriptions = (
                crud.get_prescriptions_for_patient(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # REFERRALS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.REFERRAL,
        ):
            context.referrals = (
                crud.get_referrals_for_patient(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # APPOINTMENTS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.APPOINTMENT,
        ):
            context.appointments = (
                crud.get_appointments_for_patient(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # PATIENT QUEUE
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.PATIENT_QUEUE,
        ):
            context.queue_entries = (
                crud.get_patient_queues_for_patient(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # LAB ORDERS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.LAB_ORDER,
        ):
            context.lab_orders = (
                crud.get_lab_orders_for_patient(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # LAB HISTORY
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.LAB_ORDER,
        ):
            context.lab_history = (
                crud.get_patient_lab_history(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # LAB RESULTS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.LAB_RESULT,
        ):
            context.lab_results = (
                crud.get_patient_lab_results(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # PATIENT TRANSFERS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.PATIENT_TRANSFER,
        ):
            context.transfers = (
                crud.get_patient_transfers(
                    db,
                    patient_id=patient_id,
                )
            )

        # ----------------------------------------------------
        # DISCHARGES
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.DISCHARGE,
        ):
            context.discharges = (
                crud.get_discharges_for_patient(
                    db,
                    patient_id,
                )
            )

        # ----------------------------------------------------
        # FOLLOW-UPS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.FOLLOW_UP,
        ):
            context.follow_ups = (
                crud.get_follow_ups_for_patient(
                    db,
                    patient_id,
                )
            )

        return context

    # ========================================================
    # OPERATIONAL CONTEXT
    # ========================================================

    def build_operational_context(
        self,
        *,
        db: Session,
        current_user: Any,
    ) -> OperationalContext:
        """
        Build context for operational requests.

        Work tasks are fetched through the existing
        user-scoped CRUD function.
        """

        context = OperationalContext()

        # ----------------------------------------------------
        # MY WORK TASKS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.WORK_TASK,
        ):
            context.my_work_tasks = (
                crud.get_work_tasks_for_user(
                    db,
                    current_user.id,
                )
            )

        # ----------------------------------------------------
        # APPOINTMENTS
        # ----------------------------------------------------

        if self._can_view(
            current_user,
            Resource.APPOINTMENT,
        ):
            role = getattr(
                current_user,
                "role",
                None,
            )

            if role == "Doctor":
                context.appointments = (
                    crud.get_appointments_for_doctor(
                        db,
                        current_user.id,
                    )
                )

        return context

    # ========================================================
    # COMPLETE CONTEXT
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
        Build the complete AI context.

        Patient context is loaded only when a patient_id has
        explicitly been resolved.

        Operational context is loaded independently.
        """

        user_context = self.build_user_context(
            current_user
        )

        patient_context: Optional[
            PatientContext
        ] = None

        operational_context: Optional[
            OperationalContext
        ] = None

        if patient_id is not None:
            patient_context = (
                self.build_patient_context(
                    db=db,
                    current_user=current_user,
                    patient_id=int(patient_id),
                )
            )

        if include_operational:
            operational_context = (
                self.build_operational_context(
                    db=db,
                    current_user=current_user,
                )
            )

        return AIContext(
            user=user_context,
            patient=patient_context,
            operational=operational_context,
            requested_patient_id=(
                int(patient_id)
                if patient_id is not None
                else None
            ),
            metadata={
                "context_version": "1.0",
                "patient_context_loaded": (
                    patient_context is not None
                ),
                "operational_context_loaded": (
                    operational_context is not None
                ),
            },
        )


# ============================================================
# DEFAULT ENGINE
# ============================================================


context_engine = ContextEngine()


# ============================================================
# CONVENIENCE FUNCTION
# ============================================================


def build_ai_context(
    *,
    db: Session,
    current_user: Any,
    patient_id: Optional[int] = None,
    include_operational: bool = True,
    engine: ContextEngine = context_engine,
) -> AIContext:
    """
    Convenience wrapper for the default ContextEngine.
    """

    return engine.build_context(
        db=db,
        current_user=current_user,
        patient_id=patient_id,
        include_operational=include_operational,
    )