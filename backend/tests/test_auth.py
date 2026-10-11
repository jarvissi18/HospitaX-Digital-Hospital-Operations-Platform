from app import models
from app.auth.security import hash_password, create_access_token
from app.database import SessionLocal


def create_test_user(
    employee_id="AUTH-TEST-001",
    email="auth-test@example.com",
    password="TestPassword123!",
    role="Receptionist",
    is_active="true",
):
    db = SessionLocal()
    try:
        user = models.User(
            employee_id=employee_id,
            full_name="Authentication Test User",
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id
    finally:
        db.close()


def test_login_with_valid_credentials(client):
    create_test_user()

    response = client.post(
        "/auth/login",
        json={
            "identifier": "auth-test@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()
    assert data["access_token"]
    assert data["token_type"].lower() == "bearer"
    assert data["user"]["email"] == "auth-test@example.com"


def test_login_with_wrong_password_is_rejected(client):
    create_test_user()

    response = client.post(
        "/auth/login",
        json={
            "identifier": "auth-test@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


def test_login_with_unknown_email_is_rejected(client):
    response = client.post(
        "/auth/login",
        json={
            "identifier": "unknown@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 401


def test_inactive_user_cannot_login(client):
    create_test_user(
        employee_id="AUTH-INACTIVE-001",
        email="inactive-auth@example.com",
        is_active="false",
    )

    response = client.post(
        "/auth/login",
        json={
            "identifier": "inactive-auth@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Invalid employee ID/email or password."
    )


def test_public_registration_cannot_create_administrator(client):
    response = client.post(
        "/auth/register",
        json={
            "employee_id": "AUTH-REGISTER-001",
            "full_name": "Registration Test User",
            "email": "registration-test@example.com",
            "password": "TestPassword123!",
            "pin": "1234",
            "role": "Administrator",
        },
    )

    assert response.status_code in (200, 201), response.text
    assert response.json()["role"] == "Receptionist"


def test_current_user_endpoint_requires_authentication(client):
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_current_user_endpoint_returns_authenticated_user(client):
    user_id = create_test_user(
        employee_id="AUTH-ME-001",
        email="auth-me@example.com",
    )

    token = create_access_token({"sub": str(user_id)})

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["email"] == "auth-me@example.com"


def test_password_change_requires_authentication(client):
    response = client.put(
        "/auth/change-password",
        json={
            "current_password": "TestPassword123!",
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!",
        },
    )

    assert response.status_code == 401

def test_password_change_with_wrong_current_password(client):
    user_id = create_test_user(
        employee_id="AUTH-PASSWORD-001",
        email="auth-password@example.com",
    )

    token = create_access_token({"sub": str(user_id)})

    response = client.put(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "WrongCurrent123!",
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!",
        },
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Current password is incorrect."


def test_password_change_rejects_mismatched_confirmation(client):
    user_id = create_test_user(
        employee_id="AUTH-CONFIRM-001",
        email="auth-confirm@example.com",
    )

    token = create_access_token({"sub": str(user_id)})

    response = client.put(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "TestPassword123!",
            "new_password": "NewPassword123!",
            "confirm_password": "DifferentPassword123!",
        },
    )

    assert response.status_code == 422, response.text

    error_text = str(response.json()["detail"]).lower()
    assert "password" in error_text
    assert "do not match" in error_text


def test_password_change_success_and_new_password_login(client):
    user_id = create_test_user(
        employee_id="AUTH-PASSWORD-SUCCESS-001",
        email="auth-password-success@example.com",
    )

    token = create_access_token({"sub": str(user_id)})

    change_response = client.put(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "TestPassword123!",
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!",
        },
    )

    assert change_response.status_code == 200, change_response.text

    old_login = client.post(
        "/auth/login",
        json={
            "identifier": "auth-password-success@example.com",
            "password": "TestPassword123!",
        },
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/login",
        json={
            "identifier": "auth-password-success@example.com",
            "password": "NewPassword123!",
        },
    )

    assert new_login.status_code == 200, new_login.text
    assert new_login.json()["access_token"]



def test_profile_update_success(client):
    user_id = create_test_user(
        employee_id="AUTH-PROFILE-001",
        email="profile-test@example.com",
    )

    token = create_access_token({"sub": str(user_id)})

    response = client.put(
        "/auth/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Updated Test User",
            "email": "updated-profile@example.com",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()
    assert data["full_name"] == "Updated Test User"
    assert data["email"] == "updated-profile@example.com"
    assert data["id"] == user_id


def test_profile_update_rejects_duplicate_email(client):
    create_test_user(
        employee_id="AUTH-PROFILE-OWNER-001",
        email="already-used@example.com",
    )

    user_id = create_test_user(
        employee_id="AUTH-PROFILE-OWNER-002",
        email="another-user@example.com",
    )

    token = create_access_token({"sub": str(user_id)})

    response = client.put(
        "/auth/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Another Test User",
            "email": "already-used@example.com",
        },
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Email already exists."


def test_profile_update_requires_authentication(client):
    response = client.put(
        "/auth/profile",
        json={
            "full_name": "Unauthenticated User",
            "email": "unauthenticated@example.com",
        },
    )

    assert response.status_code == 401
