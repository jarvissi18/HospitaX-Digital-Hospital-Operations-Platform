
import os

# Set these before importing the application.
os.environ["DATABASE_URL"] = "sqlite:///./hospitax_test.db"
os.environ["SECRET_KEY"] = "test-only-secret-key-do-not-use-in-production"
os.environ.setdefault("JWT_ALGORITHM", "HS256")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, SessionLocal, engine, get_db


def override_get_db():
    """Use the dedicated test database for API requests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    """Provide a clean test database for each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
