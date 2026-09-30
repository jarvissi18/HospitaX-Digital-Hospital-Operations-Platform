from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth.dependencies import get_current_user
from app.database import get_db


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/lab",
    tags=["Laboratory"],
)


# ============================================================
# ROLE DEFINITIONS
# ============================================================

LAB_DOCTOR_ROLES = {
    "Doctor",
}

LAB_SAMPLE_COLLECTION_ROLES = {
    "Doctor",
    "Nurse",
    "Administrator",
}

LAB_OPERATIONAL_ROLES = {
    "Doctor",
    "Administrator",
}

LAB_CATALOG_ROLES = {
    "Administrator",
}


# ============================================================
# COMMON AUTH HELPERS
# ============================================================

def active_user_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Ensure authenticated user is active.
    """

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot access Laboratory services.",
        )

    return current_user


def doctor_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Laboratory clinical ordering and doctor review
    are restricted to Doctors.
    """

    if current_user.role not in LAB_DOCTOR_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required.",
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive Doctors cannot access Laboratory services.",
        )

    return current_user


def sample_collection_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Sample collection is currently available to
    Doctor, Nurse and Administrator users.

    A dedicated Lab Technician role can be introduced
    later without changing the Lab data architecture.
    """

    if current_user.role not in LAB_SAMPLE_COLLECTION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Sample collection is available only to "
                "Doctor, Nurse and Administrator users."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot collect lab samples.",
        )

    return current_user


def lab_operational_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Current laboratory operational access.

    Future:
        Lab Technician can be added here once the
        User role system officially supports that role.
    """

    if current_user.role not in LAB_OPERATIONAL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Laboratory operational access is available "
                "only to Doctor and Administrator users."
            ),
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot perform laboratory operations.",
        )

    return current_user


def administrator_required(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    """
    Laboratory catalog/configuration management.
    """

    if current_user.role != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )

    if current_user.is_active != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Inactive Administrators cannot manage "
                "Laboratory configuration."
            ),
        )

    return current_user


# ============================================================
# LAB TEST CATALOG
# ============================================================

@router.get(
    "/tests",
    response_model=List[
        schemas.LabTestResponse
    ],
)
def get_lab_tests(
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    return crud.get_lab_tests(
        db,
        active_only=active_only,
    )


@router.get(
    "/tests/{test_id}",
    response_model=schemas.LabTestResponse,
)
def get_lab_test(
    test_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    test = crud.get_lab_test(
        db,
        test_id,
    )

    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory test not found.",
        )

    return test


@router.post(
    "/tests",
    response_model=schemas.LabTestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lab_test(
    test: schemas.LabTestCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        administrator_required
    ),
):
    result = crud.create_lab_test(
        db,
        test,
    )

    if result == "code_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A laboratory test with this code already exists.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory test already exists.",
        )

    return result


@router.put(
    "/tests/{test_id}",
    response_model=schemas.LabTestResponse,
)
def update_lab_test(
    test_id: int,
    test: schemas.LabTestUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        administrator_required
    ),
):
    result = crud.update_lab_test(
        db,
        test_id,
        test,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory test not found.",
        )

    if result == "code_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A laboratory test with this code already exists.",
        )

    if result == "code_required":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Laboratory test code is required.",
        )

    if result == "invalid_reference_range":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid laboratory reference range.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory test already exists.",
        )

    return result


# ============================================================
# LAB ORDERS
# ============================================================

@router.post(
    "/orders",
    response_model=schemas.LabOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lab_order(
    order: schemas.LabOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        doctor_required
    ),
):
    """
    Create a laboratory order from a clinical encounter.

    The authenticated Doctor is automatically recorded
    as the ordering Doctor.
    """

    try:
        result = crud.create_lab_order(
            db=db,
            order=order,
            doctor_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate laboratory order.",
        )

    return result


# ------------------------------------------------------------
# Specific/static order routes MUST come before {order_id}
# ------------------------------------------------------------

