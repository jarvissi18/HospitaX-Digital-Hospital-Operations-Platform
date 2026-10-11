
from app import models
from app.database import SessionLocal
from app.ai.tools import execute_tool


def test_ai_work_task_tool_returns_only_current_users_tasks(client):
    db = SessionLocal()

    try:
        nurse_a = models.User(
            employee_id="AI-SCOPE-NURSE-001",
            full_name="Scope Nurse A",
            email="scope-nurse-a@example.com",
            password_hash="test-only-hash",
            role="Nurse",
            is_active="true",
        )

        nurse_b = models.User(
            employee_id="AI-SCOPE-NURSE-002",
            full_name="Scope Nurse B",
            email="scope-nurse-b@example.com",
            password_hash="test-only-hash",
            role="Nurse",
            is_active="true",
        )

        admin = models.User(
            employee_id="AI-SCOPE-ADMIN-001",
            full_name="Scope Test Admin",
            email="scope-admin@example.com",
            password_hash="test-only-hash",
            role="Administrator",
            is_active="true",
        )

        db.add_all([nurse_a, nurse_b, admin])
        db.flush()

        own_task = models.WorkTask(
            title="Nurse A Private Task",
            description="Task assigned to Nurse A",
            assigned_to_id=nurse_a.id,
            created_by_id=admin.id,
            priority="Medium",
            status="Pending",
        )

        other_task = models.WorkTask(
            title="Nurse B Private Task",
            description="Task assigned to Nurse B",
            assigned_to_id=nurse_b.id,
            created_by_id=admin.id,
            priority="High",
            status="Pending",
        )

        db.add_all([own_task, other_task])
        db.commit()
        db.refresh(nurse_a)

        result = execute_tool(
            tool_name="get_my_work_tasks",
            db=db,
            current_user=nurse_a,
            arguments={},
        )

        returned_titles = {
            task.title
            for task in result
        }

        assert returned_titles == {
            "Nurse A Private Task"
        }

    finally:
        db.close()
