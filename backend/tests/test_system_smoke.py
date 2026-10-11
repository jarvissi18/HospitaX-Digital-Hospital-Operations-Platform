def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "HospitaX Backend" in response.json()["message"]


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_openapi_is_available(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert spec["info"]["title"].startswith("HospitaX")
    assert "/health" in spec["paths"]

def test_uses_sqlite_test_database(client):
    from app.database import engine

    assert engine.url.drivername == "sqlite"
    assert "hospitax_test.db" in str(engine.url)