@router.get(
    "/orders/patient/{patient_id}",
    response_model=List[
        schemas.LabOrderResponse
    ],
)
def get_patient_lab_orders(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        active_user_required
    ),
):
    try:
        orders = crud.get_lab_orders_for_patient(
            db,
            patient_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if current_user.role == "Doctor":
        orders = [
            order
            for order in orders
            if order.ordered_by_id == current_user.id
        ]

    return orders


@router.get(
    "/orders/encounter/{encounter_id}",
    response_model=List[
        schemas.LabOrderResponse
    ],
)
def get_encounter_lab_orders(
    encounter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        active_user_required
    ),
):
    try:
        orders = crud.get_lab_orders_for_encounter(
            db,
            encounter_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if current_user.role == "Doctor":
        orders = [
            order
            for order in orders
            if order.ordered_by_id == current_user.id
        ]

    return orders


@router.get(
    "/orders",
    response_model=List[
        schemas.LabOrderResponse
    ],
)
def get_lab_orders(
    patient_id: Optional[int] = None,
    encounter_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    order_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        active_user_required
    ),
):
    """
    Get laboratory orders.

    Doctors are automatically scoped to their own orders
    when doctor_id is not explicitly supplied.
    """

    if (
        current_user.role == "Doctor"
        and doctor_id is None
    ):
        doctor_id = current_user.id

    try:
        return crud.get_lab_orders(
            db=db,
            patient_id=patient_id,
            encounter_id=encounter_id,
            doctor_id=doctor_id,
            status=order_status,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "/orders/{order_id}",
    response_model=schemas.LabOrderResponse,
)
def get_lab_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        active_user_required
    ),
):
    order = crud.get_lab_order(
        db,
        order_id,
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    if (
        current_user.role == "Doctor"
        and order.ordered_by_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this laboratory order.",
        )

    return order


@router.put(
    "/orders/{order_id}",
    response_model=schemas.LabOrderResponse,
)
def update_lab_order(
    order_id: int,
    order: schemas.LabOrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        doctor_required
    ),
):
    existing = crud.get_lab_order(
        db,
        order_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    if existing.ordered_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can modify only your own laboratory orders.",
        )

    try:
        result = crud.update_lab_order(
            db=db,
            lab_order_id=order_id,
            order=order,
            updated_by_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result == "order_finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Finalized laboratory orders cannot be modified.",
        )

    if result == "order_cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cancelled laboratory orders cannot be modified.",
        )

    if result == "order_rejected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rejected laboratory orders cannot be modified.",
        )

    if result == "not_ordering_doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the ordering Doctor can modify this order.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory order update conflicts with existing data.",
        )

    return result


@router.post(
    "/orders/{order_id}/cancel",
    response_model=schemas.LabOrderResponse,
)
def cancel_lab_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        doctor_required
    ),
):
    existing = crud.get_lab_order(
        db,
        order_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    if existing.ordered_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can cancel only your own laboratory orders.",
        )

    try:
        result = crud.cancel_lab_order(
            db=db,
            lab_order_id=order_id,
            cancelled_by_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result == "order_finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Finalized laboratory orders cannot be cancelled.",
        )

    if result == "order_cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory order is already cancelled.",
        )

    if result == "not_ordering_doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the ordering Doctor can cancel this order.",
        )

    return result


# ============================================================
# LAB ORDER ITEMS
# ============================================================

@router.get(
    "/orders/{order_id}/items",
    response_model=List[
        schemas.LabOrderItemResponse
    ],
)
def get_lab_order_items(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    order = crud.get_lab_order(
        db,
        order_id,
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    return crud.get_lab_order_items(
        db,
        order_id,
    )


@router.get(
    "/order-items/{item_id}",
    response_model=schemas.LabOrderItemResponse,
)
def get_lab_order_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    item = crud.get_lab_order_item(
        db,
        item_id,
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order item not found.",
        )

    return item


# ============================================================
# LAB SAMPLES
# ============================================================

@router.post(
    "/orders/{order_id}/samples",
    response_model=schemas.LabSampleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lab_sample(
    order_id: int,
    sample: schemas.LabSampleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        sample_collection_required
    ),
):
    """
    Register a sample against a laboratory order.

    The order ID comes from the URL.
    """

    try:
        result = crud.create_lab_sample(
            db=db,
            lab_order_id=order_id,
            sample=sample,
            created_by_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    if result == "order_closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A sample cannot be registered for a closed laboratory order.",
        )

    if result == "specimen_type_required":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specimen type is required.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory sample already exists.",
        )

    return result


@router.get(
    "/orders/{order_id}/samples",
    response_model=List[
        schemas.LabSampleResponse
    ],
)
def get_lab_samples_for_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    order = crud.get_lab_order(
        db,
        order_id,
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    return crud.get_lab_samples_for_order(
        db,
        order_id,
    )


@router.get(
    "/samples/{sample_id}",
    response_model=schemas.LabSampleResponse,
)
def get_lab_sample(
    sample_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    sample = crud.get_lab_sample(
        db,
        sample_id,
    )

    if sample is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory sample not found.",
        )

    return sample


@router.post(
    "/samples/{sample_id}/collect",
    response_model=schemas.LabSampleResponse,
)
def collect_lab_sample(
    sample_id: int,
    collection: schemas.LabSampleCollection,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        sample_collection_required
    ),
):
    try:
        result = crud.collect_lab_sample(
            db=db,
            sample_id=sample_id,
            collected_by_id=current_user.id,
            data=collection,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory sample not found.",
        )

    if result == "sample_rejected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rejected laboratory samples cannot be collected.",
        )

    if result == "sample_processed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Processed laboratory samples cannot be collected.",
        )

    if result == "already_collected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory sample is already collected.",
        )

    if result == "invalid_transition":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory sample is not in a valid state for collection.",
        )

    return result


