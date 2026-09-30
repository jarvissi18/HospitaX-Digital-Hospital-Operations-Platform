"""
HospitaX AI Operations Assistant - Tool Registry

This module exposes a controlled set of backend operations to the
AI Operations Assistant.

IMPORTANT
---------
The AI never gets direct database access.

Every tool:
    1. Is explicitly registered here.
    2. Has a resource + action.
    3. Passes through PermissionEngine.
    4. Uses the existing CRUD/business-logic layer.
    5. Uses the authenticated current user where ownership matters.

This module does NOT call Gemini.
Gemini/orchestration is implemented separately.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, Optional

from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.ai.permissions import (
    Action,
    PermissionEngine,
    Resource,
    Scope,
    permission_engine,
)


# ============================================================
# TYPES
# ============================================================


ToolExecutor = Callable[
    [
        Session,
        Any,
        Dict[str, Any],
    ],
    Any,
]


@dataclass(frozen=True)
class AITool:
    """
    Definition of one operation available to the AI layer.
    """

    name: str
    description: str
    resource: Resource
    action: Action
    executor: ToolExecutor


# ============================================================
# INTERNAL HELPERS
# ============================================================


def _require_permission(
    *,
    current_user: Any,
    resource: Resource,
    action: Action,
    engine: PermissionEngine,
) -> None:
    """
    Central permission check for every AI tool.

    Fails closed:
    if the permission does not exist, execution is denied.
    """

    role = getattr(current_user, "role", None)

    if not role:
        raise PermissionError(
            "Authenticated user role is required."
        )

    if not engine.is_allowed(
        role=role,
        resource=resource,
        action=action,
    ):
        raise PermissionError(
            f"AI action denied: role '{role}' cannot "
            f"perform '{action.value}' on "
            f"'{resource.value}'."
        )


def _require_argument(
    arguments: Dict[str, Any],
    name: str,
) -> Any:
    """
    Require a tool argument.
    """

    if name not in arguments:
        raise ValueError(
            f"Missing required argument: {name}"
        )

    value = arguments[name]

    if value is None:
        raise ValueError(
            f"Argument '{name}' cannot be null."
        )

    return value


def _validate_payload(
    schema_class: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Validate tool arguments using the existing Pydantic schema.

    Pydantic v2 is preferred, with a Pydantic v1 compatibility
    fallback.
    """

    try:
        return schema_class.model_validate(arguments)
    except AttributeError:
        return schema_class.parse_obj(arguments)


