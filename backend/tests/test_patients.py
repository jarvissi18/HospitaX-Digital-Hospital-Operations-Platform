from app.auth.security import create_access_token
from app.database import SessionLocal
from app import models
from app.models import Patient, PatientAssignment



def test_patients_requires_authentication(client):
    response = client.get("/patients/")

    assert response.status_code == 401


def test_doctor_cannot_create_patient(client):
    db = SessionLocal()

    try:
        doctor = models.User(
            employee_id="TEST-DOCTOR-001",
            full_name="Test Doctor",
            email="doctor-test@example.com",
            password_hash="test-only-hash",
            role="Doctor",
            is_active="true",
        )
        db.add(doctor)
        db.commit()
        db.refresh(doctor)

        token = create_access_token(
            {"sub": str(doctor.id)}
        )

        response = client.post(
            "/patients/",
            headers={
                "Authorization": f"Bearer {token}"
            },
            json={
                "name": "Test Patient",
                "age": 35,
                "gender": "Male",
                "village": "Test Village",
                "disease": "Test condition",
                "mobile": "9000000001",
            },
        )

        assert response.status_code == 403

    finally:
        db.close()


def test_admin_can_create_patient(client):
    db = SessionLocal()

    try:
        admin = models.User(
            employee_id="TEST-ADMIN-001",
            full_name="Test Administrator",
            email="admin-test@example.com",
            password_hash="test-only-hash",
            role="Administrator",
            is_active="true",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        token = create_access_token(
            {"sub": str(admin.id)}
        )

        response = client.post(
            "/patients/",
            headers={
                "Authorization": f"Bearer {token}"
            },
            json={
                "name": "Admin Test Patient",
                "age": 40,
                "gender": "Male",
                "village": "Test Village",
                "disease": "Test condition",
                "mobile": "9000000002",
            },
        )

        assert response.status_code in (200, 201), response.text

        data = response.json()
        assert data["name"] == "Admin Test Patient"

    finally:
        db.close()


def test_receptionist_can_create_patient(client):
    db = SessionLocal()

    try:
        receptionist = models.User(
            employee_id="TEST-RECEPTIONIST-001",
            full_name="Test Receptionist",
            email="receptionist-test@example.com",
            password_hash="test-only-hash",
            role="Receptionist",
            is_active="true",
        )
        db.add(receptionist)
        db.commit()
        db.refresh(receptionist)

        token = create_access_token(
            {"sub": str(receptionist.id)}
        )

        response = client.post(
            "/patients/",
            headers={
                "Authorization": f"Bearer {token}"
            },
            json={
                "name": "Reception Test Patient",
                "age": 30,
                "gender": "Female",
                "village": "Test Village",
                "disease": "Test condition",
                "mobile": "9000000003",
            },
        )

        assert response.status_code in (200, 201), response.text
        assert response.json()["name"] == "Reception Test Patient"

    finally:
        db.close()


def test_doctor_sees_only_actively_assigned_patients(client):
    db = SessionLocal()

    try:
        doctor = models.User(
            employee_id="TEST-DOCTOR-LIST-001",
            full_name="Doctor List Test",
            email="doctor-list@example.com",
            password_hash="test-only-hash",
            role="Doctor",
            is_active="true",
        )
        db.add(doctor)
        db.flush()

        assigned_patient = models.Patient(
            name="Assigned Patient",
            age=35,
            gender="Male",
            village="Village A",
            disease="Test condition",
            mobile="9000000004",
        )
        unassigned_patient = models.Patient(
            name="Unassigned Patient",
            age=45,
            gender="Female",
            village="Village B",
            disease="Test condition",
            mobile="9000000005",
        )
        db.add_all([assigned_patient, unassigned_patient])
        db.flush()

        assignment = models.PatientAssignment(
            patient_id=assigned_patient.id,
            doctor_id=doctor.id,
            status="Active",
        )
        db.add(assignment)
        db.commit()
        db.refresh(doctor)

        token = create_access_token({"sub": str(doctor.id)})
        response = client.get(
            "/patients/",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200, response.text
        patient_names = [p["name"] for p in response.json()]
        assert "Assigned Patient" in patient_names
        assert "Unassigned Patient" not in patient_names

    finally:
        db.close()


def test_nurse_sees_only_actively_assigned_patients(client):
    db = SessionLocal()

    try:
        nurse = models.User(
            employee_id="TEST-NURSE-LIST-001",
            full_name="Nurse List Test",
            email="nurse-list@example.com",
            password_hash="test-only-hash",
            role="Nurse",
            is_active="true",
        )
        db.add(nurse)
        db.flush()

        assigned_patient = models.Patient(
            name="Nurse Assigned Patient",
            age=28,
            gender="Female",
            village="Village C",
            disease="Test condition",
            mobile="9000000006",
        )
        unassigned_patient = models.Patient(
            name="Nurse Unassigned Patient",
            age=38,
            gender="Male",
            village="Village D",
            disease="Test condition",
            mobile="9000000007",
        )
        db.add_all([assigned_patient, unassigned_patient])
        db.flush()

        assignment = models.PatientAssignment(
            patient_id=assigned_patient.id,
            nurse_id=nurse.id,
            status="Active",
        )
        db.add(assignment)
        db.commit()
        db.refresh(nurse)

        token = create_access_token({"sub": str(nurse.id)})
        response = client.get(
            "/patients/",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200, response.text
        patient_names = [p["name"] for p in response.json()]
        assert "Nurse Assigned Patient" in patient_names
        assert "Nurse Unassigned Patient" not in patient_names

    finally:
        db.close()


def test_doctor_cannot_view_unassigned_patient_assignments(client):
    db = SessionLocal()

    try:
        doctor = models.User(
            employee_id="TEST-DOCTOR-ACCESS-001",
            full_name="Access Test Doctor",
            email="doctor-access@example.com",
            password_hash="test-only-hash",
            role="Doctor",
            is_active="true",
        )
        db.add(doctor)

        patient = models.Patient(
            name="Private Patient",
            age=40,
            gender="Male",
            village="Test Village",
            disease="Test condition",
            mobile="9000000011",
        )
        db.add(patient)
        db.commit()
        db.refresh(doctor)
        db.refresh(patient)

        token = create_access_token({"sub": str(doctor.id)})

        response = client.get(
            f"/patients/{patient.id}/assignments",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    finally:
        db.close()

def test_housekeeper_cannot_create_patient(client):
    db = SessionLocal()

    try:
        housekeeper = models.User(
            employee_id="TEST-HOUSEKEEPER-001",
            full_name="Test Housekeeper",
            email="housekeeper-test@example.com",
            password_hash="test-only-hash",
            role="Housekeeper",
            is_active="true",
        )
        db.add(housekeeper)
        db.commit()
        db.refresh(housekeeper)

        token = create_access_token({"sub": str(housekeeper.id)})

        response = client.post(
            "/patients/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Blocked Patient",
                "age": 25,
                "gender": "Male",
                "village": "Test Village",
                "disease": "Test condition",
                "mobile": "9000000012",
            },
        )

        assert response.status_code == 403

    finally:
        db.close()


def test_doctor_cannot_update_patient(client):
    db = SessionLocal()

    try:
        doctor = models.User(
            employee_id="TEST-DOCTOR-UPDATE-001",
            full_name="Update Test Doctor",
            email="doctor-update@example.com",
            password_hash="test-only-hash",
            role="Doctor",
            is_active="true",
        )
        db.add(doctor)

        patient = models.Patient(
            name="Original Patient",
            age=30,
            gender="Male",
            village="Test Village",
            disease="Original condition",
            mobile="9000000013",
        )
        db.add(patient)
        db.commit()
        db.refresh(doctor)
        db.refresh(patient)

        token = create_access_token({"sub": str(doctor.id)})

        response = client.put(
            f"/patients/{patient.id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Changed Patient"},
        )

        assert response.status_code == 403

        db.refresh(patient)
        assert patient.name == "Original Patient"

    finally:
        db.close()


def test_doctor_cannot_delete_patient(client):
    db = SessionLocal()

    try:
        doctor = models.User(
            employee_id="TEST-DOCTOR-DELETE-001",
            full_name="Delete Test Doctor",
            email="doctor-delete@example.com",
            password_hash="test-only-hash",
            role="Doctor",
            is_active="true",
        )
        db.add(doctor)

        patient = models.Patient(
            name="Protected Patient",
            age=32,
            gender="Female",
            village="Test Village",
            disease="Test condition",
            mobile="9000000014",
        )
        db.add(patient)
        db.commit()
        db.refresh(doctor)
        db.refresh(patient)

        patient_id = patient.id
        token = create_access_token({"sub": str(doctor.id)})

        response = client.delete(
            f"/patients/{patient_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403
        assert db.query(models.Patient).filter(
            models.Patient.id == patient_id
        ).first() is not None

    finally:
        db.close()



def test_doctor_cannot_create_patient_assignment(client):
    db = SessionLocal()

    try:
        doctor = models.User(
            employee_id="TEST-DOCTOR-ASSIGN-001",
            full_name="Assignment Test Doctor",
            email="doctor-assign@example.com",
            password_hash="test-only-hash",
            role="Doctor",
            is_active="true",
        )
        db.add(doctor)

        patient = models.Patient(
            name="Assignment Test Patient",
            age=35,
            gender="Male",
            village="Test Village",
            disease="Test condition",
            mobile="9000000021",
        )
        db.add(patient)
        db.commit()
        db.refresh(doctor)
        db.refresh(patient)

        token = create_access_token({"sub": str(doctor.id)})

        response = client.post(
            f"/patients/{patient.id}/assignments",
            headers={"Authorization": f"Bearer {token}"},
            json={"patient_id": patient.id},
        )

        assert response.status_code == 403

    finally:
        db.close()


def test_assignment_patient_id_mismatch_is_rejected(client):
    db = SessionLocal()

    try:
        admin = models.User(
            employee_id="TEST-ADMIN-MISMATCH-001",
            full_name="Assignment Admin",
            email="admin-mismatch@example.com",
            password_hash="test-only-hash",
            role="Administrator",
            is_active="true",
        )
        db.add(admin)

        patient_a = models.Patient(
            name="Assignment Patient A",
            age=30,
            gender="Male",
            village="Village A",
            disease="Test condition",
            mobile="9000000022",
        )
        patient_b = models.Patient(
            name="Assignment Patient B",
            age=31,
            gender="Female",
            village="Village B",
            disease="Test condition",
            mobile="9000000023",
        )
        db.add_all([patient_a, patient_b])
        db.commit()
        db.refresh(admin)
        db.refresh(patient_a)
        db.refresh(patient_b)

        token = create_access_token({"sub": str(admin.id)})

        response = client.post(
            f"/patients/{patient_a.id}/assignments",
            headers={"Authorization": f"Bearer {token}"},
            json={"patient_id": patient_b.id},
        )

        assert response.status_code == 400
        assert "does not match" in response.json()["detail"]

    finally:
        db.close()


def test_doctor_cannot_release_patient_assignment(client):
    db = SessionLocal()

    try:
        doctor = models.User(
            employee_id="TEST-DOCTOR-RELEASE-001",
            full_name="Release Test Doctor",
            email="doctor-release@example.com",
            password_hash="test-only-hash",
            role="Doctor",
            is_active="true",
        )
        db.add(doctor)

        patient = models.Patient(
            name="Release Test Patient",
            age=36,
            gender="Female",
            village="Test Village",
            disease="Test condition",
            mobile="9000000024",
        )
        db.add(patient)
        db.commit()
        db.refresh(doctor)
        db.refresh(patient)

        assignment = models.PatientAssignment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            status="Active",
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        assignment_id = assignment.id
        token = create_access_token({"sub": str(doctor.id)})

        response = client.post(
            f"/patients/{patient.id}/assignments/{assignment_id}/release",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

        db.refresh(assignment)
        assert assignment.status == "Active"

    finally:
        db.close()



def test_assignment_cannot_be_updated_using_wrong_patient_id(client):
    db = SessionLocal()

    try:
        admin = models.User(
            employee_id="TEST-ADMIN-OWNERSHIP-001",
            full_name="Ownership Test Admin",
            email="admin-ownership@example.com",
            password_hash="test-only-hash",
            role="Administrator",
            is_active="true",
        )
        db.add(admin)

        patient_a = models.Patient(
            name="Assignment Owner A",
            age=30,
            gender="Male",
            village="Village A",
            disease="Test condition",
            mobile="9000000031",
        )
        patient_b = models.Patient(
            name="Assignment Owner B",
            age=31,
            gender="Female",
            village="Village B",
            disease="Test condition",
            mobile="9000000032",
        )
        db.add_all([patient_a, patient_b])
        db.commit()
        db.refresh(admin)
        db.refresh(patient_a)
        db.refresh(patient_b)

        assignment = models.PatientAssignment(
            patient_id=patient_a.id,
            status="Active",
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        assignment_id = assignment.id
        token = create_access_token({"sub": str(admin.id)})

        response = client.put(
            f"/patients/{patient_b.id}/assignments/{assignment_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"notes": "Attempted unauthorized reassignment"},
        )

        assert response.status_code == 400
        assert "does not belong" in response.json()["detail"]

        db.refresh(assignment)
        assert assignment.patient_id == patient_a.id

    finally:
        db.close()


def test_assignment_cannot_be_released_using_wrong_patient_id(client):
    db = SessionLocal()

    try:
        admin = models.User(
            employee_id="TEST-ADMIN-RELEASE-OWNER-001",
            full_name="Release Ownership Admin",
            email="admin-release-owner@example.com",
            password_hash="test-only-hash",
            role="Administrator",
            is_active="true",
        )
        db.add(admin)

        patient_a = models.Patient(
            name="Release Owner A",
            age=30,
            gender="Male",
            village="Village A",
            disease="Test condition",
            mobile="9000000041",
        )
        patient_b = models.Patient(
            name="Release Owner B",
            age=31,
            gender="Female",
            village="Village B",
            disease="Test condition",
            mobile="9000000042",
        )
        db.add_all([patient_a, patient_b])
        db.commit()
        db.refresh(admin)
        db.refresh(patient_a)
        db.refresh(patient_b)

        assignment = models.PatientAssignment(
            patient_id=patient_a.id,
            status="Active",
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        assignment_id = assignment.id
        token = create_access_token({"sub": str(admin.id)})

        response = client.post(
            f"/patients/{patient_b.id}/assignments/{assignment_id}/release",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "does not belong" in response.json()["detail"]

        db.refresh(assignment)
        assert assignment.patient_id == patient_a.id
        assert assignment.status == "Active"

    finally:
        db.close()


def test_released_assignment_is_not_returned_as_active(client):
    db = SessionLocal()

    try:
        admin = models.User(
            employee_id="TEST-ADMIN-ACTIVE-001",
            full_name="Active Assignment Admin",
            email="admin-active-test@example.com",
            password_hash="test-only-hash",
            role="Administrator",
            is_active="true",
        )
        db.add(admin)

        patient = models.Patient(
            name="Released Assignment Patient",
            age=30,
            gender="Male",
            village="Test Village",
            disease="Test condition",
            mobile="9000000051",
        )
        db.add(patient)
        db.commit()
        db.refresh(admin)
        db.refresh(patient)

        assignment = models.PatientAssignment(
            patient_id=patient.id,
            status="Active",
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        token = create_access_token({"sub": str(admin.id)})

        release_response = client.post(
            f"/patients/{patient.id}/assignments/{assignment.id}/release",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert release_response.status_code == 200, release_response.text

        active_response = client.get(
            f"/patients/{patient.id}/assignments/active",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert active_response.status_code == 404

    finally:
        db.close()



def test_invalid_jwt_token_is_rejected(client):
    response = client.get(
        "/patients/",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401


def test_malformed_jwt_token_is_rejected(client):
    response = client.get(
        "/patients/",
        headers={"Authorization": "Bearer not.a.valid.jwt"},
    )

    assert response.status_code == 401


def test_inactive_user_cannot_access_patients(client):
    db = SessionLocal()

    try:
        inactive_user = models.User(
            employee_id="TEST-INACTIVE-USER-001",
            full_name="Inactive Test User",
            email="inactive-test@example.com",
            password_hash="test-only-hash",
            role="Administrator",
            is_active="false",
        )
        db.add(inactive_user)
        db.commit()
        db.refresh(inactive_user)

        token = create_access_token(
            {"sub": str(inactive_user.id)}
        )

        response = client.get(
            "/patients/",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403
        assert response.json()["detail"] == (
            "This user account is inactive."
        )

    finally:
        db.close()


def test_token_for_nonexistent_user_is_rejected(client):
    token = create_access_token(
        {"sub": "999999"}
    )

    response = client.get(
        "/patients/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Authenticated user no longer exists."
    )