@router.post(
    "/samples/{sample_id}/receive",
    response_model=schemas.LabSampleResponse,
)
def receive_lab_sample(
    sample_id: int,
    receive_data: schemas.LabSampleReceive,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        lab_operational_required
    ),
):
    try:
        result = crud.receive_lab_sample(
            db=db,
            sample_id=sample_id,
            received_by_id=current_user.id,
            data=receive_data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory sample not found.",
        )

    if result == "sample_rejected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rejected laboratory samples cannot be received.",
        )

    if result == "sample_processed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Processed laboratory samples cannot be received.",
        )

    if result == "invalid_transition":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only collected samples can be received.",
        )

    return result


@router.post(
    "/samples/{sample_id}/process",
    response_model=schemas.LabSampleResponse,
)
def process_lab_sample(
    sample_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        lab_operational_required
    ),
):
    try:
        result = crud.process_lab_sample(
            db=db,
            sample_id=sample_id,
            processed_by_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory sample not found.",
        )

    if result == "sample_rejected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rejected laboratory samples cannot be processed.",
        )

    if result == "already_processed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory sample is already processed.",
        )

    if result == "invalid_transition":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only received samples can be processed.",
        )

    return result


@router.post(
    "/samples/{sample_id}/reject",
    response_model=schemas.LabSampleResponse,
)
def reject_lab_sample(
    sample_id: int,
    rejection: schemas.LabSampleReject,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        lab_operational_required
    ),
):
    try:
        result = crud.reject_lab_sample(
            db=db,
            sample_id=sample_id,
            rejected_by_id=current_user.id,
            data=rejection,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory sample not found.",
        )

    if result == "sample_rejected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory sample is already rejected.",
        )

    if result == "sample_processed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Processed laboratory samples cannot be rejected.",
        )

    return result


# ============================================================
# LAB RESULTS
# ============================================================

@router.get(
    "/results/patient/{patient_id}",
    response_model=List[
        schemas.LabResultResponse
    ],
)
def get_patient_lab_results(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    try:
        results = crud.get_patient_lab_results(
            db,
            patient_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if results is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    return results


@router.get(
    "/order-items/{item_id}/result",
    response_model=schemas.LabResultResponse,
)
def get_lab_result_for_order_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    result = crud.get_lab_result_for_order_item(
        db,
        item_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory result not found.",
        )

    return result


@router.get(
    "/results/{result_id}",
    response_model=schemas.LabResultResponse,
)
def get_lab_result(
    result_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        active_user_required
    ),
):
    result = crud.get_lab_result(
        db,
        result_id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory result not found.",
        )

    return result


@router.post(
    "/order-items/{item_id}/result",
    response_model=schemas.LabResultResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lab_result(
    item_id: int,
    result: schemas.LabResultCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        lab_operational_required
    ),
):
    """
    Enter a laboratory result for a specific order item.
    """

    try:
        created = crud.create_lab_result(
            db=db,
            order_item_id=item_id,
            result=result,
            entered_by_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if created is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order item not found.",
        )

    if created == "order_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    if created == "order_closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Results cannot be entered for a closed laboratory order.",
        )

    if created == "item_closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This laboratory order item is closed.",
        )

    if created == "result_exists":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A result already exists for this laboratory order item.",
        )

    if created == "test_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory test definition not found.",
        )

    if created == "numeric_value_required":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Numeric value is required for this laboratory test.",
        )

    if created == "text_value_required":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text value is required for this laboratory test.",
        )

    if created == "positive_negative_value_required":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Positive/Negative result is required.",
        )

    if created == "invalid_positive_negative_value":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Positive/Negative result must be Positive or Negative.",
        )

    if created == "invalid_reference_range":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid laboratory reference range.",
        )

    if created == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory result already exists.",
        )

    return created


