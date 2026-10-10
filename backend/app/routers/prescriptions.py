from typing import List
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
# =====================================================
# ROUTER
# =====================================================
router = APIRouter(
          prefix="/prescriptions",
          tags=["Prescriptions"],
)
# =====================================================
# AUTH HELPERS
# =====================================================
def active_user_required(
          current_user: models.User = Depends(
                    get_current_user
          ),
):
          if current_user.is_active != "true":
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail="Inactive users cannot access prescriptions.",
                    )
          return current_user
def doctor_required(
          current_user: models.User = Depends(
                    get_current_user
          ),
):
          if current_user.role != "Doctor":
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail="Doctor access required.",
                    )
          if current_user.is_active != "true":
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail="Inactive Doctors cannot access prescriptions.",
                    )
          return current_user
def ensure_patient_access(
          db: Session,
          current_user: models.User,
          patient_id: int,
) -> None:
          """
          Enforce patient-level access for prescription reads.
          Administrators retain their existing role-based access. Doctors and
          Nurses must have an active assignment for the requested patient.
          """
          if current_user.role == "Administrator":
                    return
          if current_user.role not in {"Doctor", "Nurse"}:
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail="You are not authorized to access this patient.",
                    )
          assignment_query = db.query(models.PatientAssignment).filter(
                    models.PatientAssignment.patient_id == patient_id,
                    models.PatientAssignment.status == "Active",
          )
          if current_user.role == "Doctor":
                    assignment_query = assignment_query.filter(
                              models.PatientAssignment.doctor_id == current_user.id
                    )
          else:
                    assignment_query = assignment_query.filter(
                              models.PatientAssignment.nurse_id == current_user.id
                    )
          if assignment_query.first() is None:
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail="You are not authorized to access this patient.",
                    )
def prescription_view_required(
          current_user: models.User = Depends(
                    get_current_user
          ),
):
          allowed_roles = {
                    "Administrator",
                    "Doctor",
                    "Nurse",
          }
          if current_user.role not in allowed_roles:
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "Prescription access is available only "
                                        "to Administrator, Doctor and Nurse users."
                              ),
                    )
          if current_user.is_active != "true":
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail="Inactive users cannot access prescriptions.",
                    )
          return current_user
# =====================================================
# CREATE PRESCRIPTION
# =====================================================
@router.post(
          "",
          response_model=schemas.PrescriptionResponse,
          status_code=status.HTTP_201_CREATED,
)
def create_prescription(
          prescription: schemas.PrescriptionCreate,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          try:
                    return crud.create_prescription(
                              db=db,
                              doctor_id=current_user.id,
                              prescription=prescription,
                    )
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
# =====================================================
# GET PRESCRIPTION
# =====================================================
@router.get(
          "/{prescription_id}",
          response_model=schemas.PrescriptionResponse,
)
def get_prescription(
          prescription_id: int,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    prescription_view_required
          ),
):
          prescription = crud.get_prescription(
                    db,
                    prescription_id,
          )
          if prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          ensure_patient_access(
                    db,
                    current_user,
                    prescription.patient_id,
          )
          return prescription
# =====================================================
# GET PATIENT PRESCRIPTION HISTORY
# =====================================================
@router.get(
          "/patient/{patient_id}",
          response_model=List[
                    schemas.PrescriptionResponse
          ],
)
def get_patient_prescriptions(
          patient_id: int,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    prescription_view_required
          ),
):
          ensure_patient_access(db, current_user, patient_id)
          return crud.get_prescriptions_for_patient(
                    db,
                    patient_id,
          )
# =====================================================
# GET ENCOUNTER PRESCRIPTIONS
# =====================================================
@router.get(
          "/encounter/{encounter_id}",
          response_model=List[
                    schemas.PrescriptionResponse
          ],
)
def get_encounter_prescriptions(
          encounter_id: int,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    prescription_view_required
          ),
):
          prescriptions = crud.get_prescriptions_for_encounter(
                    db,
                    encounter_id,
          )
          # Validate each returned record before sending any data to the caller.
          for prescription in prescriptions:
                    ensure_patient_access(
                              db,
                              current_user,
                              prescription.patient_id,
                    )
          return prescriptions
