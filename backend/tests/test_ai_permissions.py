
from types import SimpleNamespace
from unittest.mock import patch

from app.ai.orchestrator import (
    AIOperationsOrchestrator,
    ExecutionStatus,
)


def test_nurse_cannot_create_work_task(client):
    """A Nurse must be denied the Administrator-only create tool."""
    nurse = SimpleNamespace(
        id=101,
        role="Nurse",
        full_name="Permission Test Nurse",
    )

    orchestrator = AIOperationsOrchestrator()

    with patch(
        "app.ai.orchestrator.execute_tool"
    ) as mock_execute:
        response = orchestrator.execute(
            db=None,
            current_user=nurse,
            message="Create a new work task",
            tool_name="create_work_task",
            arguments={
                "title": "Unauthorized test task",
            },
        )

    assert response.status == ExecutionStatus.DENIED
    mock_execute.assert_not_called()


def test_admin_create_work_task_requires_confirmation(client):
    """An Administrator must confirm before a task is created."""
    admin = SimpleNamespace(
        id=102,
        role="Administrator",
        full_name="Permission Test Admin",
    )

    orchestrator = AIOperationsOrchestrator()

    with patch(
        "app.ai.orchestrator.execute_tool"
    ) as mock_execute:
        response = orchestrator.execute(
            db=None,
            current_user=admin,
            message="Create a new work task",
            tool_name="create_work_task",
            arguments={
                "title": "Confirmation test task",
            },
            confirmed=False,
        )

    assert response.status == ExecutionStatus.NEEDS_CONFIRMATION
    assert response.requires_confirmation is True
    mock_execute.assert_not_called()


from app.ai.permissions import (
    Action,
    PermissionEngine,
    Resource,
    Role,
    Scope,
)


def test_admin_attendance_view_has_global_scope():
    engine = PermissionEngine()

    assert engine.is_allowed(
        Role.ADMINISTRATOR,
        Resource.ATTENDANCE,
        Action.VIEW,
    )

    assert engine.get_scope(
        Role.ADMINISTRATOR,
        Resource.ATTENDANCE,
        Action.VIEW,
    ) == Scope.GLOBAL