@router.put(
    "/results/{result_id}",
    response_model=schemas.LabResultResponse,
)
def update_lab_result(
    result_id: int,
    result: schemas.LabResultUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        lab_operational_required
    ),
):
    try:
        updated = crud.update_lab_result(
            db=db,
            result_id=result_id,
            result=result,
            updated_by_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory result not found.",
        )

    if updated == "result_finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Finalized laboratory results cannot be modified.",
        )

    if updated == "result_locked":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Technically validated or reviewed results are locked.",
        )

    if updated == "order_item_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order item not found.",
        )

    if updated == "test_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory test definition not found.",
        )

    if updated == "numeric_value_required":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Numeric value is required for this laboratory test.",
        )

    if updated == "text_value_required":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text value is required for this laboratory test.",
        )

    if updated == "invalid_positive_negative_value":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Positive/Negative result must be Positive or Negative.",
        )

    if updated == "invalid_reference_range":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid laboratory reference range.",
        )

    return updated


@router.post(
    "/results/{result_id}/validate",
    response_model=schemas.LabResultResponse,
)
def validate_lab_result(
    result_id: int,
    validation: schemas.LabResultValidation,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        lab_operational_required
    ),
):
    try:
        result = crud.validate_lab_result(
            db=db,
            result_id=result_id,
            validated_by_id=current_user.id,
            data=validation,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory result not found.",
        )

    if result == "result_finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Finalized laboratory results cannot be validated again.",
        )

    if result == "already_validated":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory result is already technically validated.",
        )

    if result == "invalid_transition":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory result is not ready for technical validation.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory result validation could not be saved because of a duplicate record.",
        )

    return result


@router.post(
    "/results/{result_id}/review",
    response_model=schemas.LabResultResponse,
)
def review_lab_result(
    result_id: int,
    review: schemas.LabResultDoctorReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        doctor_required
    ),
):
    try:
        result = crud.review_lab_result(
            db=db,
            result_id=result_id,
            doctor_id=current_user.id,
            data=review,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory result not found.",
        )

    if result == "result_finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Finalized laboratory results cannot be reviewed.",
        )

    if result == "already_reviewed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory result is already under doctor review.",
        )

    if result == "invalid_transition":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only technically validated results can be reviewed.",
        )

    if result == "not_ordering_doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the ordering Doctor can review this result.",
        )

    if result == "order_item_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order item not found.",
        )

    if result == "order_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    if result == "encounter_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found.",
        )

    if result == "not_encounter_doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the doctor responsible for the encounter can review this result.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory result review could not be saved because of a duplicate record.",
        )

    return result


@router.post(
    "/results/{result_id}/finalize",
    response_model=schemas.LabResultResponse,
)
def finalize_lab_result(
    result_id: int,
    finalization: schemas.LabResultFinalize,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        doctor_required
    ),
):
    try:
        result = crud.finalize_lab_result(
            db=db,
            result_id=result_id,
            doctor_id=current_user.id,
            data=finalization,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory result not found.",
        )

    if result == "result_finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory result is already finalized.",
        )

    if result == "invalid_transition":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only doctor-reviewed results can be finalized.",
        )

    if result == "order_item_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order item not found.",
        )

    if result == "order_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory order not found.",
        )

    if result == "not_ordering_doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the ordering Doctor can finalize this result.",
        )

    if result == "duplicate":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Laboratory result finalization could not be saved because of a duplicate record.",
        )

    return result


# ============================================================
# PATIENT LAB HISTORY
# ============================================================

@router.get(
    "/history/patient/{patient_id}",
)
def get_patient_lab_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        active_user_required
    ),
):
    history = crud.get_patient_lab_history(
        db,
        patient_id,
    )

    if history is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    if current_user.role == "Doctor":
        history = [
            item
            for item in history
            if item.ordered_by_id == current_user.id
        ]

    return history