def _normalize_nursing_observation_arguments(
    arguments: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Normalize AI-generated nursing observation arguments into the
    exact flat shape expected by NursingObservationCreate.

    Supported AI formats include both:

    1. Flat:
        {
            "blood_pressure_systolic": 120,
            "blood_pressure_diastolic": 80,
            "pulse": 78,
            "temperature": 98.6,
            "oxygen_saturation": 98,
            "respiratory_rate": 18,
            "weight": 62.5
        }

    2. Nested:
        {
            "vital_signs": {
                "blood_pressure_systolic": 120,
                "blood_pressure_diastolic": 80,
                "pulse": 78,
                "temperature": 98.6,
                "oxygen_saturation": 98,
                "respiratory_rate": 18,
                "weight": 62.5
            }
        }

    The planner is allowed to produce the natural nested form.
    The backend tool is responsible for converting it into the
    schema's actual field names.

    Existing explicit top-level values take precedence over values
    supplied inside the nested vital_signs object.
    """

    normalized = dict(arguments)

    nested_vitals = normalized.pop(
        "vital_signs",
        None,
    )

    if nested_vitals is not None:
        if not isinstance(nested_vitals, dict):
            raise ValueError(
                "Argument 'vital_signs' must be an object."
            )

        # Nested values are only used when the same field has not
        # already been supplied at the top level.
        for key, value in nested_vitals.items():
            if key not in normalized:
                normalized[key] = value

    # --------------------------------------------------------
    # Blood pressure aliases
    # --------------------------------------------------------

    systolic = normalized.pop(
        "blood_pressure_systolic",
        None,
    )

    diastolic = normalized.pop(
        "blood_pressure_diastolic",
        None,
    )

    if (
        systolic is not None
        and diastolic is not None
        and "blood_pressure" not in normalized
    ):
        normalized["blood_pressure"] = (
            f"{systolic}/{diastolic}"
        )

    # If only one component was supplied, do not manufacture an
    # incomplete blood-pressure value.
    # The individual components are intentionally removed because
    # they are not fields in NursingObservationCreate.

    # --------------------------------------------------------
    # Weight aliases
    # --------------------------------------------------------

    weight_kg = normalized.pop(
        "weight_kg",
        None,
    )

    if (
        weight_kg is not None
        and "weight" not in normalized
    ):
        normalized["weight"] = weight_kg

    # --------------------------------------------------------
    # Common safe aliases
    # --------------------------------------------------------

    if (
        "oxygen_saturation_percent" in normalized
        and "oxygen_saturation" not in normalized
    ):
        normalized["oxygen_saturation"] = normalized.pop(
            "oxygen_saturation_percent"
        )
    else:
        normalized.pop(
            "oxygen_saturation_percent",
            None,
        )

    if (
        "respiratory_rate_bpm" in normalized
        and "respiratory_rate" not in normalized
    ):
        normalized["respiratory_rate"] = normalized.pop(
            "respiratory_rate_bpm"
        )
    else:
        normalized.pop(
            "respiratory_rate_bpm",
            None,
        )

    if (
        "heart_rate" in normalized
        and "pulse" not in normalized
    ):
        normalized["pulse"] = normalized.pop(
            "heart_rate"
        )
    else:
        normalized.pop(
            "heart_rate",
            None,
        )

    return normalized


# ============================================================
# PATIENT TOOLS
# ============================================================


def _create_patient(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """Create a patient using the existing schema and CRUD layer."""

    payload = _validate_payload(
        schemas.PatientCreate,
        arguments,
    )

    return crud.create_patient(
        db=db,
        patient=payload,
    )


def _get_patient(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Retrieve one patient while enforcing the authenticated
    user's patient visibility scope.

    Administrator / Receptionist:
        Can view any patient.

    Doctor:
        Can view only patients with an ACTIVE assignment to
        the authenticated doctor.

    Nurse:
        Can view only patients with an ACTIVE assignment to
        the authenticated nurse.

    Other roles:
        PermissionEngine should normally reject the tool before
        reaching this function. This helper still fails closed.
    """

    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    patient_id = int(patient_id)

    patient = crud.get_patient(
        db,
        patient_id,
    )

    if patient is None:
        raise ValueError(
            "Patient not found."
        )

    role = getattr(
        current_user,
        "role",
        None,
    )

    # --------------------------------------------------------
    # ADMINISTRATOR / RECEPTIONIST
    # --------------------------------------------------------

    if role in {
        "Administrator",
        "Receptionist",
    }:
        return patient

    # --------------------------------------------------------
    # DOCTOR
    # --------------------------------------------------------

    if role == "Doctor":
        assignment = (
            db.query(
                models.PatientAssignment
            )
            .filter(
                models.PatientAssignment.patient_id
                == patient_id,
                models.PatientAssignment.doctor_id
                == current_user.id,
                models.PatientAssignment.status
                == "Active",
            )
            .first()
        )

        if assignment:
            return patient

        raise PermissionError(
            "You are not authorized to access "
            "this patient."
        )

    # --------------------------------------------------------
    # NURSE
    # --------------------------------------------------------

    if role == "Nurse":
        assignment = (
            db.query(
                models.PatientAssignment
            )
            .filter(
                models.PatientAssignment.patient_id
                == patient_id,
                models.PatientAssignment.nurse_id
                == current_user.id,
                models.PatientAssignment.status
                == "Active",
            )
            .first()
        )

        if assignment:
            return patient

        raise PermissionError(
            "You are not authorized to access "
            "this patient."
        )

    # --------------------------------------------------------
    # FAIL CLOSED
    # --------------------------------------------------------

    raise PermissionError(
        "You are not authorized to access "
        "patient records."
    )


def _get_patients(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Retrieve patients according to the authenticated user's
    backend patient scope.

    Administrator / Receptionist:
        All registered patients.

    Doctor:
        Only patients with an ACTIVE assignment to the
        authenticated doctor.

    Nurse:
        Only patients with an ACTIVE assignment to the
        authenticated nurse.

    Other roles:
        No patient records.

    IMPORTANT:
        current_user is explicitly passed into CRUD.
        Never call crud.get_patients(db) without the
        authenticated user from an AI operation.
    """

    return crud.get_patients(
        db,
        current_user=current_user,
    )


# ============================================================
# WORK TASK TOOLS
# ============================================================


def _get_my_work_tasks(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    return crud.get_work_tasks_for_user(
        db,
        current_user.id,
    )


def _create_work_task(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    payload = _validate_payload(
        schemas.WorkTaskCreate,
        arguments,
    )

    return crud.create_work_task(
        db=db,
        task=payload,
        created_by_id=current_user.id,
    )


def _start_work_task(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    task_id = _require_argument(
        arguments,
        "task_id",
    )

    return crud.start_work_task(
        db=db,
        task_id=int(task_id),
        user_id=current_user.id,
    )


def _complete_work_task(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    task_id = _require_argument(
        arguments,
        "task_id",
    )

    return crud.complete_work_task(
        db=db,
        task_id=int(task_id),
        user_id=current_user.id,
    )


# ============================================================
# ATTENDANCE TOOLS
# ============================================================


ATTENDANCE_STAFF_ROLES = {
    "Doctor",
    "Nurse",
    "Receptionist",
    "Housekeeper",
}


def _parse_attendance_date(value: Any) -> Optional[datetime]:
    """
    Parse an AI-provided attendance date.

    Supported formats:
        YYYY-MM-DD
        ISO datetime strings
        datetime instances

    No date is inferred here. If omitted, the executor uses the
    existing attendance CRUD behavior for the current/history view.
    """

    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    if not isinstance(value, str):
        raise ValueError(
            "Argument 'attendance_date' must be a date string."
        )

    raw = value.strip()

    if not raw:
        return None

    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(
            "Invalid attendance_date. Use YYYY-MM-DD or an ISO datetime."
        ) from exc


def _get_attendance(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Retrieve attendance through the existing attendance CRUD layer.

    Administrator:
        - Can view global attendance.
        - Can optionally filter by user_id.
        - Can optionally filter by attendance_date.

    Other operational staff:
        - Can view only their own attendance.
        - user_id cannot be used to access another staff member.
        - Can optionally filter by attendance_date.

    The AI tool does not bypass PermissionEngine or existing CRUD.
    """

    role = getattr(current_user, "role", None)

    if role not in {"Administrator", *ATTENDANCE_STAFF_ROLES}:
        raise PermissionError(
            "You are not authorized to access attendance records."
        )

    requested_user_id = arguments.get("user_id")
    attendance_date = _parse_attendance_date(
        arguments.get("attendance_date")
    )

    # --------------------------------------------------------
    # ADMINISTRATOR
    # --------------------------------------------------------

    if role == "Administrator":
        if requested_user_id is not None:
            user_id = int(requested_user_id)

            if attendance_date is not None:
                return crud.get_attendance_for_user_date(
                    db,
                    user_id,
                    attendance_date,
                )

            return crud.get_attendance_history(
                db=db,
                user_id=user_id,
            )

        if attendance_date is not None:
            return crud.get_attendance_for_date(
                db,
                attendance_date,
            )

        return crud.get_all_attendance(db)

    # --------------------------------------------------------
    # NON-ADMIN STAFF
    # --------------------------------------------------------

    if requested_user_id is not None:
        requested_user_id = int(requested_user_id)

        if requested_user_id != current_user.id:
            raise PermissionError(
                "You can access only your own attendance records."
            )

    if attendance_date is not None:
        return crud.get_attendance_for_user_date(
            db,
            current_user.id,
            attendance_date,
        )

    return crud.get_attendance_history(
        db=db,
        user_id=current_user.id,
    )


# ============================================================
# CLINICAL ENCOUNTER TOOLS
# ============================================================


def _get_patient_encounters(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Retrieve clinical encounters for a patient.

    Role-aware behavior:

    - Doctor:
        Retrieve encounters within the authenticated
        doctor's own clinical scope.

    - Administrator / Nurse:
        Retrieve patient-level clinical encounters using
        the existing patient-scoped CRUD operation.

    The PermissionEngine remains responsible for deciding
    whether the authenticated role may access this resource.
    """

    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    role = getattr(
        current_user,
        "role",
        None,
    )

    # --------------------------------------------------------
    # DOCTOR
    # --------------------------------------------------------
    #
    # Doctors remain restricted to their own clinical
    # encounters.
    #
    if role == "Doctor":
        return crud.get_clinical_encounters(
            db=db,
            patient_id=int(patient_id),
            doctor_id=current_user.id,
        )

    # --------------------------------------------------------
    # ADMINISTRATOR / NURSE
    # --------------------------------------------------------
    #
    # These roles are allowed to view clinical encounters
    # through the PermissionEngine.
    #
    # They are not doctors, so their user ID must NEVER
    # be passed as doctor_id.
    #
    return crud.get_clinical_encounters_for_patient(
        db=db,
        patient_id=int(patient_id),
    )


def _create_clinical_encounter(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Create a clinical encounter using the authenticated
    doctor as the doctor identity.

    The AI cannot choose another doctor identity.
    """

    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    encounter_arguments = dict(arguments)

    encounter_arguments.pop(
        "patient_id",
        None,
    )

    payload = _validate_payload(
        schemas.ClinicalEncounterCreate,
        encounter_arguments,
    )

    return crud.create_clinical_encounter(
        db=db,
        patient_id=int(patient_id),
        doctor_id=current_user.id,
        encounter=payload,
    )


# ============================================================
# PRESCRIPTION TOOLS
# ============================================================


def _get_patient_prescriptions(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    return crud.get_prescriptions_for_patient(
        db,
        int(patient_id),
    )


def _create_prescription(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    payload = _validate_payload(
        schemas.PrescriptionCreate,
        arguments,
    )

    return crud.create_prescription(
        db=db,
        doctor_id=current_user.id,
        prescription=payload,
    )


# ============================================================
# REFERRAL TOOLS
# ============================================================


def _get_patient_referrals(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    return crud.get_referrals_for_patient(
        db,
        int(patient_id),
    )


def _create_referral(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    payload = _validate_payload(
        schemas.ReferralCreate,
        arguments,
    )

    return crud.create_referral(
        db=db,
        referral=payload,
        referring_doctor_id=current_user.id,
    )


# ============================================================
# NURSING OBSERVATION TOOLS
# ============================================================


def _get_patient_nursing_observations(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Retrieve nursing observations for a patient.

    Access is controlled by PermissionEngine before this
    executor runs. The existing CRUD/business logic remains
    authoritative for the actual data access.
    """

    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    return crud.get_nursing_observations_for_patient(
        db,
        int(patient_id),
    )


def _create_nursing_observation(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Create a nursing observation using the authenticated
    Nurse as nurse_id.

    The client/AI cannot choose another nurse identity.

    The important boundary here is:

        AI planner arguments
                ↓
        normalization
                ↓
        NursingObservationCreate
                ↓
        existing CRUD
                ↓
        database

    This prevents nested AI fields from being silently ignored.
    """

    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    observation_arguments = dict(arguments)

    observation_arguments.pop(
        "patient_id",
        None,
    )

    # --------------------------------------------------------
    # AI -> BACKEND FIELD NORMALIZATION
    # --------------------------------------------------------
    #
    # The planner may produce:
    #
    # {
    #     "vital_signs": {
    #         "blood_pressure_systolic": 120,
    #         "blood_pressure_diastolic": 80,
    #         "pulse": 78,
    #         "temperature": 98.6,
    #         "oxygen_saturation": 98,
    #         "respiratory_rate": 18,
    #         "weight": 62.5
    #     }
    # }
    #
    # The Pydantic schema expects the actual flat fields.
    #
    # Normalize before validation.
    # --------------------------------------------------------

    observation_arguments = (
        _normalize_nursing_observation_arguments(
            observation_arguments
        )
    )

    payload = _validate_payload(
        schemas.NursingObservationCreate,
        {
            **observation_arguments,
            "patient_id": int(patient_id),
        },
    )

    return crud.create_nursing_observation(
        db=db,
        patient_id=int(patient_id),
        nurse_id=current_user.id,
        observation=payload,
    )


def _update_nursing_observation(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    """
    Update an existing nursing observation.

    The existing PermissionEngine controls whether the
    authenticated role may perform the update.
    """

    observation_id = _require_argument(
        arguments,
        "observation_id",
    )

    update_arguments = dict(arguments)

    update_arguments.pop(
        "observation_id",
        None,
    )

    # Allow the same AI-friendly vital-sign structure during
    # updates as well.
    update_arguments = (
        _normalize_nursing_observation_arguments(
            update_arguments
        )
    )

    payload = _validate_payload(
        schemas.NursingObservationUpdate,
        update_arguments,
    )

    return crud.update_nursing_observation(
        db=db,
        observation_id=int(observation_id),
        observation=payload,
    )


# ============================================================
# APPOINTMENT TOOLS
# ============================================================


def _get_appointments(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    patient_id = arguments.get("patient_id")
    department_id = arguments.get("department_id")
    doctor_id = arguments.get("doctor_id")
    appointment_status = arguments.get("status")

    # Doctors must remain scoped to their own appointments.
    if getattr(current_user, "role", None) == "Doctor":
        doctor_id = current_user.id

    return crud.get_appointments(
        db=db,
        patient_id=(
            int(patient_id)
            if patient_id is not None
            else None
        ),
        department_id=(
            int(department_id)
            if department_id is not None
            else None
        ),
        doctor_id=(
            int(doctor_id)
            if doctor_id is not None
            else None
        ),
        status=appointment_status,
    )


def _create_appointment(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    payload = _validate_payload(
        schemas.AppointmentCreate,
        arguments,
    )

    return crud.create_appointment(
        db=db,
        appointment=payload,
        created_by=current_user.id,
    )


# ============================================================
# QUEUE TOOLS
# ============================================================


def _get_queue(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    queue_id = _require_argument(
        arguments,
        "queue_id",
    )

    return crud.get_patient_queue(
        db,
        int(queue_id),
    )


def _get_patient_queues(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    patient_id = arguments.get("patient_id")

    if patient_id is not None:
        return crud.get_patient_queues_for_patient(
            db,
            int(patient_id),
        )

    return crud.get_patient_queues(db)


# ============================================================
# LAB TOOLS
# ============================================================


def _get_lab_orders(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    patient_id = arguments.get("patient_id")
    encounter_id = arguments.get("encounter_id")
    doctor_id = arguments.get("doctor_id")
    lab_status = arguments.get("status")

    # Doctor access to orders is scoped to the doctor's
    # own orders in the existing backend.
    if getattr(current_user, "role", None) == "Doctor":
        doctor_id = current_user.id

    return crud.get_lab_orders(
        db=db,
        patient_id=(
            int(patient_id)
            if patient_id is not None
            else None
        ),
        encounter_id=(
            int(encounter_id)
            if encounter_id is not None
            else None
        ),
        doctor_id=(
            int(doctor_id)
            if doctor_id is not None
            else None
        ),
        status=lab_status,
    )


# ============================================================
# DISCHARGE TOOLS
# ============================================================


def _get_patient_discharges(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    return crud.get_discharges(
        db=db,
        patient_id=int(patient_id),
    )


def _create_discharge(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    payload = _validate_payload(
        schemas.DischargeCreate,
        arguments,
    )

    return crud.create_discharge(
        db=db,
        discharge=payload,
        discharged_by_id=current_user.id,
    )


# ============================================================
# FOLLOW-UP TOOLS
# ============================================================


def _get_patient_follow_ups(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    patient_id = _require_argument(
        arguments,
        "patient_id",
    )

    return crud.get_follow_ups_for_patient(
        db,
        int(patient_id),
    )


def _create_follow_up(
    db: Session,
    current_user: Any,
    arguments: Dict[str, Any],
) -> Any:
    payload = _validate_payload(
        schemas.FollowUpCreate,
        arguments,
    )

    return crud.create_follow_up(
        db=db,
        follow_up=payload,
        doctor_id=current_user.id,
    )


# ============================================================
# TOOL REGISTRY
# ============================================================


TOOLS: tuple[AITool, ...] = (

    # --------------------------------------------------------
    # PATIENT
    # --------------------------------------------------------

    AITool(
        name="create_patient",
        description=(
            "Create a new patient record using name, age, "
            "gender, village, disease, and mobile. "
            "Execution is controlled by the patient "
            "PermissionEngine."
        ),
        resource=Resource.PATIENT,
        action=Action.CREATE,
        executor=_create_patient,
    ),

    AITool(
        name="get_patient",
        description=(
            "Retrieve a single patient's existing record "
            "using the patient ID."
        ),
        resource=Resource.PATIENT,
        action=Action.VIEW,
        executor=_get_patient,
    ),

    AITool(
        name="get_patients",
        description=(
            "Retrieve patient records available to the "
            "authenticated user according to role and "
            "assignment scope. For a Doctor or Nurse, "
            "this means only patients with an ACTIVE "
            "assignment to that user. Do not interpret "
            "this operation as unrestricted access to the "
            "entire patient registry."
        ),
        resource=Resource.PATIENT,
        action=Action.VIEW,
        executor=_get_patients,
    ),

    # --------------------------------------------------------
    # WORK TASKS
    # --------------------------------------------------------

    AITool(
        name="get_my_work_tasks",
        description=(
            "Retrieve work tasks assigned to the "
            "currently authenticated user."
        ),
        resource=Resource.WORK_TASK,
        action=Action.VIEW,
        executor=_get_my_work_tasks,
    ),

    AITool(
        name="create_work_task",
        description=(
            "Create a hospital work task and assign it "
            "according to the existing work-management rules."
        ),
        resource=Resource.WORK_TASK,
        action=Action.CREATE,
        executor=_create_work_task,
    ),

    AITool(
        name="start_work_task",
        description=(
            "Start a work task owned by the currently "
            "authenticated operational staff member."
        ),
        resource=Resource.WORK_TASK,
        action=Action.START,
        executor=_start_work_task,
    ),

    AITool(
        name="complete_work_task",
        description=(
            "Complete a work task owned by the currently "
            "authenticated operational staff member."
        ),
        resource=Resource.WORK_TASK,
        action=Action.COMPLETE,
        executor=_complete_work_task,
    ),

    # --------------------------------------------------------
    # ATTENDANCE
    # --------------------------------------------------------

    AITool(
        name="get_attendance",
        description=(
            "Retrieve staff attendance records using the existing "
            "attendance system. Administrators can view global "
            "attendance and optionally filter by staff user_id or "
            "attendance_date. Doctors, Nurses, Receptionists and "
            "Housekeepers can view only their own attendance. "
            "Use attendance_date in YYYY-MM-DD format when a "
            "specific date is requested."
        ),
        resource=Resource.ATTENDANCE,
        action=Action.VIEW,
        executor=_get_attendance,
    ),

    # --------------------------------------------------------
    # CLINICAL ENCOUNTERS
    # --------------------------------------------------------

    AITool(
        name="get_patient_clinical_encounters",
        description=(
            "Retrieve clinical encounter records for a specific "
            "patient, including encounter ID, date, reason for "
            "visit, symptoms, clinical notes, diagnosis, treatment "
            "plan, prescription information, status, and follow-up "
            "details. Doctors receive encounters within their own "
            "clinical scope. Administrators and Nurses receive "
            "patient-level encounter information according to "
            "their backend permissions."
        ),
        resource=Resource.CLINICAL_ENCOUNTER,
        action=Action.VIEW,
        executor=_get_patient_encounters,
    ),

    AITool(
        name="create_clinical_encounter",
        description=(
            "Create a clinical encounter for a patient "
            "using the authenticated doctor as the doctor."
        ),
        resource=Resource.CLINICAL_ENCOUNTER,
        action=Action.CREATE,
        executor=_create_clinical_encounter,
    ),

    # --------------------------------------------------------
    # PRESCRIPTIONS
    # --------------------------------------------------------

    AITool(
        name="get_patient_prescriptions",
        description=(
            "Retrieve prescriptions associated with a patient."
        ),
        resource=Resource.PRESCRIPTION,
        action=Action.VIEW,
        executor=_get_patient_prescriptions,
    ),

    AITool(
        name="create_prescription",
        description=(
            "Create a prescription using the authenticated "
            "doctor as the prescribing doctor."
        ),
        resource=Resource.PRESCRIPTION,
        action=Action.CREATE,
        executor=_create_prescription,
    ),

    # --------------------------------------------------------
    # REFERRALS
    # --------------------------------------------------------

    AITool(
        name="get_patient_referrals",
        description=(
            "Retrieve referrals associated with a patient."
        ),
        resource=Resource.REFERRAL,
        action=Action.VIEW,
        executor=_get_patient_referrals,
    ),

    AITool(
        name="create_referral",
        description=(
            "Create a referral using the authenticated "
            "doctor as the referring doctor."
        ),
        resource=Resource.REFERRAL,
        action=Action.CREATE,
        executor=_create_referral,
    ),

    # --------------------------------------------------------
    # NURSING OBSERVATIONS
    # --------------------------------------------------------

    AITool(
        name="get_patient_nursing_observations",
        description=(
            "Retrieve nursing observations recorded for "
            "a patient, including nursing notes, vital signs "
            "and care status."
        ),
        resource=Resource.NURSING_OBSERVATION,
        action=Action.VIEW,
        executor=_get_patient_nursing_observations,
    ),

    AITool(
        name="create_nursing_observation",
        description=(
            "Create a nursing observation for a patient using "
            "the authenticated Nurse as the recording nurse."
        ),
        resource=Resource.NURSING_OBSERVATION,
        action=Action.CREATE,
        executor=_create_nursing_observation,
    ),

    AITool(
        name="update_nursing_observation",
        description=(
            "Update an existing nursing observation using the "
            "existing nursing-observation business rules."
        ),
        resource=Resource.NURSING_OBSERVATION,
        action=Action.UPDATE,
        executor=_update_nursing_observation,
    ),

    # --------------------------------------------------------
    # APPOINTMENTS
    # --------------------------------------------------------

    AITool(
        name="get_appointments",
        description=(
            "Retrieve appointments using the supported "
            "patient, department, doctor and status filters."
        ),
        resource=Resource.APPOINTMENT,
        action=Action.VIEW,
        executor=_get_appointments,
    ),

    AITool(
        name="create_appointment",
        description=(
            "Create an appointment using the existing "
            "appointment business rules."
        ),
        resource=Resource.APPOINTMENT,
        action=Action.CREATE,
        executor=_create_appointment,
    ),

    # --------------------------------------------------------
    # PATIENT QUEUE
    # --------------------------------------------------------

    AITool(
        name="get_patient_queue",
        description=(
            "Retrieve a single patient queue entry."
        ),
        resource=Resource.PATIENT_QUEUE,
        action=Action.VIEW,
        executor=_get_queue,
    ),

    AITool(
        name="get_patient_queues",
        description=(
            "Retrieve patient queue information, optionally "
            "filtered by patient."
        ),
        resource=Resource.PATIENT_QUEUE,
        action=Action.VIEW,
        executor=_get_patient_queues,
    ),

    # --------------------------------------------------------
    # LAB
    # --------------------------------------------------------

    AITool(
        name="get_lab_orders",
        description=(
            "Retrieve laboratory orders using supported "
            "patient, encounter, doctor and status filters."
        ),
        resource=Resource.LAB_ORDER,
        action=Action.VIEW,
        executor=_get_lab_orders,
    ),

    # --------------------------------------------------------
    # DISCHARGE
    # --------------------------------------------------------

    AITool(
        name="get_patient_discharges",
        description=(
            "Retrieve discharge records associated with "
            "a patient."
        ),
        resource=Resource.DISCHARGE,
        action=Action.VIEW,
        executor=_get_patient_discharges,
    ),

    AITool(
        name="create_discharge",
        description=(
            "Create a discharge record using the authenticated "
            "doctor as the discharging doctor."
        ),
        resource=Resource.DISCHARGE,
        action=Action.CREATE,
        executor=_create_discharge,
    ),

    # --------------------------------------------------------
    # FOLLOW-UP
    # --------------------------------------------------------

    AITool(
        name="get_patient_follow_ups",
        description=(
            "Retrieve follow-up records associated with "
            "a patient."
        ),
        resource=Resource.FOLLOW_UP,
        action=Action.VIEW,
        executor=_get_patient_follow_ups,
    ),

    AITool(
        name="create_follow_up",
        description=(
            "Create a follow-up record using the authenticated "
            "doctor as the responsible doctor."
        ),
        resource=Resource.FOLLOW_UP,
        action=Action.CREATE,
        executor=_create_follow_up,
    ),
)


# ============================================================
# REGISTRY
# ============================================================


TOOL_REGISTRY: Dict[str, AITool] = {
    tool.name: tool
    for tool in TOOLS
}


# ============================================================
# REGISTRY ACCESS
# ============================================================


def get_tool(
    tool_name: str,
) -> Optional[AITool]:
    """
    Retrieve a registered AI tool by name.
    """

    return TOOL_REGISTRY.get(tool_name)


def list_tools() -> list[dict[str, Any]]:
    """
    Return safe metadata for the AI orchestrator.

    Executors are intentionally excluded from the returned
    metadata.
    """

    return [
        {
            "name": tool.name,
            "description": tool.description,
            "resource": tool.resource.value,
            "action": tool.action.value,
        }
        for tool in TOOLS
    ]


# ============================================================
# TOOL EXECUTION
# ============================================================


def execute_tool(
    *,
    tool_name: str,
    db: Session,
    current_user: Any,
    arguments: Optional[Dict[str, Any]] = None,
    engine: PermissionEngine = permission_engine,
) -> Any:
    """
    Execute one registered AI tool.

    Execution sequence:

        tool lookup
            ↓
        permission check
            ↓
        scope metadata check
            ↓
        existing CRUD/business logic
            ↓
        result

    The AI layer cannot execute an unregistered operation.
    """

    tool = get_tool(tool_name)

    if tool is None:
        raise ValueError(
            f"Unknown AI tool: {tool_name}"
        )

    arguments = arguments or {}

    _require_permission(
        current_user=current_user,
        resource=tool.resource,
        action=tool.action,
        engine=engine,
    )

    scope = engine.get_scope(
        role=current_user.role,
        resource=tool.resource,
        action=tool.action,
    )

    if scope == Scope.NONE:
        raise PermissionError(
            f"No valid permission scope for AI tool "
            f"'{tool_name}'."
        )

    return tool.executor(
        db,
        current_user,
        arguments,
    )


# ============================================================
# CONFIRMATION METADATA
# ============================================================


def tool_requires_confirmation(
    tool_name: str,
    current_user: Any,
    engine: PermissionEngine = permission_engine,
) -> bool:
    """
    Check whether a tool requires explicit confirmation
    before execution.
    """

    tool = get_tool(tool_name)

    if tool is None:
        raise ValueError(
            f"Unknown AI tool: {tool_name}"
        )

    return engine.requires_confirmation(
        role=current_user.role,
        resource=tool.resource,
        action=tool.action,
    )