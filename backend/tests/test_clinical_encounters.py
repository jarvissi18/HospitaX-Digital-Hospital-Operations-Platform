
from app import models
from app.auth.security import hash_password, create_access_token
from app.database import SessionLocal


# =========================================================
# TEST HELPERS
# =========================================================

def create_patient_for_encounter_test():
    db = SessionLocal()
    try:
        patient = models.Patient(
            name="Clinical Test Patient",
            age=35,
            gender="Male",
            village="Test Village",
            disease="Test condition",
            mobile="9000000091",
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient.id
    finally:
        db.close()


def create_active_assignment_for_encounter_test(
    patient_id,
    doctor_id,
):
    db = SessionLocal()
    try:
        assignment = models.PatientAssignment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            status="Active",
        )
        db.add(assignment)
        db.commit()
    finally:
        db.close()


def create_test_user(
    employee_id,
    email,
    role,
    password="TestPassword123!",
):
    db = SessionLocal()
    try:
        user = models.User(
            employee_id=employee_id,
            full_name=f"Test {role}",
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_active="true",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id
    finally:
        db.close()


def auth_headers(user_id):
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


# =========================================================
# AUTHENTICATION AND ACCESS TESTS
# =========================================================

def test_clinical_encounters_requires_authentication(client):
    response = client.get("/clinical-encounters/my")

    assert response.status_code == 401


def test_non_doctor_cannot_access_clinical_encounters(client):
    user_id = create_test_user(
        "CE-RECEPTION-001",
        "ce-reception@example.com",
        "Receptionist",
    )

    response = client.get(
        "/clinical-encounters/my",
        headers=auth_headers(user_id),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "Only Doctors can access clinical encounters."
    )


def test_doctor_can_get_own_clinical_encounters(client):
    doctor_id = create_test_user(
        "CE-DOCTOR-001",
        "ce-doctor@example.com",
        "Doctor",
    )

    response = client.get(
        "/clinical-encounters/my",
        headers=auth_headers(doctor_id),
    )

    assert response.status_code == 200
    assert response.json() == []


def test_doctor_cannot_view_nonexistent_encounter(client):
    doctor_id = create_test_user(
        "CE-DOCTOR-002",
        "ce-doctor2@example.com",
        "Doctor",
    )

    response = client.get(
        "/clinical-encounters/999999",
        headers=auth_headers(doctor_id),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "Clinical encounter not found."
    )


# =========================================================
# ENCOUNTER CREATION TESTS
# =========================================================

def test_doctor_cannot_create_encounter_without_active_assignment(
    client,
):
    doctor_id = create_test_user(
        "CE-DOCTOR-003",
        "ce-doctor3@example.com",
        "Doctor",
    )
    patient_id = create_patient_for_encounter_test()

    response = client.post(
        "/clinical-encounters/",
        headers=auth_headers(doctor_id),
        json={
            "patient_id": patient_id,
            "chief_complaint": "Fever",
        },
    )

    assert response.status_code == 400
    assert "active patient assignment is required" in (
        response.json()["detail"].lower()
    )


def test_doctor_can_create_encounter_with_active_assignment(client):
    doctor_id = create_test_user(
        "CE-DOCTOR-004",
        "ce-doctor4@example.com",
        "Doctor",
    )
    patient_id = create_patient_for_encounter_test()

    create_active_assignment_for_encounter_test(
        patient_id,
        doctor_id,
    )

    response = client.post(
        "/clinical-encounters/",
        headers=auth_headers(doctor_id),
        json={
            "patient_id": patient_id,
            "chief_complaint": "Fever",
            "symptoms": "High temperature",
        },
    )

    assert response.status_code == 201, response.text

    data = response.json()

    assert data["patient_id"] == patient_id
    assert data["doctor_id"] == doctor_id
    assert data["status"] == "Draft"


# =========================================================
# ENCOUNTER OWNERSHIP TEST
# =========================================================

def test_doctor_cannot_access_another_doctors_encounter(client):
    doctor_one = create_test_user(
        "CE-DOCTOR-005",
        "ce-doctor5@example.com",
        "Doctor",
    )
    doctor_two = create_test_user(
        "CE-DOCTOR-006",
        "ce-doctor6@example.com",
        "Doctor",
    )

    patient_id = create_patient_for_encounter_test()

    create_active_assignment_for_encounter_test(
        patient_id,
        doctor_one,
    )

    created = client.post(
        "/clinical-encounters/",
        headers=auth_headers(doctor_one),
        json={
            "patient_id": patient_id,
            "chief_complaint": "Headache",
        },
    )

    assert created.status_code == 201, created.text

    encounter_id = created.json()["id"]

    response = client.get(
        f"/clinical-encounters/{encounter_id}",
        headers=auth_headers(doctor_two),
    )

    assert response.status_code == 403


# =========================================================
# ENCOUNTER UPDATE VALIDATION TEST
# =========================================================

def test_doctor_cannot_change_encounter_status_through_update(
    client,
):
    doctor_id = create_test_user(
        "CE-DOCTOR-007",
        "ce-doctor7@example.com",
        "Doctor",
    )

    patient_id = create_patient_for_encounter_test()

    create_active_assignment_for_encounter_test(
        patient_id,
        doctor_id,
    )

    created = client.post(
        "/clinical-encounters/",
        headers=auth_headers(doctor_id),
        json={"patient_id": patient_id},
    )

    assert created.status_code == 201, created.text

    encounter_id = created.json()["id"]

    response = client.put(
        f"/clinical-encounters/{encounter_id}",
        headers=auth_headers(doctor_id),
        json={"status": "Completed"},
    )

    assert response.status_code == 400
    assert "status cannot be changed" in (
        response.json()["detail"].lower()
    )


# =========================================================
# ENCOUNTER COMPLETION TEST
# =========================================================

def test_completed_encounter_cannot_be_completed_twice(client):
    doctor_id = create_test_user(
        "CE-DOCTOR-008",
        "ce-doctor8@example.com",
        "Doctor",
    )

    patient_id = create_patient_for_encounter_test()

    create_active_assignment_for_encounter_test(
        patient_id,
        doctor_id,
    )

    created = client.post(
        "/clinical-encounters/",
        headers=auth_headers(doctor_id),
        json={"patient_id": patient_id},
    )

    assert created.status_code == 201, created.text

    encounter_id = created.json()["id"]

    first = client.post(
        f"/clinical-encounters/{encounter_id}/complete",
        headers=auth_headers(doctor_id),
    )

    assert first.status_code == 200, first.text
    assert first.json()["status"] == "Completed"

    second = client.post(
        f"/clinical-encounters/{encounter_id}/complete",
        headers=auth_headers(doctor_id),
    )

    assert second.status_code == 400
    assert "already completed" in (
        second.json()["detail"].lower()
    )


# =========================================================
# CANCELLED ENCOUNTER TEST
# =========================================================

def test_cancelled_encounter_cannot_be_modified(client):
    doctor_id = create_test_user(
        "CE-DOCTOR-009",
        "ce-doctor9@example.com",
        "Doctor",
    )

    patient_id = create_patient_for_encounter_test()

    create_active_assignment_for_encounter_test(
        patient_id,
        doctor_id,
    )

    created = client.post(
        "/clinical-encounters/",
        headers=auth_headers(doctor_id),
        json={"patient_id": patient_id},
    )

    assert created.status_code == 201, created.text

    encounter_id = created.json()["id"]

    cancelled = client.post(
        f"/clinical-encounters/{encounter_id}/cancel",
        headers=auth_headers(doctor_id),
    )

    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "Cancelled"

    response = client.put(
        f"/clinical-encounters/{encounter_id}",
        headers=auth_headers(doctor_id),
        json={
            "clinical_notes": "Attempted modification",
        },
    )

    assert response.status_code == 400
    assert "cannot be modified" in (
        response.json()["detail"].lower()
    )
