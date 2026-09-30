"""
AI Operations Assistant - Permission Engine

Purpose
-------
Centralized, AI-specific authorization rules.

This module does NOT:
- access the database
- call Gemini
- execute CRUD operations
- modify application data

It only answers:
    "Can this authenticated role perform this action
     on this resource?"

The existing FastAPI routers remain the final authorization
boundary for normal API requests. This engine is an additional
guard for AI-originated operations.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import FrozenSet, Optional


# ============================================================
# ROLES
# ============================================================


class Role(str, Enum):
    ADMINISTRATOR = "Administrator"
    DOCTOR = "Doctor"
    NURSE = "Nurse"
    RECEPTIONIST = "Receptionist"
    HOUSEKEEPER = "Housekeeper"


# ============================================================
# ACTIONS
# ============================================================


class Action(str, Enum):
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

    START = "start"
    COMPLETE = "complete"
    CANCEL = "cancel"

    APPROVE = "approve"
    REJECT = "reject"

    ACCEPT = "accept"
    ACTIVATE = "activate"
    DISCONTINUE = "discontinue"

    VALIDATE = "validate"
    REVIEW = "review"
    FINALIZE = "finalize"

    CHECK_IN = "check_in"
    CHECK_OUT = "check_out"

    TRIAGE = "triage"

    ASSIGN = "assign"


# ============================================================
# RESOURCES
# ============================================================


class Resource(str, Enum):
    PATIENT = "patient"
    PATIENT_ASSIGNMENT = "patient_assignment"

    WORK_TASK = "work_task"

    CLINICAL_ENCOUNTER = "clinical_encounter"
    NURSING_OBSERVATION = "nursing_observation"

    PRESCRIPTION = "prescription"
    REFERRAL = "referral"

    APPOINTMENT = "appointment"
    PATIENT_QUEUE = "patient_queue"

    LAB_ORDER = "lab_order"
    LAB_SAMPLE = "lab_sample"
    LAB_RESULT = "lab_result"

    PATIENT_TRANSFER = "patient_transfer"

    DISCHARGE = "discharge"
    FOLLOW_UP = "follow_up"

    HOSPITAL_STRUCTURE = "hospital_structure"
    STAFF = "staff"
    ATTENDANCE = "attendance"

    ANALYTICS = "analytics"
    DASHBOARD = "dashboard"
    SETTINGS = "settings"


# ============================================================
# SCOPE
# ============================================================


class Scope(str, Enum):
    """
    Defines how a permission may be scoped.

    GLOBAL
        Access is not inherently limited to the current user.

    OWN
        Resource/action is limited to the current user's
        ownership according to the underlying business rule.

    ASSIGNED
        Resource is limited to records assigned to the user.

    PATIENT
        Access may require patient-level authorization/context.

    NONE
        No access.
    """

    GLOBAL = "global"
    OWN = "own"
    ASSIGNED = "assigned"
    PATIENT = "patient"
    NONE = "none"


# ============================================================
# PERMISSION DEFINITION
# ============================================================


@dataclass(frozen=True)
class Permission:
    """
    One AI permission rule.
    """

    roles: FrozenSet[Role]
    resource: Resource
    actions: FrozenSet[Action]
    scope: Scope = Scope.GLOBAL
    requires_confirmation: bool = False


# ============================================================
# ROLE GROUPS
# ============================================================


ADMIN_ONLY = frozenset(
    {
        Role.ADMINISTRATOR,
    }
)

CLINICAL_VIEW = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.DOCTOR,
        Role.NURSE,
    }
)

CLINICAL_DOCTOR = frozenset(
    {
        Role.DOCTOR,
    }
)

OPERATIONAL_STAFF = frozenset(
    {
        Role.DOCTOR,
        Role.NURSE,
        Role.RECEPTIONIST,
        Role.HOUSEKEEPER,
    }
)

APPOINTMENT_MANAGERS = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.RECEPTIONIST,
    }
)

APPOINTMENT_VIEWERS = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.RECEPTIONIST,
        Role.DOCTOR,
    }
)

QUEUE_VIEWERS = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.RECEPTIONIST,
        Role.DOCTOR,
        Role.NURSE,
    }
)

QUEUE_MANAGERS = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.RECEPTIONIST,
    }
)

TRANSFER_VIEWERS = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.DOCTOR,
        Role.NURSE,
    }
)

TRANSFER_APPROVERS = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.DOCTOR,
    }
)

TRANSFER_EXECUTORS = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.DOCTOR,
        Role.NURSE,
    }
)

LAB_SAMPLE_OPERATORS = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.DOCTOR,
        Role.NURSE,
    }
)

LAB_OPERATIONAL = frozenset(
    {
        Role.ADMINISTRATOR,
        Role.DOCTOR,
    }
)


# ============================================================
# PERMISSION TABLE
# ============================================================
#
# IMPORTANT:
# This table is intentionally conservative.
#
# If an operation is not explicitly present here, the AI layer
# must treat it as DENIED.
#
# Existing API-router authorization remains authoritative for
# direct API access.
# ============================================================


PERMISSIONS: tuple[Permission, ...] = (

    # --------------------------------------------------------
    # PATIENT
    # --------------------------------------------------------

    Permission(
        roles=CLINICAL_VIEW
        | frozenset({Role.RECEPTIONIST}),
        resource=Resource.PATIENT,
        actions=frozenset({Action.VIEW}),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.RECEPTIONIST,
            }
        ),
        resource=Resource.PATIENT,
        actions=frozenset({Action.CREATE}),
        scope=Scope.GLOBAL,
        requires_confirmation=True,
    ),

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.RECEPTIONIST,
            }
        ),
        resource=Resource.PATIENT,
        actions=frozenset({Action.UPDATE}),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # PATIENT ASSIGNMENT
    # --------------------------------------------------------

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.RECEPTIONIST,
            }
        ),
        resource=Resource.PATIENT_ASSIGNMENT,
        actions=frozenset(
            {
                Action.VIEW,
                Action.CREATE,
                Action.UPDATE,
                Action.ASSIGN,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # WORK TASKS
    # --------------------------------------------------------

    # Read-only work-task access for Administrator.
    Permission(
        roles=ADMIN_ONLY,
        resource=Resource.WORK_TASK,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # Work-task mutations require explicit confirmation.
    Permission(
        roles=ADMIN_ONLY,
        resource=Resource.WORK_TASK,
        actions=frozenset(
            {
                Action.CREATE,
                Action.UPDATE,
                Action.CANCEL,
                Action.ASSIGN,
            }
        ),
        scope=Scope.GLOBAL,
        requires_confirmation=True,
    ),

    Permission(
        roles=OPERATIONAL_STAFF,
        resource=Resource.WORK_TASK,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.ASSIGNED,
    ),

    Permission(
        roles=OPERATIONAL_STAFF,
        resource=Resource.WORK_TASK,
        actions=frozenset(
            {
                Action.START,
                Action.COMPLETE,
            }
        ),
        scope=Scope.OWN,
    ),

    # --------------------------------------------------------
    # CLINICAL ENCOUNTERS
    # --------------------------------------------------------

    # Patient-level clinical encounter viewing is available to
    # Administrator and Nurse through the AI assistant.
    #
    # Doctors retain their own clinical scope for encounter
    # access through the separate Doctor permission below.
    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.NURSE,
            }
        ),
        resource=Resource.CLINICAL_ENCOUNTER,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=CLINICAL_DOCTOR,
        resource=Resource.CLINICAL_ENCOUNTER,
        actions=frozenset(
            {
                Action.VIEW,
                Action.CREATE,
                Action.UPDATE,
                Action.COMPLETE,
                Action.CANCEL,
            }
        ),
        scope=Scope.OWN,
    ),

    # --------------------------------------------------------
    # NURSING OBSERVATIONS
    # --------------------------------------------------------

    # --------------------------------------------------------
    # NURSING OBSERVATIONS
    # --------------------------------------------------------
    #
    # Viewing nursing observations is read-only.
    #
    # Creating or updating a nursing observation changes
    # clinical/patient data, therefore the AI layer requires
    # explicit confirmation before executing those actions.
    #
    # The existing nursing router / CRUD authorization remains
    # the final application-level authorization boundary.
    # --------------------------------------------------------

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.NURSE,
            }
        ),
        resource=Resource.NURSING_OBSERVATION,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.NURSE,
            }
        ),
        resource=Resource.NURSING_OBSERVATION,
        actions=frozenset(
            {
                Action.CREATE,
            }
        ),
        scope=Scope.PATIENT,
        requires_confirmation=True,
    ),

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.NURSE,
            }
        ),
        resource=Resource.NURSING_OBSERVATION,
        actions=frozenset(
            {
                Action.UPDATE,
            }
        ),
        scope=Scope.PATIENT,
        requires_confirmation=True,
    ),

    # --------------------------------------------------------
    # PRESCRIPTIONS
    # --------------------------------------------------------

    Permission(
        roles=CLINICAL_VIEW,
        resource=Resource.PRESCRIPTION,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=CLINICAL_DOCTOR,
        resource=Resource.PRESCRIPTION,
        actions=frozenset(
            {
                Action.CREATE,
                Action.UPDATE,
                Action.ACTIVATE,
                Action.COMPLETE,
                Action.DISCONTINUE,
                Action.CANCEL,
            }
        ),
        scope=Scope.OWN,
    ),

    # --------------------------------------------------------
    # REFERRALS
    # --------------------------------------------------------

    Permission(
        roles=CLINICAL_VIEW,
        resource=Resource.REFERRAL,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=CLINICAL_DOCTOR,
        resource=Resource.REFERRAL,
        actions=frozenset(
            {
                Action.CREATE,
                Action.UPDATE,
                Action.ACCEPT,
                Action.START,
                Action.COMPLETE,
                Action.REJECT,
                Action.CANCEL,
            }
        ),
        scope=Scope.OWN,
    ),

    # --------------------------------------------------------
    # APPOINTMENTS
    # --------------------------------------------------------

    Permission(
        roles=APPOINTMENT_VIEWERS,
        resource=Resource.APPOINTMENT,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=APPOINTMENT_MANAGERS,
        resource=Resource.APPOINTMENT,
        actions=frozenset(
            {
                Action.CREATE,
                Action.UPDATE,
                Action.CHECK_IN,
                Action.CANCEL,
                Action.COMPLETE,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    Permission(
        roles=APPOINTMENT_MANAGERS,
        resource=Resource.APPOINTMENT,
        actions=frozenset(
            {
                Action.DELETE,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # PATIENT QUEUE
    # --------------------------------------------------------

    Permission(
        roles=QUEUE_VIEWERS,
        resource=Resource.PATIENT_QUEUE,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    Permission(
        roles=QUEUE_MANAGERS,
        resource=Resource.PATIENT_QUEUE,
        actions=frozenset(
            {
                Action.START,
                Action.COMPLETE,
                Action.CANCEL,
                Action.CHECK_IN,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    Permission(
        roles=frozenset({Role.NURSE}),
        resource=Resource.PATIENT_QUEUE,
        actions=frozenset(
            {
                Action.TRIAGE,
            }
        ),
        scope=Scope.PATIENT,
    ),

    # --------------------------------------------------------
    # LAB ORDER
    # --------------------------------------------------------

    Permission(
        roles=CLINICAL_DOCTOR,
        resource=Resource.LAB_ORDER,
        actions=frozenset(
            {
                Action.VIEW,
                Action.CREATE,
                Action.UPDATE,
                Action.CANCEL,
            }
        ),
        scope=Scope.OWN,
    ),

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.DOCTOR,
            }
        ),
        resource=Resource.LAB_ORDER,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    # --------------------------------------------------------
    # LAB SAMPLE
    # --------------------------------------------------------

    Permission(
        roles=LAB_SAMPLE_OPERATORS,
        resource=Resource.LAB_SAMPLE,
        actions=frozenset(
            {
                Action.CREATE,
                Action.UPDATE,
                Action.COMPLETE,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # LAB RESULT
    # --------------------------------------------------------

    Permission(
        roles=LAB_OPERATIONAL,
        resource=Resource.LAB_RESULT,
        actions=frozenset(
            {
                Action.CREATE,
                Action.UPDATE,
                Action.VALIDATE,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    Permission(
        roles=CLINICAL_DOCTOR,
        resource=Resource.LAB_RESULT,
        actions=frozenset(
            {
                Action.VIEW,
                Action.REVIEW,
                Action.FINALIZE,
            }
        ),
        scope=Scope.PATIENT,
    ),

    # --------------------------------------------------------
    # PATIENT TRANSFER
    # --------------------------------------------------------

    Permission(
        roles=TRANSFER_VIEWERS,
        resource=Resource.PATIENT_TRANSFER,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=CLINICAL_DOCTOR,
        resource=Resource.PATIENT_TRANSFER,
        actions=frozenset(
            {
                Action.CREATE,
                Action.CANCEL,
            }
        ),
        scope=Scope.OWN,
    ),

    Permission(
        roles=TRANSFER_APPROVERS,
        resource=Resource.PATIENT_TRANSFER,
        actions=frozenset(
            {
                Action.APPROVE,
                Action.REJECT,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    Permission(
        roles=TRANSFER_EXECUTORS,
        resource=Resource.PATIENT_TRANSFER,
        actions=frozenset(
            {
                Action.START,
                Action.COMPLETE,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # DISCHARGE
    # --------------------------------------------------------

    Permission(
        roles=CLINICAL_VIEW,
        resource=Resource.DISCHARGE,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=CLINICAL_DOCTOR,
        resource=Resource.DISCHARGE,
        actions=frozenset(
            {
                Action.CREATE,
                Action.UPDATE,
                Action.COMPLETE,
                Action.CANCEL,
            }
        ),
        scope=Scope.OWN,
        requires_confirmation=True,
    ),

    # --------------------------------------------------------
    # FOLLOW-UP
    # --------------------------------------------------------

    Permission(
        roles=CLINICAL_VIEW,
        resource=Resource.FOLLOW_UP,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.PATIENT,
    ),

    Permission(
        roles=CLINICAL_DOCTOR,
        resource=Resource.FOLLOW_UP,
        actions=frozenset(
            {
                Action.CREATE,
                Action.UPDATE,
                Action.COMPLETE,
                Action.CANCEL,
            }
        ),
        scope=Scope.OWN,
    ),

    # --------------------------------------------------------
    # HOSPITAL STRUCTURE
    # --------------------------------------------------------

    Permission(
        roles=ADMIN_ONLY,
        resource=Resource.HOSPITAL_STRUCTURE,
        actions=frozenset(
            {
                Action.VIEW,
                Action.CREATE,
                Action.UPDATE,
                Action.DELETE,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # STAFF
    # --------------------------------------------------------

    Permission(
        roles=ADMIN_ONLY,
        resource=Resource.STAFF,
        actions=frozenset(
            {
                Action.VIEW,
                Action.CREATE,
                Action.UPDATE,
                Action.DELETE,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # ATTENDANCE
    # --------------------------------------------------------

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.DOCTOR,
                Role.NURSE,
                Role.RECEPTIONIST,
                Role.HOUSEKEEPER,
            }
        ),
        resource=Resource.ATTENDANCE,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.OWN,
    ),

    Permission(
        roles=ADMIN_ONLY,
        resource=Resource.ATTENDANCE,
        actions=frozenset(
            {
                Action.VIEW,
                Action.UPDATE,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # ANALYTICS
    # --------------------------------------------------------

    Permission(
        roles=ADMIN_ONLY,
        resource=Resource.ANALYTICS,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.GLOBAL,
    ),

    # --------------------------------------------------------
    # DASHBOARD
    # --------------------------------------------------------

    Permission(
        roles=frozenset(
            {
                Role.ADMINISTRATOR,
                Role.DOCTOR,
                Role.NURSE,
                Role.RECEPTIONIST,
                Role.HOUSEKEEPER,
            }
        ),
        resource=Resource.DASHBOARD,
        actions=frozenset(
            {
                Action.VIEW,
            }
        ),
        scope=Scope.OWN,
    ),

    # --------------------------------------------------------
    # SETTINGS
    # --------------------------------------------------------

    Permission(
        roles=ADMIN_ONLY,
        resource=Resource.SETTINGS,
        actions=frozenset(
            {
                Action.VIEW,
                Action.UPDATE,
            }
        ),
        scope=Scope.GLOBAL,
    ),
)


# ============================================================
# PERMISSION ENGINE
# ============================================================


class PermissionEngine:
    """
    Stateless AI permission evaluator.

    The engine intentionally fails closed:
    if no explicit permission matches, access is denied.
    """

    def __init__(
        self,
        permissions: tuple[Permission, ...] = PERMISSIONS,
    ) -> None:
        self._permissions = permissions

    def is_allowed(
        self,
        role: str | Role,
        resource: str | Resource,
        action: str | Action,
    ) -> bool:
        """
        Return True only when an explicit permission exists.
        """

        normalized_role = self._normalize_role(role)
        normalized_resource = self._normalize_resource(resource)
        normalized_action = self._normalize_action(action)

        if (
            normalized_role is None
            or normalized_resource is None
            or normalized_action is None
        ):
            return False

        return any(
            permission.resource == normalized_resource
            and normalized_role in permission.roles
            and normalized_action in permission.actions
            for permission in self._permissions
        )

    def get_permission(
        self,
        role: str | Role,
        resource: str | Resource,
        action: str | Action,
    ) -> Optional[Permission]:
        """
        Return the matching permission definition.

        Returns None when access is denied.
        """

        normalized_role = self._normalize_role(role)
        normalized_resource = self._normalize_resource(resource)
        normalized_action = self._normalize_action(action)

        if (
            normalized_role is None
            or normalized_resource is None
            or normalized_action is None
        ):
            return None

        for permission in self._permissions:
            if (
                permission.resource == normalized_resource
                and normalized_role in permission.roles
                and normalized_action in permission.actions
            ):
                return permission

        return None

    def requires_confirmation(
        self,
        role: str | Role,
        resource: str | Resource,
        action: str | Action,
    ) -> bool:
        """
        Return whether the matching action requires explicit
        confirmation before the AI action layer executes it.
        """

        permission = self.get_permission(
            role=role,
            resource=resource,
            action=action,
        )

        if permission is None:
            return False

        return permission.requires_confirmation

    def get_scope(
        self,
        role: str | Role,
        resource: str | Resource,
        action: str | Action,
    ) -> Scope:
        """
        Return the scope of an allowed action.

        Unknown/denied operations return Scope.NONE.
        """

        permission = self.get_permission(
            role=role,
            resource=resource,
            action=action,
        )

        if permission is None:
            return Scope.NONE

        return permission.scope

    def allowed_actions(
        self,
        role: str | Role,
        resource: str | Resource,
    ) -> FrozenSet[Action]:
        """
        Return all explicitly allowed actions for a role/resource.
        """

        normalized_role = self._normalize_role(role)
        normalized_resource = self._normalize_resource(resource)

        if (
            normalized_role is None
            or normalized_resource is None
        ):
            return frozenset()

        actions: set[Action] = set()

        for permission in self._permissions:
            if (
                permission.resource == normalized_resource
                and normalized_role in permission.roles
            ):
                actions.update(permission.actions)

        return frozenset(actions)

    # --------------------------------------------------------
    # NORMALIZATION
    # --------------------------------------------------------

    @staticmethod
    def _normalize_role(
        role: str | Role,
    ) -> Optional[Role]:
        if isinstance(role, Role):
            return role

        try:
            return Role(role)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_resource(
        resource: str | Resource,
    ) -> Optional[Resource]:
        if isinstance(resource, Resource):
            return resource

        try:
            return Resource(resource)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_action(
        action: str | Action,
    ) -> Optional[Action]:
        if isinstance(action, Action):
            return action

        try:
            return Action(action)
        except (TypeError, ValueError):
            return None


# ============================================================
# DEFAULT ENGINE INSTANCE
# ============================================================


permission_engine = PermissionEngine()


# ============================================================
# CONVENIENCE FUNCTIONS
# ============================================================


def is_allowed(
    role: str | Role,
    resource: str | Resource,
    action: str | Action,
) -> bool:
    """
    Convenience wrapper around the default permission engine.
    """

    return permission_engine.is_allowed(
        role=role,
        resource=resource,
        action=action,
    )


def requires_confirmation(
    role: str | Role,
    resource: str | Resource,
    action: str | Action,
) -> bool:
    """
    Convenience wrapper for confirmation checks.
    """

    return permission_engine.requires_confirmation(
        role=role,
        resource=resource,
        action=action,
    )


def get_scope(
    role: str | Role,
    resource: str | Resource,
    action: str | Action,
) -> Scope:
    """
    Convenience wrapper for scope checks.
    """

    return permission_engine.get_scope(
        role=role,
        resource=resource,
        action=action,
    )