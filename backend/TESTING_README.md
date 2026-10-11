# HospitaX Backend Testing Guide

## Safety and Test Isolation

- Tests use a dedicated SQLite database: `sqlite:///./hospitax_test.db`.
- The test configuration sets a test-only JWT secret before importing the application.
- Do not use production credentials or real patient data in automated tests.
- Run commands from the `backend` directory with the project virtual environment activated.
- These tests validate the covered scenarios only; they do not certify every API endpoint or production workflow.

## Install Test Dependency

Activate the project virtual environment and install pytest if needed:

```bash
python -m pip install pytest
```

## Run the Full Test Suite

```bash
python -m pytest -q
```

Run tests with verbose output:

```bash
python -m pytest -v
```

## Run Targeted Tests

```bash
python -m pytest tests/test_auth.py -q
python -m pytest tests/test_patients.py -q
python -m pytest tests/test_clinical_encounters.py -q
python -m pytest tests/test_ai_permissions.py -q
python -m pytest tests/test_ai_planner_errors.py -q
python -m pytest tests/test_ai_work_task_scope.py -q
python -m pytest tests/test_system_smoke.py -q
```

## Current Verified Result

The full suite completed successfully with **53 passed, 0 failed** in the latest recorded run.

Targeted test runs also passed for:
- Patient APIs
- Clinical encounters
- AI permission checks
- AI work-task scope
- AI planner error handling

Re-run the suite after any code changes. The result recorded here is from a previous run and is not a substitute for testing the latest changes.

## Static Route Inventory

Generate a source-based route inventory:

```bash
python audit_routes.py
```

The script writes `route_inventory.csv` and reports the number of route decorators found.

This is a static inventory, not runtime endpoint verification. It does not prove that every route works or that its authorization behavior is correct.

## Test Warnings

The latest run reported:
- A Starlette test-client dependency deprecation warning concerning `httpx`.
- Pydantic deprecation warnings for class-based `Config` in `app/schemas.py`.

These warnings did not fail the test suite. Review dependency compatibility and migrate affected Pydantic schemas when appropriate.