# =====================================================
# GET MY PRESCRIPTIONS
# =====================================================
@router.get(
          "/my",
          response_model=List[
                    schemas.PrescriptionResponse
          ],
)
def get_my_prescriptions(
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          return crud.get_prescriptions_for_doctor(
                    db,
                    current_user.id,
          )
# =====================================================
# UPDATE DRAFT PRESCRIPTION
# =====================================================
@router.put(
          "/{prescription_id}",
          response_model=schemas.PrescriptionResponse,
)
def update_prescription(
          prescription_id: int,
          prescription: schemas.PrescriptionUpdate,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          db_prescription = crud.get_prescription(
                    db,
                    prescription_id,
          )
          if db_prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          if (
                    db_prescription.prescribed_by_id
                    != current_user.id
          ):
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "You can only modify prescriptions "
                                        "created by you."
                              ),
                    )
          try:
                    result = crud.update_prescription(
                              db,
                              prescription_id,
                              prescription,
                    )
                    if result is None:
                              raise HTTPException(
                                        status_code=status.HTTP_404_NOT_FOUND,
                                        detail="Prescription not found.",
                              )
                    return result
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
# =====================================================
# ADD PRESCRIPTION ITEM
# =====================================================
@router.post(
          "/{prescription_id}/items",
          response_model=schemas.PrescriptionItemResponse,
          status_code=status.HTTP_201_CREATED,
)
def add_prescription_item(
          prescription_id: int,
          item: schemas.PrescriptionItemCreate,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          prescription = crud.get_prescription(
                    db,
                    prescription_id,
          )
          if prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          if (
                    prescription.prescribed_by_id
                    != current_user.id
          ):
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "You can only modify prescriptions "
                                        "created by you."
                              ),
                    )
          try:
                    result = crud.add_prescription_item(
                              db,
                              prescription_id,
                              item,
                    )
                    if result is None:
                              raise HTTPException(
                                        status_code=status.HTTP_404_NOT_FOUND,
                                        detail="Prescription not found.",
                              )
                    return result
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
# =====================================================
# UPDATE PRESCRIPTION ITEM
# =====================================================
@router.put(
          "/items/{item_id}",
          response_model=schemas.PrescriptionItemResponse,
)
def update_prescription_item(
          item_id: int,
          item: schemas.PrescriptionItemUpdate,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          db_item = crud.get_prescription_item(
                    db,
                    item_id,
          )
          if db_item is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription item not found.",
                    )
          prescription = crud.get_prescription(
                    db,
                    db_item.prescription_id,
          )
          if prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          if (
                    prescription.prescribed_by_id
                    != current_user.id
          ):
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "You can only modify prescriptions "
                                        "created by you."
                              ),
                    )
          try:
                    result = crud.update_prescription_item(
                              db,
                              item_id,
                              item,
                    )
                    if result is None:
                              raise HTTPException(
                                        status_code=status.HTTP_404_NOT_FOUND,
                                        detail="Prescription item not found.",
                              )
                    return result
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
# =====================================================
# DELETE PRESCRIPTION ITEM
# =====================================================
@router.delete(
          "/items/{item_id}",
)
def delete_prescription_item(
          item_id: int,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          db_item = crud.get_prescription_item(
                    db,
                    item_id,
          )
          if db_item is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription item not found.",
                    )
          prescription = crud.get_prescription(
                    db,
                    db_item.prescription_id,
          )
          if prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          if (
                    prescription.prescribed_by_id
                    != current_user.id
          ):
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "You can only modify prescriptions "
                                        "created by you."
                              ),
                    )
          try:
                    result = crud.delete_prescription_item(
                              db,
                              item_id,
                    )
                    if result is None:
                              raise HTTPException(
                                        status_code=status.HTTP_404_NOT_FOUND,
                                        detail="Prescription item not found.",
                              )
                    return {
                              "message": "Prescription item removed successfully."
                    }
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
# =====================================================
# ACTIVATE PRESCRIPTION
# =====================================================
@router.post(
          "/{prescription_id}/activate",
          response_model=schemas.PrescriptionResponse,
)
def activate_prescription(
          prescription_id: int,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          prescription = crud.get_prescription(
                    db,
                    prescription_id,
          )
          if prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          if (
                    prescription.prescribed_by_id
                    != current_user.id
          ):
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "You can only activate prescriptions "
                                        "created by you."
                              ),
                    )
          try:
                    return crud.activate_prescription(
                              db,
                              prescription_id,
                    )
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
# =====================================================
# COMPLETE PRESCRIPTION
# =====================================================
@router.post(
          "/{prescription_id}/complete",
          response_model=schemas.PrescriptionResponse,
)
def complete_prescription(
          prescription_id: int,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          prescription = crud.get_prescription(
                    db,
                    prescription_id,
          )
          if prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          if (
                    prescription.prescribed_by_id
                    != current_user.id
          ):
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "You can only complete prescriptions "
                                        "created by you."
                              ),
                    )
          try:
                    return crud.complete_prescription(
                              db,
                              prescription_id,
                    )
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
# =====================================================
# DISCONTINUE PRESCRIPTION
# =====================================================
@router.post(
          "/{prescription_id}/discontinue",
          response_model=schemas.PrescriptionResponse,
)
def discontinue_prescription(
          prescription_id: int,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          prescription = crud.get_prescription(
                    db,
                    prescription_id,
          )
          if prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          if (
                    prescription.prescribed_by_id
                    != current_user.id
          ):
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "You can only discontinue prescriptions "
                                        "created by you."
                              ),
                    )
          try:
                    return crud.discontinue_prescription(
                              db,
                              prescription_id,
                    )
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
# =====================================================
# CANCEL PRESCRIPTION
# =====================================================
@router.post(
          "/{prescription_id}/cancel",
          response_model=schemas.PrescriptionResponse,
)
def cancel_prescription(
          prescription_id: int,
          db: Session = Depends(get_db),
          current_user: models.User = Depends(
                    doctor_required
          ),
):
          prescription = crud.get_prescription(
                    db,
                    prescription_id,
          )
          if prescription is None:
                    raise HTTPException(
                              status_code=status.HTTP_404_NOT_FOUND,
                              detail="Prescription not found.",
                    )
          if (
                    prescription.prescribed_by_id
                    != current_user.id
          ):
                    raise HTTPException(
                              status_code=status.HTTP_403_FORBIDDEN,
                              detail=(
                                        "You can only cancel prescriptions "
                                        "created by you."
                              ),
                    )
          try:
                    return crud.cancel_prescription(
                              db,
                              prescription_id,
                    )
          except ValueError as exc:
                    raise HTTPException(
                              status_code=status.HTTP_400_BAD_REQUEST,
                              detail=str(exc),
                    )
