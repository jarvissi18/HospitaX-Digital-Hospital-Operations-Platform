from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy.exc import IntegrityError

from app import models, schemas

from app.auth.security import (
    hash_password,
    verify_password,
    hash_pin,
    verify_pin,
)


# =====================================================
# PATIENT CRUD
# =====================================================


def create_patient(
    db: Session,
    patient: schemas.PatientCreate,
):
    db_patient = models.Patient(
        **patient.model_dump()
    )

    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    return db_patient


def get_patients(
    db: Session,
    current_user: Optional[models.User] = None,
):
    """
    Return patients according to the authenticated user's role.

    Administrator / Receptionist:
        Return all registered patients.

    Doctor:
        Return patients with an ACTIVE assignment to this doctor.

    Nurse:
        Return patients with an ACTIVE assignment to this nurse.

    Any other role:
        Return no patients.

    The optional current_user keeps this CRUD helper backward-compatible
    while the authenticated patient router is migrated to pass the
    current user explicitly.
    """

    if current_user is None:
        # Preserve the existing internal/helper behavior until every
        # caller has been migrated to authenticated access.
        return (
            db.query(models.Patient)
            .order_by(models.Patient.id.desc())
            .all()
        )

    if current_user.role in {
        "Administrator",
        "Receptionist",
    }:
        return (
            db.query(models.Patient)
            .order_by(models.Patient.id.desc())
            .all()
        )

    if current_user.role == "Doctor":
        return (
            db.query(models.Patient)
            .join(
                models.PatientAssignment,
                models.PatientAssignment.patient_id
                == models.Patient.id,
            )
            .filter(
                models.PatientAssignment.doctor_id
                == current_user.id,
                models.PatientAssignment.status
                == "Active",
            )
            .distinct()
            .order_by(models.Patient.id.desc())
            .all()
        )

    if current_user.role == "Nurse":
        return (
            db.query(models.Patient)
            .join(
                models.PatientAssignment,
                models.PatientAssignment.patient_id
                == models.Patient.id,
            )
            .filter(
                models.PatientAssignment.nurse_id
                == current_user.id,
                models.PatientAssignment.status
                == "Active",
            )
            .distinct()
            .order_by(models.Patient.id.desc())
            .all()
        )

    return []


def get_patient(
    db: Session,
    patient_id: int,
):
    return (
        db.query(models.Patient)
        .filter(
            models.Patient.id == patient_id
        )
        .first()
    )


def update_patient(
    db: Session,
    patient_id: int,
    patient: schemas.PatientUpdate,
):
    db_patient = get_patient(
        db,
        patient_id,
    )

    if not db_patient:
        return None

    for key, value in patient.model_dump().items():
        setattr(
            db_patient,
            key,
            value,
        )

    db.commit()
    db.refresh(db_patient)

    return db_patient


def delete_patient(
    db: Session,
    patient_id: int,
):
    db_patient = get_patient(
        db,
        patient_id,
    )

    if not db_patient:
        return None

    db.delete(db_patient)
    db.commit()

    return db_patient

# =====================================================
# PATIENT ASSIGNMENT CRUD
# =====================================================


PATIENT_ASSIGNMENT_STAFF_ROLES = {
    "Doctor",
    "Nurse",
}


# -----------------------------------------------------
# GET PATIENT ASSIGNMENT
# -----------------------------------------------------


def get_patient_assignment(
    db: Session,
    assignment_id: int,
):
    return (
        db.query(
            models.PatientAssignment
        )
        .filter(
            models.PatientAssignment.id
            == assignment_id
        )
        .first()
    )


# -----------------------------------------------------
# GET PATIENT ASSIGNMENTS
# -----------------------------------------------------


def get_patient_assignments(
    db: Session,
    patient_id: int,
):
    return (
        db.query(
            models.PatientAssignment
        )
        .filter(
            models.PatientAssignment.patient_id
            == patient_id
        )
        .order_by(
            models.PatientAssignment.id.desc()
        )
        .all()
    )


# -----------------------------------------------------
# GET ACTIVE PATIENT ASSIGNMENT
# -----------------------------------------------------


def get_active_patient_assignment(
    db: Session,
    patient_id: int,
):
    return (
        db.query(
            models.PatientAssignment
        )
        .filter(
            models.PatientAssignment.patient_id
            == patient_id,
            models.PatientAssignment.status
            == "Active",
        )
        .order_by(
            models.PatientAssignment.id.desc()
        )
        .first()
    )


# -----------------------------------------------------
# VALIDATE DOCTOR
# -----------------------------------------------------


def _validate_doctor_for_patient_assignment(
    db: Session,
    doctor_id: int,
):
    doctor = get_user_by_id(
        db,
        doctor_id,
    )

    if not doctor:
        return "doctor_not_found"

    if doctor.role != "Doctor":
        return "invalid_doctor_role"

    if doctor.is_active != "true":
        return "doctor_inactive"

    today = datetime.now(
        timezone.utc
    )

    available = is_staff_available_for_assignment(
        db,
        doctor_id,
        today,
    )

    if available == "invalid_staff_role":
        return "invalid_doctor_role"

    if not available:
        return "doctor_not_available"

    return doctor


# -----------------------------------------------------
# VALIDATE NURSE
# -----------------------------------------------------


def _validate_nurse_for_patient_assignment(
    db: Session,
    nurse_id: int,
):
    nurse = get_user_by_id(
        db,
        nurse_id,
    )

    if not nurse:
        return "nurse_not_found"

    if nurse.role != "Nurse":
        return "invalid_nurse_role"

    if nurse.is_active != "true":
        return "nurse_inactive"

    today = datetime.now(
        timezone.utc
    )

    available = is_staff_available_for_assignment(
        db,
        nurse_id,
        today,
    )

    if available == "invalid_staff_role":
        return "invalid_nurse_role"

    if not available:
        return "nurse_not_available"

    return nurse


# -----------------------------------------------------
# VALIDATE DEPARTMENT
# -----------------------------------------------------


def _validate_department_for_patient_assignment(
    db: Session,
    department_id: int,
):
    department = get_department(
        db,
        department_id,
    )

    if not department:
        return "department_not_found"

    if not department.is_active:
        return "department_inactive"

    return department


# -----------------------------------------------------
# VALIDATE WARD
# -----------------------------------------------------


def _validate_ward_for_patient_assignment(
    db: Session,
    ward_id: int,
):
    ward = get_ward(
        db,
        ward_id,
    )

    if not ward:
        return "ward_not_found"

    if not ward.is_active:
        return "ward_inactive"

    return ward


# -----------------------------------------------------
# VALIDATE BED
# -----------------------------------------------------


def _validate_bed_for_patient_assignment(
    db: Session,
    bed_id: int,
    ward_id: Optional[int] = None,
):
    bed = get_bed(
        db,
        bed_id,
    )

    if not bed:
        return "bed_not_found"

    if not bed.is_active:
        return "bed_inactive"

    if ward_id is not None:

        room = get_room(
            db,
            bed.room_id,
        )

        if not room:
            return "bed_room_not_found"

        if room.ward_id != ward_id:
            return "bed_not_in_selected_ward"

    if bed.status != "Available":
        return "bed_not_available"

    existing_assignment = (
        db.query(
            models.PatientAssignment
        )
        .filter(
            models.PatientAssignment.bed_id
            == bed_id,
            models.PatientAssignment.status
            == "Active",
        )
        .first()
    )

    if existing_assignment:
        return "bed_already_assigned"

    return bed


# -----------------------------------------------------
# VALIDATE PATIENT ASSIGNMENT TARGETS
# -----------------------------------------------------


def _validate_patient_assignment_targets(
    db: Session,
    assignment: schemas.PatientAssignmentCreate,
):
    patient = get_patient(
        db,
        assignment.patient_id,
    )

    if not patient:
        return "patient_not_found"

    department = None
    doctor = None
    nurse = None
    ward = None
    bed = None

    # -------------------------------------------------
    # DEPARTMENT
    # -------------------------------------------------

    if assignment.department_id is not None:

        department = (
            _validate_department_for_patient_assignment(
                db,
                assignment.department_id,
            )
        )

        if isinstance(department, str):
            return department

    # -------------------------------------------------
    # DOCTOR
    # -------------------------------------------------

    if assignment.doctor_id is not None:

        doctor = (
            _validate_doctor_for_patient_assignment(
                db,
                assignment.doctor_id,
            )
        )

        if isinstance(doctor, str):
            return doctor

    # -------------------------------------------------
    # NURSE
    # -------------------------------------------------

    if assignment.nurse_id is not None:

        nurse = (
            _validate_nurse_for_patient_assignment(
                db,
                assignment.nurse_id,
            )
        )

        if isinstance(nurse, str):
            return nurse

    # -------------------------------------------------
    # WARD
    # -------------------------------------------------

    if assignment.ward_id is not None:

        ward = (
            _validate_ward_for_patient_assignment(
                db,
                assignment.ward_id,
            )
        )

        if isinstance(ward, str):
            return ward

    # -------------------------------------------------
    # BED
    # -------------------------------------------------

    if assignment.bed_id is not None:

        bed = (
            _validate_bed_for_patient_assignment(
                db,
                assignment.bed_id,
                assignment.ward_id,
            )
        )

        if isinstance(bed, str):
            return bed

    # -------------------------------------------------
    # BED REQUIRES WARD
    # -------------------------------------------------

    if (
        assignment.bed_id is not None
        and assignment.ward_id is None
    ):
        return "ward_required_for_bed"

    return {
        "patient": patient,
        "department": department,
        "doctor": doctor,
        "nurse": nurse,
        "ward": ward,
        "bed": bed,
    }


# -----------------------------------------------------
# CREATE PATIENT ASSIGNMENT
# -----------------------------------------------------


def create_patient_assignment(
    db: Session,
    assignment: schemas.PatientAssignmentCreate,
    assigned_by: Optional[int] = None,
):
    """
    Create a new operational patient assignment.

    Assignment types are independent operational relationships.
    Creating a Doctor Assignment must not automatically release a
    Nurse, Ward, Bed, or other assignment type.

    A new assignment only supersedes an existing active assignment
    of the same assignment_type.
    """

    validation = _validate_patient_assignment_targets(
        db,
        assignment,
    )

    if isinstance(validation, str):
        return validation

    # -------------------------------------------------
    # RELEASE EXISTING ACTIVE ASSIGNMENT OF SAME TYPE
    # -------------------------------------------------

    current_assignment = (
        db.query(models.PatientAssignment)
        .filter(
            models.PatientAssignment.patient_id
            == assignment.patient_id,
            models.PatientAssignment.assignment_type
            == assignment.assignment_type,
            models.PatientAssignment.status == "Active",
        )
        .order_by(
            models.PatientAssignment.assigned_at.desc(),
            models.PatientAssignment.id.desc(),
        )
        .first()
    )

    if current_assignment:
        current_assignment.status = "Transferred"
        current_assignment.released_at = datetime.now(
            timezone.utc
        )

        # A bed belongs to the assignment being replaced.
        # Release it only when the new assignment is not using
        # the same bed.
        if (
            current_assignment.bed_id is not None
            and current_assignment.bed_id != assignment.bed_id
        ):
            old_bed = get_bed(
                db,
                current_assignment.bed_id,
            )
            if old_bed:
                old_bed.status = "Available"

    # -------------------------------------------------
    # CREATE ASSIGNMENT
    # -------------------------------------------------

    # The create schema contains a status field, but new assignments
    # must always start as Active. Exclude the incoming status here
    # so SQLAlchemy does not receive status twice.
    assignment_data = assignment.model_dump(
        exclude={"status"}
    )

    db_assignment = models.PatientAssignment(
        **assignment_data,
        assigned_by=assigned_by,
        assigned_at=datetime.now(timezone.utc),
        status="Active",
    )

    db.add(db_assignment)

    # -------------------------------------------------
    # OCCUPY SELECTED BED
    # -------------------------------------------------

    if assignment.bed_id is not None:
        bed = validation["bed"]
        if bed:
            bed.status = "Occupied"

    try:
        db.commit()
        db.refresh(db_assignment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_assignment


# -----------------------------------------------------
# UPDATE PATIENT ASSIGNMENT
# -----------------------------------------------------


def update_patient_assignment(
    db: Session,
    assignment_id: int,
    assignment: schemas.PatientAssignmentUpdate,
):
    db_assignment = get_patient_assignment(
        db,
        assignment_id,
    )

    if not db_assignment:
        return None

    if db_assignment.status != "Active":
        return "assignment_not_active"

    update_data = assignment.model_dump(
        exclude_unset=True
    )

    # -------------------------------------------------
    # TARGET VALUES
    # -------------------------------------------------

    target_department_id = update_data.get(
        "department_id",
        db_assignment.department_id,
    )
    target_doctor_id = update_data.get(
        "doctor_id",
        db_assignment.doctor_id,
    )
    target_nurse_id = update_data.get(
        "nurse_id",
        db_assignment.nurse_id,
    )
    target_ward_id = update_data.get(
        "ward_id",
        db_assignment.ward_id,
    )
    target_bed_id = update_data.get(
        "bed_id",
        db_assignment.bed_id,
    )
    target_assignment_type = update_data.get(
        "assignment_type",
        db_assignment.assignment_type,
    )

    # -------------------------------------------------
    # ASSIGNMENT TYPE
    # -------------------------------------------------

    if target_assignment_type != db_assignment.assignment_type:
        conflicting_assignment = (
            db.query(models.PatientAssignment)
            .filter(
                models.PatientAssignment.patient_id
                == db_assignment.patient_id,
                models.PatientAssignment.assignment_type
                == target_assignment_type,
                models.PatientAssignment.status == "Active",
                models.PatientAssignment.id != assignment_id,
            )
            .first()
        )

        if conflicting_assignment:
            return "duplicate"

    # -------------------------------------------------
    # DEPARTMENT
    # -------------------------------------------------

    if target_department_id is not None:
        result = _validate_department_for_patient_assignment(
            db,
            target_department_id,
        )
        if isinstance(result, str):
            return result

    # -------------------------------------------------
    # DOCTOR
    # -------------------------------------------------

    if target_doctor_id is not None:
        result = _validate_doctor_for_patient_assignment(
            db,
            target_doctor_id,
        )
        if isinstance(result, str):
            return result

    # -------------------------------------------------
    # NURSE
    # -------------------------------------------------

    if target_nurse_id is not None:
        result = _validate_nurse_for_patient_assignment(
            db,
            target_nurse_id,
        )
        if isinstance(result, str):
            return result

    # -------------------------------------------------
    # WARD
    # -------------------------------------------------

    if target_ward_id is not None:
        result = _validate_ward_for_patient_assignment(
            db,
            target_ward_id,
        )
        if isinstance(result, str):
            return result

    # -------------------------------------------------
    # BED
    # -------------------------------------------------

    old_bed_id = db_assignment.bed_id

    # A bed must always have a ward in the assignment.
    if target_bed_id is not None and target_ward_id is None:
        return "ward_required_for_bed"

    if target_bed_id is not None:
        # Validate whenever the ward/bed combination changes.
        # This also catches a bed that is no longer available.
        if (
            target_bed_id != old_bed_id
            or target_ward_id != db_assignment.ward_id
        ):
            result = _validate_bed_for_patient_assignment(
                db,
                target_bed_id,
                target_ward_id,
            )
            if isinstance(result, str):
                return result

    # -------------------------------------------------
    # RELEASE OLD BED
    # -------------------------------------------------

    if (
        old_bed_id is not None
        and old_bed_id != target_bed_id
    ):
        old_bed = get_bed(
            db,
            old_bed_id,
        )
        if old_bed:
            old_bed.status = "Available"

    # -------------------------------------------------
    # APPLY CHANGES
    # -------------------------------------------------

    for key, value in update_data.items():
        setattr(
            db_assignment,
            key,
            value,
        )

    # -------------------------------------------------
    # OCCUPY NEW BED
    # -------------------------------------------------

    if (
        target_bed_id is not None
        and target_bed_id != old_bed_id
    ):
        new_bed = get_bed(
            db,
            target_bed_id,
        )
        if new_bed:
            new_bed.status = "Occupied"

    try:
        db.commit()
        db.refresh(db_assignment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_assignment


# -----------------------------------------------------
# RELEASE PATIENT ASSIGNMENT
# -----------------------------------------------------


def release_patient_assignment(
    db: Session,
    assignment_id: int,
):
    db_assignment = get_patient_assignment(
        db,
        assignment_id,
    )

    if not db_assignment:
        return None

    if db_assignment.status != "Active":
        return "assignment_not_active"

    # -------------------------------------------------
    # RELEASE BED
    # -------------------------------------------------

    if db_assignment.bed_id is not None:
        bed = get_bed(
            db,
            db_assignment.bed_id,
        )
        if bed:
            bed.status = "Available"

    # -------------------------------------------------
    # RELEASE ASSIGNMENT
    # -------------------------------------------------

    db_assignment.status = "Released"
    db_assignment.released_at = datetime.now(
        timezone.utc
    )

    try:
        db.commit()
        db.refresh(db_assignment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_assignment


# =====================================================
# SETTINGS CRUD
# =====================================================


def get_settings(db: Session):
    settings = (
        db.query(models.Settings)
        .order_by(models.Settings.id.asc())
        .first()
    )

    if settings is None:
        settings = models.Settings()

        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


def update_settings(
    db: Session,
    settings_data: schemas.SettingsUpdate,
):
    settings = get_settings(db)

    update_data = settings_data.model_dump(
        exclude_unset=True
    )

    allowed_fields = {
        "hospital_name",
        "hospital_address",
        "hospital_phone",
        "hospital_email",
        "admin_name",
        "admin_email",
        "admin_phone",
        "admin_role",
    }

    for key, value in update_data.items():
        if key in allowed_fields:
            setattr(
                settings,
                key,
                value,
            )

    try:
        db.commit()
        db.refresh(settings)

    except IntegrityError:
        db.rollback()
        raise

    return settings


# =====================================================
# USER / STAFF CRUD
# =====================================================


def get_user_by_email(
    db: Session,
    email: str,
):
    if not email:
        return None

    return (
        db.query(models.User)
        .filter(
            models.User.email == email
        )
        .first()
    )


def get_user_by_id(
    db: Session,
    user_id: int,
):
    return (
        db.query(models.User)
        .filter(
            models.User.id == user_id
        )
        .first()
    )


def get_user_by_employee_id(
    db: Session,
    employee_id: str,
):
    if not employee_id:
        return None

    return (
        db.query(models.User)
        .filter(
            models.User.employee_id
            == employee_id
        )
        .first()
    )


def get_users(db: Session):
    return (
        db.query(models.User)
        .order_by(models.User.id.asc())
        .all()
    )


# =====================================================
# EMPLOYEE ID GENERATOR
# =====================================================


def _generate_employee_id(
    db: Session,
    role: str,
):
    prefixes = {
        "Doctor": "DOC",
        "Nurse": "NUR",
        "Receptionist": "REC",
        "Housekeeper": "HKP",
        "Administrator": "ADM",
    }

    prefix = prefixes.get(
        role,
        "EMP",
    )

    existing_ids = (
        db.query(models.User.employee_id)
        .filter(
            models.User.employee_id.like(
                f"{prefix}-%"
            )
        )
        .all()
    )

    highest_number = 0

    for row in existing_ids:
        employee_id = row[0]

        if not employee_id:
            continue

        try:
            number = int(
                employee_id.split("-")[-1]
            )

            highest_number = max(
                highest_number,
                number,
            )

        except (
            ValueError,
            IndexError,
        ):
            continue

    return (
        f"{prefix}-{highest_number + 1:04d}"
    )


# =====================================================
# CREATE USER
# =====================================================


def create_user(
    db: Session,
    user: schemas.UserCreate,
):
    """
    Create a hospital staff account.

    User is the single source of truth for:

        Administrator
        Doctor
        Nurse
        Receptionist
        Housekeeper

    Account rules:

        - Employee ID is optional from frontend.
          If omitted, it is generated automatically.
        - Email is optional.
        - Mobile number is optional.
        - Shift is optional.
        - PIN is mandatory.
        - Password is optional.
        - If password is supplied, it is securely hashed.
        - If password is omitted, an unusable random password
          hash is generated so the existing database column
          remains compatible.
        - PIN is always securely hashed.
    """

    # =================================================
    # NORMALIZE EMAIL
    # =================================================

    email = (
        str(user.email).strip().lower()
        if user.email
        else None
    )

    # =================================================
    # EMAIL DUPLICATE
    # =================================================

    if email:

        existing = get_user_by_email(
            db,
            email,
        )

        if existing:
            return "email_exists"

    # =================================================
    # EMPLOYEE ID
    # =================================================
    #
    # Employee ID is OPTIONAL from the frontend.
    #
    # If administrator enters one:
    #     validate uniqueness.
    #
    # If left blank:
    #     automatically generate one based on role.
    #
    # Examples:
    #
    #     DOC-0001
    #     NUR-0001
    #     REC-0001
    #     HKP-0001
    #

    requested_employee_id = (
        user.employee_id.strip()
        if user.employee_id
        else None
    )

    if requested_employee_id:

        existing_employee = (
            get_user_by_employee_id(
                db,
                requested_employee_id,
            )
        )

        if existing_employee:
            return "employee_id_exists"

    else:

        requested_employee_id = (
            _generate_employee_id(
                db,
                user.role,
            )
        )

    # =================================================
    # NORMALIZE MOBILE
    # =================================================
    #
    # Mobile is optional for ALL staff roles.
    #
    # If provided, validate it.
    #

    mobile = (
        user.mobile.strip()
        if user.mobile
        else None
    )

    if mobile:

        if (
            not mobile.isdigit()
            or len(mobile) != 10
        ):
            return "mobile_invalid"

    # =================================================
    # NORMALIZE SHIFT
    # =================================================

    shift = (
        user.shift.strip()
        if user.shift
        else None
    )

    # =================================================
    # PIN
    # =================================================
    #
    # PIN is mandatory according to UserCreate schema.
    #
    # Still validate defensively here because this function
    # is an important database boundary.
    #

    if not user.pin:

        return "pin_required"

    pin = user.pin.strip()

    if (
        not pin.isdigit()
        or len(pin) < 4
        or len(pin) > 6
    ):
        return "pin_invalid"

    # =================================================
    # PASSWORD
    # =================================================
    #
    # Password is OPTIONAL.
    #
    # If supplied:
    #     hash it normally.
    #
    # If not supplied:
    #     create a random unusable password hash.
    #
    # This keeps compatibility with the existing
    # password_hash database column which is currently
    # non-nullable.
    #

    if user.password:

        password_hash = hash_password(
            user.password
        )

    else:

        import secrets

        unusable_password = (
            secrets.token_urlsafe(48)
        )

        password_hash = hash_password(
            unusable_password
        )

    # =================================================
    # PIN HASH
    # =================================================

    pin_hash = hash_pin(pin)

    # =================================================
    # CREATE USER
    # =================================================

    db_user = models.User(

        # ---------------------------------------------
        # IDENTITY
        # ---------------------------------------------

        employee_id=requested_employee_id,

        full_name=user.full_name.strip(),

        email=email,

        mobile=mobile,

        # ---------------------------------------------
        # AUTHENTICATION
        # ---------------------------------------------

        password_hash=password_hash,

        pin_hash=pin_hash,

        # ---------------------------------------------
        # ROLE
        # ---------------------------------------------

        role=user.role,

        shift=shift,

        # ---------------------------------------------
        # STATUS
        # ---------------------------------------------

        is_active="true",
    )

    db.add(db_user)

    # =================================================
    # DATABASE COMMIT
    # =================================================

    try:

        db.commit()

        db.refresh(
            db_user
        )

    except IntegrityError:

        db.rollback()

        return None

    # =================================================
    # RETURN
    # =================================================

    return db_user

# =====================================================
# AUTHENTICATION
# =====================================================

def authenticate_user(
    db: Session,
    identifier: str,
    password: Optional[str] = None,
    pin: Optional[str] = None,
):
    if not identifier:
        return None

    identifier = identifier.strip()

    # -------------------------------------------------
    # FIND USER BY EMPLOYEE ID OR EMAIL
    # -------------------------------------------------

    user = get_user_by_employee_id(
        db,
        identifier,
    )

    if not user:
        user = get_user_by_email(
            db,
            identifier.lower(),
        )

    if not user:
        return None

    # -------------------------------------------------
    # PREVENT INACTIVE USERS FROM AUTHENTICATING
    # -------------------------------------------------

    if user.is_active != "true":
        return None

    # -------------------------------------------------
    # VERIFY PASSWORD OR PIN
    # -------------------------------------------------

    if password:
        if not verify_password(
            password,
            user.password_hash,
        ):
            return None

    elif pin:
        if not user.pin_hash:
            return None

        if not verify_pin(
            pin,
            user.pin_hash,
        ):
            return None

    else:
        return None

    return user

# =====================================================
# DELETE USER
# =====================================================


def delete_user(
    db: Session,
    user_id: int,
):
    """
    Delete a staff account.

    Because User is the source of truth,
    deleting a Housekeeper also removes
    their room assignments through cascade.
    """

    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return None

    # Never allow the last/admin account
    # to be deleted through this operation.
    if user.role == "Administrator":
        return "admin"

    try:
        db.delete(user)
        db.commit()

    except IntegrityError:
        db.rollback()
        return "has_dependencies"

    return user


# =====================================================
# UPDATE USER
# =====================================================


def update_user(
    db: Session,
    user_id: int,
    user_data: schemas.UserUpdate,
):
    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return None

    update_data = user_data.model_dump(
        exclude_unset=True
    )

    # -------------------------------------------------
    # EMAIL
    # -------------------------------------------------

    if "email" in update_data:

        clean_email = (
            str(update_data["email"])
            .strip()
            .lower()
            if update_data["email"]
            else None
        )

        if clean_email:

            existing = (
                db.query(models.User)
                .filter(
                    models.User.email
                    == clean_email,
                    models.User.id
                    != user_id,
                )
                .first()
            )

            if existing:
                return "email_exists"

        update_data["email"] = clean_email

    # -------------------------------------------------
    # CLEAN TEXT
    # -------------------------------------------------

    if "full_name" in update_data:
        update_data["full_name"] = (
            update_data["full_name"].strip()
        )

    if (
        "mobile" in update_data
        and update_data["mobile"]
    ):
        update_data["mobile"] = (
            update_data["mobile"].strip()
        )

    if (
        "shift" in update_data
        and update_data["shift"]
    ):
        update_data["shift"] = (
            update_data["shift"].strip()
        )

    # -------------------------------------------------
    # APPLY
    # -------------------------------------------------

    for key, value in update_data.items():
        setattr(
            user,
            key,
            value,
        )

    try:
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()
        return "email_exists"

    return user


# =====================================================
# UPDATE USER STATUS
# =====================================================


def update_user_status(
    db: Session,
    user_id: int,
    is_active: str,
):
    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return None

    if (
        user.role == "Administrator"
        and is_active != "true"
    ):
        return "admin"

    user.is_active = is_active

    db.commit()
    db.refresh(user)

    return user


# =====================================================
# PROFILE
# =====================================================


def update_profile(
    db: Session,
    user_id: int,
    profile_data: schemas.ProfileUpdate,
):
    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return None

    clean_email = (
        str(profile_data.email)
        .strip()
        .lower()
        if profile_data.email
        else None
    )

    existing = (
        db.query(models.User)
        .filter(
            models.User.email
            == clean_email,
            models.User.id
            != user_id,
        )
        .first()
        if clean_email
        else None
    )

    if existing:
        return "email_exists"

    user.full_name = (
        profile_data.full_name.strip()
    )

    user.email = clean_email

    try:
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()
        return "email_exists"

    return user


def get_profile(
    db: Session,
    user_id: int,
):
    return get_user_by_id(
        db,
        user_id,
    )


# =====================================================
# CHANGE PASSWORD
# =====================================================


def change_password(
    db: Session,
    user_id: int,
    password_data: schemas.ChangePasswordRequest,
):
    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return None

    if not verify_password(
        password_data.current_password,
        user.password_hash,
    ):
        return "wrong_password"

    if (
        password_data.new_password
        != password_data.confirm_password
    ):
        return "password_mismatch"

    user.password_hash = hash_password(
        password_data.new_password
    )

    db.commit()
    db.refresh(user)

    return user


# =====================================================
# STAFF ATTENDANCE CRUD
# =====================================================


def _start_of_day(
    value: datetime,
) -> datetime:
    return value.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


def _end_of_day(
    value: datetime,
) -> datetime:
    return value.replace(
        hour=23,
        minute=59,
        second=59,
        microsecond=999999,
    )


def _calculate_duration(
    check_in: Optional[datetime],
    check_out: Optional[datetime],
):
    if not check_in or not check_out:
        return None

    seconds = (
        check_out - check_in
    ).total_seconds()

    if seconds < 0:
        return None

    return int(
        seconds // 60
    )


def get_attendance_by_id(
    db: Session,
    attendance_id: int,
):
    return (
        db.query(models.Attendance)
        .filter(
            models.Attendance.id
            == attendance_id
        )
        .first()
    )


def get_attendance_for_user_date(
    db: Session,
    user_id: int,
    attendance_date: datetime,
):
    start = _start_of_day(
        attendance_date
    )

    end = _end_of_day(
        attendance_date
    )

    return (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_id
            == user_id,
            models.Attendance.attendance_date
            >= start,
            models.Attendance.attendance_date
            <= end,
        )
        .first()
    )


def get_attendance_for_date(
    db: Session,
    attendance_date: datetime,
):
    start = _start_of_day(
        attendance_date
    )

    end = _end_of_day(
        attendance_date
    )

    return (
        db.query(models.Attendance)
        .filter(
            models.Attendance.attendance_date
            >= start,
            models.Attendance.attendance_date
            <= end,
        )
        .join(
            models.User,
            models.User.id
            == models.Attendance.user_id,
        )
        .order_by(
            models.User.full_name.asc()
        )
        .all()
    )


def get_attendance_history(
    db: Session,
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    query = db.query(
        models.Attendance
    )

    if user_id is not None:
        query = query.filter(
            models.Attendance.user_id
            == user_id
        )

    if start_date is not None:
        query = query.filter(
            models.Attendance.attendance_date
            >= _start_of_day(start_date)
        )

    if end_date is not None:
        query = query.filter(
            models.Attendance.attendance_date
            <= _end_of_day(end_date)
        )

    return (
        query.order_by(
            models.Attendance.attendance_date.desc(),
            models.Attendance.id.desc(),
        )
        .all()
    )


def get_all_attendance(
    db: Session,
):
    return (
        db.query(models.Attendance)
        .join(
            models.User,
            models.User.id
            == models.Attendance.user_id,
        )
        .order_by(
            models.Attendance.attendance_date.desc(),
            models.User.full_name.asc(),
        )
        .all()
    )


# =====================================================
# CREATE ATTENDANCE
# =====================================================


def create_attendance(
    db: Session,
    attendance: schemas.AttendanceCreate,
):
    user = get_user_by_id(
        db,
        attendance.user_id,
    )

    if not user:
        return "user_not_found"

    if user.is_active != "true":
        return "user_inactive"

    if (
        attendance.status
        not in schemas.ATTENDANCE_STATUSES
    ):
        return "invalid_status"

    existing = get_attendance_for_user_date(
        db,
        attendance.user_id,
        attendance.attendance_date,
    )

    if existing:
        return "attendance_exists"

    if (
        attendance.check_in
        and attendance.check_out
        and attendance.check_out
        < attendance.check_in
    ):
        return "invalid_time_range"

    check_in = attendance.check_in
    check_out = attendance.check_out

    if attendance.status in {
        "Absent",
        "Leave",
    }:
        check_in = None
        check_out = None

    duration = _calculate_duration(
        check_in,
        check_out,
    )

    db_attendance = models.Attendance(
        user_id=attendance.user_id,
        attendance_date=attendance.attendance_date,
        shift=attendance.shift.strip(),
        check_in=check_in,
        check_out=check_out,
        status=attendance.status,
        work_duration_minutes=duration,
        notes=(
            attendance.notes.strip()
            if attendance.notes
            else None
        ),
    )

    db.add(db_attendance)

    try:
        db.commit()
        db.refresh(db_attendance)

    except IntegrityError:
        db.rollback()
        return "attendance_exists"

    return db_attendance


# =====================================================
# UPDATE ATTENDANCE
# =====================================================


def update_attendance(
    db: Session,
    attendance_id: int,
    attendance_data: schemas.AttendanceUpdate,
):
    attendance = get_attendance_by_id(
        db,
        attendance_id,
    )

    if not attendance:
        return None
    
        # -------------------------------------------------
    # VERIFY ATTENDANCE ELIGIBLE ROLE
    # -------------------------------------------------

    user = get_user_by_id(
        db,
        attendance.user_id,
    )

    if not user:
        return "user_not_found"

    attendance_roles = {
        "Doctor",
        "Nurse",
        "Receptionist",
        "Housekeeper",
    }

    if user.role not in attendance_roles:
        return "invalid_staff_role"

    update_data = attendance_data.model_dump(
        exclude_unset=True
    )

    new_status = update_data.get(
        "status",
        attendance.status,
    )

    if (
        new_status
        not in schemas.ATTENDANCE_STATUSES
    ):
        return "invalid_status"

    new_check_in = update_data.get(
        "check_in",
        attendance.check_in,
    )

    new_check_out = update_data.get(
        "check_out",
        attendance.check_out,
    )

    if (
        new_check_in
        and new_check_out
        and new_check_out < new_check_in
    ):
        return "invalid_time_range"

    if new_status in {
        "Absent",
        "Leave",
    }:
        new_check_in = None
        new_check_out = None

        update_data["check_in"] = None
        update_data["check_out"] = None

    for key, value in update_data.items():
        setattr(
            attendance,
            key,
            value,
        )

    attendance.work_duration_minutes = (
        _calculate_duration(
            new_check_in,
            new_check_out,
        )
    )

    try:
        db.commit()
        db.refresh(attendance)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return attendance


# =====================================================
# MARK ATTENDANCE
# =====================================================


def mark_attendance(
    db: Session,
    user_id: int,
    attendance_date: datetime,
    shift: str,
    status: str,
    notes: Optional[str] = None,
):
    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return "user_not_found"

    if user.is_active != "true":
        return "user_inactive"
    
    # -------------------------------------------------
    # VERIFY ATTENDANCE ELIGIBLE ROLE
    # -------------------------------------------------

    attendance_roles = {
        "Doctor",
        "Nurse",
        "Receptionist",
        "Housekeeper",
    }

    if user.role not in attendance_roles:
        return "invalid_staff_role"

    if (
        status
        not in schemas.ATTENDANCE_STATUSES
    ):
        return "invalid_status"

    existing = get_attendance_for_user_date(
        db,
        user_id,
        attendance_date,
    )

    if existing:

        existing.status = status
        existing.shift = shift.strip()
        existing.notes = (
            notes.strip()
            if notes
            else None
        )

        if status in {
            "Absent",
            "Leave",
        }:
            existing.check_in = None
            existing.check_out = None
            existing.work_duration_minutes = None

        try:
            db.commit()
            db.refresh(existing)

        except IntegrityError:
            db.rollback()
            return "duplicate"

        return existing

    attendance_data = schemas.AttendanceCreate(
        user_id=user_id,
        attendance_date=attendance_date,
        shift=shift,
        status=status,
        notes=notes,
    )

    return create_attendance(
        db,
        attendance_data,
    )


# =====================================================
# STAFF CHECK-IN
# =====================================================


def check_in_staff(
    db: Session,
    user_id: int,
    attendance_date: datetime,
    shift: str,
    notes: Optional[str] = None,
):
    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return "user_not_found"

    if user.is_active != "true":
        return "user_inactive"

    existing = get_attendance_for_user_date(
        db,
        user_id,
        attendance_date,
    )

    if existing:

        if existing.check_in:
            return "already_checked_in"

        if existing.status in {
            "Absent",
            "Leave",
        }:
            existing.status = "Present"

        existing.check_in = datetime.now(
            timezone.utc
        )

        existing.shift = shift.strip()

        if notes:
            existing.notes = notes.strip()

        try:
            db.commit()
            db.refresh(existing)

        except IntegrityError:
            db.rollback()
            return "duplicate"

        return existing

    db_attendance = models.Attendance(
        user_id=user_id,
        attendance_date=attendance_date,
        shift=shift.strip(),
        check_in=datetime.now(
            timezone.utc
        ),
        check_out=None,
        status="Present",
        work_duration_minutes=None,
        notes=(
            notes.strip()
            if notes
            else None
        ),
    )

    db.add(db_attendance)

    try:
        db.commit()
        db.refresh(db_attendance)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_attendance


# =====================================================
# STAFF CHECK-OUT
# =====================================================


def check_out_staff(
    db: Session,
    user_id: int,
    attendance_date: datetime,
    notes: Optional[str] = None,
):
    attendance = get_attendance_for_user_date(
        db,
        user_id,
        attendance_date,
    )

    if not attendance:
        return "attendance_not_found"
    
        # -------------------------------------------------
    # VERIFY ATTENDANCE ELIGIBLE ROLE
    # -------------------------------------------------

    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return "user_not_found"

    attendance_roles = {
        "Doctor",
        "Nurse",
        "Receptionist",
        "Housekeeper",
    }

    if user.role not in attendance_roles:
        return "invalid_staff_role"

    if not attendance.check_in:
        return "not_checked_in"

    if attendance.check_out:
        return "already_checked_out"

    check_out = datetime.now(
        timezone.utc
    )

    attendance.check_out = check_out

    attendance.work_duration_minutes = (
        _calculate_duration(
            attendance.check_in,
            check_out,
        )
    )

    if notes:
        attendance.notes = notes.strip()

    try:
        db.commit()
        db.refresh(attendance)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return attendance


# =====================================================
# DELETE ATTENDANCE
# =====================================================


def delete_attendance(
    db: Session,
    attendance_id: int,
):
    attendance = get_attendance_by_id(
        db,
        attendance_id,
    )

    if not attendance:
        return None

    db.delete(attendance)
    db.commit()

    return attendance


# =====================================================
# STAFF AVAILABILITY
# =====================================================


def is_staff_available_for_assignment(
    db: Session,
    user_id: int,
    attendance_date: datetime,
):
    """
    Staff can be assigned only when:

    1. User exists
    2. User is active
    3. Attendance is Present or Late
    """

    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return False

    if user.is_active != "true":
        return False
    
    # -------------------------------------------------
    # VERIFY ATTENDANCE ELIGIBLE ROLE
    # -------------------------------------------------

    attendance_roles = {
        "Doctor",
        "Nurse",
        "Receptionist",
        "Housekeeper",
    }

    if user.role not in attendance_roles:
        return "invalid_staff_role"

    attendance = get_attendance_for_user_date(
        db,
        user_id,
        attendance_date,
    )

    if not attendance:
        return False

    return attendance.status in {
        "Present",
        "Late",
    }


def get_staff_availability(
    db: Session,
    attendance_date: datetime,
):
    users = [
    user
    for user in get_users(db)
    if (
        user.role in {
            "Doctor",
            "Nurse",
            "Receptionist",
            "Housekeeper",
        }
        and user.is_active == "true"
    )
]

    results = []

    for user in users:

        attendance = (
            get_attendance_for_user_date(
                db,
                user.id,
                attendance_date,
            )
        )

        attendance_status = (
            attendance.status
            if attendance
            else None
        )

        available = (
            user.is_active == "true"
            and attendance_status
            in {
                "Present",
                "Late",
            }
        )

        results.append(
            {
                "user_id": user.id,
                "employee_id": user.employee_id,
                "full_name": user.full_name,
                "role": user.role,
                "shift": user.shift,
                "is_active": user.is_active,
                "attendance_status":
                    attendance_status,
                "check_in": (
                    attendance.check_in
                    if attendance
                    else None
                ),
                "check_out": (
                    attendance.check_out
                    if attendance
                    else None
                ),
                "available_for_assignment":
                    available,
            }
        )

    return results


def get_available_staff(
    db: Session,
    attendance_date: datetime,
    role: Optional[str] = None,
):
    users = (
    db.query(models.User)
    .filter(
        models.User.is_active == "true",
        models.User.role.in_([
            "Doctor",
            "Nurse",
            "Receptionist",
            "Housekeeper",
        ]),
    )
)

    if role:
        users = users.filter(
            models.User.role == role
        )

    users = (
        users
        .order_by(
            models.User.full_name.asc()
        )
        .all()
    )

    available_users = []

    for user in users:

        attendance = (
            get_attendance_for_user_date(
                db,
                user.id,
                attendance_date,
            )
        )

        if not attendance:
            continue

        if attendance.status not in {
            "Present",
            "Late",
        }:
            continue

        available_users.append(user)

    return available_users


# =====================================================
# ATTENDANCE SUMMARY
# =====================================================

def get_attendance_summary(
    db: Session,
    attendance_date: datetime,
):
    users = get_users(db)

    # Administrator is NOT part of staff attendance.
    attendance_roles = {
        "Doctor",
        "Nurse",
        "Receptionist",
        "Housekeeper",
    }

    staff_users = [
    user
    for user in users
    if (
        user.role in attendance_roles
        and user.is_active == "true"
    )
]

    total_staff = len(staff_users)

    present = 0
    late = 0
    absent = 0
    leave = 0

    for user in staff_users:

        attendance = (
            get_attendance_for_user_date(
                db,
                user.id,
                attendance_date,
            )
        )

        if not attendance:
            continue

        if attendance.status == "Present":
            present += 1

        elif attendance.status == "Late":
            late += 1

        elif attendance.status == "Absent":
            absent += 1

        elif attendance.status == "Leave":
            leave += 1

    # Only operational staff who are Present/Late
    # are eligible for operational assignment.
    available_for_assignment = present + late

    return {
        "date": attendance_date,
        "total_staff": total_staff,
        "present": present,
        "late": late,
        "absent": absent,
        "leave": leave,
        "available_for_assignment": available_for_assignment,
    }
    
    
# =====================================================
# HOSPITAL STRUCTURE CRUD
# =====================================================


# =====================================================
# DEPARTMENT
# =====================================================


def get_department(
    db: Session,
    department_id: int,
):
    return (
        db.query(models.Department)
        .filter(
            models.Department.id
            == department_id
        )
        .first()
    )


def get_departments(db: Session):
    return (
        db.query(models.Department)
        .order_by(
            models.Department.name.asc()
        )
        .all()
    )


def create_department(
    db: Session,
    department: schemas.DepartmentCreate,
):
    existing_name = (
        db.query(models.Department)
        .filter(
            models.Department.name
            == department.name
        )
        .first()
    )

    if existing_name:
        return "name_exists"

    existing_code = (
        db.query(models.Department)
        .filter(
            models.Department.code
            == department.code
        )
        .first()
    )

    if existing_code:
        return "code_exists"

    db_department = models.Department(
        **department.model_dump()
    )

    db.add(db_department)

    try:
        db.commit()
        db.refresh(db_department)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_department


def update_department(
    db: Session,
    department_id: int,
    department: schemas.DepartmentUpdate,
):
    db_department = get_department(
        db,
        department_id,
    )

    if not db_department:
        return None

    update_data = department.model_dump(
        exclude_unset=True
    )

    if "name" in update_data:

        existing_name = (
            db.query(models.Department)
            .filter(
                models.Department.name
                == update_data["name"],
                models.Department.id
                != department_id,
            )
            .first()
        )

        if existing_name:
            return "name_exists"

    if "code" in update_data:

        existing_code = (
            db.query(models.Department)
            .filter(
                models.Department.code
                == update_data["code"],
                models.Department.id
                != department_id,
            )
            .first()
        )

        if existing_code:
            return "code_exists"

    for key, value in update_data.items():
        setattr(
            db_department,
            key,
            value,
        )

    try:
        db.commit()
        db.refresh(db_department)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_department


def delete_department(
    db: Session,
    department_id: int,
):
    department = get_department(
        db,
        department_id,
    )

    if not department:
        return None

    if department.floors:
        return "has_dependencies"

    db.delete(department)
    db.commit()

    return department


# =====================================================
# FLOOR
# =====================================================


def get_floor(
    db: Session,
    floor_id: int,
):
    return (
        db.query(models.Floor)
        .filter(
            models.Floor.id == floor_id
        )
        .first()
    )


def get_floors(db: Session):
    return (
        db.query(models.Floor)
        .order_by(
            models.Floor.floor_number.asc(),
            models.Floor.name.asc(),
        )
        .all()
    )


def create_floor(
    db: Session,
    floor: schemas.FloorCreate,
):
    department = get_department(
        db,
        floor.department_id,
    )

    if not department:
        return "department_not_found"

    db_floor = models.Floor(
        **floor.model_dump()
    )

    db.add(db_floor)

    try:
        db.commit()
        db.refresh(db_floor)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_floor


def update_floor(
    db: Session,
    floor_id: int,
    floor: schemas.FloorUpdate,
):
    db_floor = get_floor(
        db,
        floor_id,
    )

    if not db_floor:
        return None

    update_data = floor.model_dump(
        exclude_unset=True
    )

    if "department_id" in update_data:

        department = get_department(
            db,
            update_data["department_id"],
        )

        if not department:
            return "department_not_found"

    for key, value in update_data.items():
        setattr(
            db_floor,
            key,
            value,
        )

    try:
        db.commit()
        db.refresh(db_floor)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_floor


def delete_floor(
    db: Session,
    floor_id: int,
):
    floor = get_floor(
        db,
        floor_id,
    )

    if not floor:
        return None

    if floor.wards:
        return "has_dependencies"

    db.delete(floor)
    db.commit()

    return floor


# =====================================================
# WARD
# =====================================================


def get_ward(
    db: Session,
    ward_id: int,
):
    return (
        db.query(models.Ward)
        .filter(
            models.Ward.id == ward_id
        )
        .first()
    )


def get_wards(db: Session):
    return (
        db.query(models.Ward)
        .order_by(
            models.Ward.name.asc()
        )
        .all()
    )


def create_ward(
    db: Session,
    ward: schemas.WardCreate,
):
    floor = get_floor(
        db,
        ward.floor_id,
    )

    if not floor:
        return "floor_not_found"

    db_ward = models.Ward(
        **ward.model_dump()
    )

    db.add(db_ward)

    try:
        db.commit()
        db.refresh(db_ward)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_ward


def update_ward(
    db: Session,
    ward_id: int,
    ward: schemas.WardUpdate,
):
    db_ward = get_ward(
        db,
        ward_id,
    )

    if not db_ward:
        return None

    update_data = ward.model_dump(
        exclude_unset=True
    )

    if "floor_id" in update_data:

        floor = get_floor(
            db,
            update_data["floor_id"],
        )

        if not floor:
            return "floor_not_found"

    for key, value in update_data.items():
        setattr(
            db_ward,
            key,
            value,
        )

    try:
        db.commit()
        db.refresh(db_ward)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_ward


def delete_ward(
    db: Session,
    ward_id: int,
):
    ward = get_ward(
        db,
        ward_id,
    )

    if not ward:
        return None

    if ward.rooms:
        return "has_dependencies"

    db.delete(ward)
    db.commit()

    return ward


# =====================================================
# ROOM
# =====================================================


def get_room(
    db: Session,
    room_id: int,
):
    return (
        db.query(models.Room)
        .filter(
            models.Room.id == room_id
        )
        .first()
    )


def get_rooms(db: Session):
    return (
        db.query(models.Room)
        .order_by(
            models.Room.room_number.asc()
        )
        .all()
    )


def create_room(
    db: Session,
    room: schemas.RoomCreate,
):
    ward = get_ward(
        db,
        room.ward_id,
    )

    if not ward:
        return "ward_not_found"

    existing_room = (
        db.query(models.Room)
        .filter(
            models.Room.room_number
            == room.room_number,
            models.Room.ward_id
            == room.ward_id,
        )
        .first()
    )

    if existing_room:
        return "room_exists"

    db_room = models.Room(
        **room.model_dump()
    )

    db.add(db_room)

    try:
        db.commit()
        db.refresh(db_room)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_room


def update_room(
    db: Session,
    room_id: int,
    room: schemas.RoomUpdate,
):
    db_room = get_room(
        db,
        room_id,
    )

    if not db_room:
        return None

    update_data = room.model_dump(
        exclude_unset=True
    )

    target_ward_id = update_data.get(
        "ward_id",
        db_room.ward_id,
    )

    ward = get_ward(
        db,
        target_ward_id,
    )

    if not ward:
        return "ward_not_found"

    target_room_number = update_data.get(
        "room_number",
        db_room.room_number,
    )

    existing_room = (
        db.query(models.Room)
        .filter(
            models.Room.room_number
            == target_room_number,
            models.Room.ward_id
            == target_ward_id,
            models.Room.id
            != room_id,
        )
        .first()
    )

    if existing_room:
        return "room_exists"

    for key, value in update_data.items():
        setattr(
            db_room,
            key,
            value,
        )

    try:
        db.commit()
        db.refresh(db_room)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_room


def delete_room(
    db: Session,
    room_id: int,
):
    room = get_room(
        db,
        room_id,
    )

    if not room:
        return None

    if room.beds:
        return "has_dependencies"

    db.delete(room)
    db.commit()

    return room


# =====================================================
# BED
# =====================================================


def get_bed(
    db: Session,
    bed_id: int,
):
    return (
        db.query(models.Bed)
        .filter(
            models.Bed.id == bed_id
        )
        .first()
    )


def get_beds(db: Session):
    return (
        db.query(models.Bed)
        .order_by(
            models.Bed.bed_number.asc()
        )
        .all()
    )


def create_bed(
    db: Session,
    bed: schemas.BedCreate,
):
    room = get_room(
        db,
        bed.room_id,
    )

    if not room:
        return "room_not_found"

    existing_bed = (
        db.query(models.Bed)
        .filter(
            models.Bed.bed_number
            == bed.bed_number,
            models.Bed.room_id
            == bed.room_id,
        )
        .first()
    )

    if existing_bed:
        return "bed_exists"

    db_bed = models.Bed(
        **bed.model_dump()
    )

    db.add(db_bed)

    try:
        db.commit()
        db.refresh(db_bed)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_bed


def update_bed(
    db: Session,
    bed_id: int,
    bed: schemas.BedUpdate,
):
    db_bed = get_bed(
        db,
        bed_id,
    )

    if not db_bed:
        return None

    update_data = bed.model_dump(
        exclude_unset=True
    )

    target_room_id = update_data.get(
        "room_id",
        db_bed.room_id,
    )

    room = get_room(
        db,
        target_room_id,
    )

    if not room:
        return "room_not_found"

    target_bed_number = update_data.get(
        "bed_number",
        db_bed.bed_number,
    )

    existing_bed = (
        db.query(models.Bed)
        .filter(
            models.Bed.bed_number
            == target_bed_number,
            models.Bed.room_id
            == target_room_id,
            models.Bed.id
            != bed_id,
        )
        .first()
    )

    if existing_bed:
        return "bed_exists"

    for key, value in update_data.items():
        setattr(
            db_bed,
            key,
            value,
        )

    try:
        db.commit()
        db.refresh(db_bed)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_bed


def delete_bed(
    db: Session,
    bed_id: int,
):
    bed = get_bed(
        db,
        bed_id,
    )

    if not bed:
        return None

    db.delete(bed)
    db.commit()

    return bed


# =====================================================
# HOUSEKEEPER
# =====================================================
#
# IMPORTANT:
#
# Housekeeper is NOT a separate model.
#
# Housekeeper = User where:
#
#     role == "Housekeeper"
#
# Therefore:
#
#     POST /users
#
# is used to create a Housekeeper.
#
#     PUT /users/{user_id}
#
# is used to update a Housekeeper.
#
#     DELETE /users/{user_id}
#
# is used to delete a Housekeeper.
#
# =====================================================


def get_housekeeper_by_id(
    db: Session,
    housekeeper_id: int,
):
    """
    Return a User only when the user's
    role is Housekeeper.
    """

    return (
        db.query(models.User)
        .filter(
            models.User.id
            == housekeeper_id,
            models.User.role
            == "Housekeeper",
        )
        .first()
    )


def get_housekeeper_by_employee_id(
    db: Session,
    employee_id: str,
):
    """
    Return a User only when the user's
    role is Housekeeper.
    """

    return (
        db.query(models.User)
        .filter(
            models.User.employee_id
            == employee_id,
            models.User.role
            == "Housekeeper",
        )
        .first()
    )


def get_housekeepers(
    db: Session,
):
    """
    Return all Housekeeper users.

    User remains the single source of truth.
    """

    return (
        db.query(models.User)
        .filter(
            models.User.role
            == "Housekeeper"
        )
        .order_by(
            models.User.id.desc()
        )
        .all()
    )


# =====================================================
# ROOM HOUSEKEEPER ASSIGNMENT
# =====================================================


def get_assignment_by_id(
    db: Session,
    assignment_id: int,
):
    return (
        db.query(
            models.RoomHousekeeperAssignment
        )
        .filter(
            models.RoomHousekeeperAssignment.id
            == assignment_id
        )
        .first()
    )


def get_room_assignment(
    db: Session,
    room_id: int,
):
    return (
        db.query(
            models.RoomHousekeeperAssignment
        )
        .filter(
            models.RoomHousekeeperAssignment.room_id
            == room_id,
            models.RoomHousekeeperAssignment.assignment_status
            == "Active",
        )
        .first()
    )


def get_housekeeper_assignments(
    db: Session,
    housekeeper_id: int,
):
    return (
        db.query(
            models.RoomHousekeeperAssignment
        )
        .filter(
            models.RoomHousekeeperAssignment.housekeeper_id
            == housekeeper_id
        )
        .order_by(
            models.RoomHousekeeperAssignment.id.desc()
        )
        .all()
    )


def get_all_room_assignments(
    db: Session,
):
    return (
        db.query(
            models.RoomHousekeeperAssignment
        )
        .order_by(
            models.RoomHousekeeperAssignment.id.desc()
        )
        .all()
    )


# =====================================================
# VALIDATE HOUSEKEEPER FOR ASSIGNMENT
# =====================================================


def _validate_housekeeper_for_assignment(
    db: Session,
    housekeeper_id: int,
):
    """
    Validate:

    1. User exists
    2. User role is Housekeeper
    3. User is active
    4. User is Present or Late today
    """

    housekeeper = get_housekeeper_by_id(
        db,
        housekeeper_id,
    )

    if not housekeeper:
        return "housekeeper_not_found"

    if housekeeper.is_active != "true":
        return "housekeeper_inactive"

    today = datetime.now(
        timezone.utc
    )

    attendance = get_attendance_for_user_date(
        db,
        housekeeper.id,
        today,
    )

    if not attendance:
        return "housekeeper_not_present"

    if attendance.status not in {
        "Present",
        "Late",
    }:
        return "housekeeper_not_present"

    return housekeeper


# =====================================================
# CREATE ROOM ASSIGNMENT
# =====================================================


def create_room_assignment(
    db: Session,
    assignment_data:
        schemas.RoomHousekeeperAssignmentCreate,
):
    # -------------------------------------------------
    # HOUSEKEEPER
    # -------------------------------------------------

    housekeeper = (
        _validate_housekeeper_for_assignment(
            db,
            assignment_data.housekeeper_id,
        )
    )

    if isinstance(housekeeper, str):
        return housekeeper

    # -------------------------------------------------
    # ROOM
    # -------------------------------------------------

    room = (
        db.query(models.Room)
        .filter(
            models.Room.id
            == assignment_data.room_id
        )
        .first()
    )

    if not room:
        return "room_not_found"

    # -------------------------------------------------
    # ACTIVE ROOM ASSIGNMENT
    # -------------------------------------------------

    existing_room_assignment = (
        db.query(
            models.RoomHousekeeperAssignment
        )
        .filter(
            models.RoomHousekeeperAssignment.room_id
            == assignment_data.room_id,
            models.RoomHousekeeperAssignment.assignment_status
            == "Active",
        )
        .first()
    )

    if existing_room_assignment:
        return "room_already_assigned"

    # -------------------------------------------------
    # CREATE
    # -------------------------------------------------

    db_assignment = (
        models.RoomHousekeeperAssignment(
            **assignment_data.model_dump()
        )
    )

    db.add(db_assignment)

    try:
        db.commit()
        db.refresh(db_assignment)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_assignment


# =====================================================
# UPDATE ROOM ASSIGNMENT
# =====================================================


def update_room_assignment(
    db: Session,
    assignment_id: int,
    assignment_data:
        schemas.RoomHousekeeperAssignmentUpdate,
):
    assignment = get_assignment_by_id(
        db,
        assignment_id,
    )

    if not assignment:
        return None

    update_data = assignment_data.model_dump(
        exclude_unset=True
    )

    # -------------------------------------------------
    # HOUSEKEEPER
    # -------------------------------------------------

    if "housekeeper_id" in update_data:

        housekeeper = (
            _validate_housekeeper_for_assignment(
                db,
                update_data["housekeeper_id"],
            )
        )

        if isinstance(housekeeper, str):
            return housekeeper

    # -------------------------------------------------
    # ROOM
    # -------------------------------------------------

    if "room_id" in update_data:

        room = (
            db.query(models.Room)
            .filter(
                models.Room.id
                == update_data["room_id"]
            )
            .first()
        )

        if not room:
            return "room_not_found"

        # Only check duplicate active assignment
        # when the resulting assignment remains Active.
        target_status = update_data.get(
            "assignment_status",
            assignment.assignment_status,
        )

        if target_status == "Active":

            existing = (
                db.query(
                    models.RoomHousekeeperAssignment
                )
                .filter(
                    models.RoomHousekeeperAssignment.room_id
                    == update_data["room_id"],
                    models.RoomHousekeeperAssignment.assignment_status
                    == "Active",
                    models.RoomHousekeeperAssignment.id
                    != assignment_id,
                )
                .first()
            )

            if existing:
                return "room_already_assigned"

    # -------------------------------------------------
    # APPLY
    # -------------------------------------------------

    for key, value in update_data.items():
        setattr(
            assignment,
            key,
            value,
        )

    try:
        db.commit()
        db.refresh(assignment)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return assignment


# =====================================================
# DELETE ROOM ASSIGNMENT
# =====================================================


def delete_room_assignment(
    db: Session,
    assignment_id: int,
):
    assignment = get_assignment_by_id(
        db,
        assignment_id,
    )

    if not assignment:
        return None

    db.delete(assignment)
    db.commit()

    return assignment



# =====================================================
# WORK MANAGEMENT CRUD
# =====================================================
#
# WORK TASK BUSINESS RULES
#
# Administrator:
#     - Create tasks
#     - Assign operational staff
#     - Modify tasks
#     - Cancel tasks
#     - Monitor all tasks
#
# Operational Staff:
#     - Doctor
#     - Nurse
#     - Receptionist
#     - Housekeeper
#
# Staff can:
#     - View their own assigned tasks
#     - Start their own tasks
#     - Complete their own tasks
#
# Staff cannot:
#     - Create tasks
#     - Assign tasks
#     - Modify other staff tasks
#     - Cancel other staff tasks
#
# =====================================================


# -----------------------------------------------------
# WORK TASK CONSTANTS
# -----------------------------------------------------

WORK_TASK_ALLOWED_ROLES = {
    "Doctor",
    "Nurse",
    "Receptionist",
    "Housekeeper",
}


WORK_TASK_ALLOWED_PRIORITIES = {
    "Low",
    "Medium",
    "High",
    "Urgent",
}


WORK_TASK_ALLOWED_STATUSES = {
    "Pending",
    "In Progress",
    "Completed",
    "Cancelled",
    "Overdue",
}


# -----------------------------------------------------
# GET WORK TASK
# -----------------------------------------------------


def get_work_task(
    db: Session,
    task_id: int,
):
    """
    Return a single WorkTask by ID.
    """

    return (
        db.query(models.WorkTask)
        .filter(
            models.WorkTask.id == task_id
        )
        .first()
    )


# -----------------------------------------------------
# GET ALL WORK TASKS
# -----------------------------------------------------


def get_work_tasks(
    db: Session,
):
    """
    Return all WorkTasks.

    Tasks are returned newest first.

    Before returning the result, Pending/In Progress
    tasks whose due time has passed are automatically
    marked as Overdue.
    """

    tasks = (
        db.query(models.WorkTask)
        .order_by(
            models.WorkTask.id.desc()
        )
        .all()
    )

    changed = False

    now = datetime.now(
        timezone.utc
    )

    for task in tasks:

        if (
            task.status == "Pending"
            and task.due_at is not None
        ):

            due_at = task.due_at

            # -----------------------------------------
            # Handle legacy / naive datetime values.
            # Treat them as UTC for safe comparison.
            # -----------------------------------------

            if due_at.tzinfo is None:
                due_at = due_at.replace(
                    tzinfo=timezone.utc
                )

            if due_at <= now:

                task.status = "Overdue"

                changed = True

    if changed:

        db.commit()

        for task in tasks:
            db.refresh(task)

    return tasks


# -----------------------------------------------------
# GET TASKS ASSIGNED TO USER
# -----------------------------------------------------


def get_work_tasks_for_user(
    db: Session,
    user_id: int,
):
    """
    Return ONLY the tasks assigned to the specified
    user.

    This function is intentionally filtered by
    assigned_to_id at the database level.

    It must not return another employee's tasks.
    """

    tasks = (
        db.query(models.WorkTask)
        .filter(
            models.WorkTask.assigned_to_id
            == user_id
        )
        .order_by(
            models.WorkTask.id.desc()
        )
        .all()
    )

    changed = False

    now = datetime.now(
        timezone.utc
    )

    for task in tasks:

        if (
            task.status == "Pending"
            and task.due_at is not None
        ):

            due_at = task.due_at

            if due_at.tzinfo is None:
                due_at = due_at.replace(
                    tzinfo=timezone.utc
                )

            if due_at <= now:

                task.status = "Overdue"

                changed = True

    if changed:

        db.commit()

        for task in tasks:
            db.refresh(task)

    return tasks


# -----------------------------------------------------
# VALIDATE TASK ASSIGNEE
# -----------------------------------------------------


def _validate_work_task_assignee(
    db: Session,
    assigned_to_id: int,
):
    """
    Validate the employee receiving a WorkTask.

    Requirements:
        1. User must exist.
        2. User must be an operational role.
        3. User must be active.

    Administrator is intentionally excluded because
    Work Management assigns operational work to
    operational staff.
    """

    user = get_user_by_id(
        db,
        assigned_to_id,
    )

    if not user:
        return "assignee_not_found"

    if (
        user.role
        not in WORK_TASK_ALLOWED_ROLES
    ):
        return "invalid_assignee_role"

    if user.is_active != "true":
        return "assignee_inactive"

    return user


# -----------------------------------------------------
# VALIDATE TASK PRIORITY
# -----------------------------------------------------


def _validate_work_task_priority(
    priority: str,
):
    """
    Validate WorkTask priority.
    """

    if (
        priority
        not in WORK_TASK_ALLOWED_PRIORITIES
    ):
        return False

    return True


# -----------------------------------------------------
# CREATE WORK TASK
# -----------------------------------------------------


def create_work_task(
    db: Session,
    task: schemas.WorkTaskCreate,
    created_by_id: int,
):
    """
    Create and assign a new WorkTask.

    Only an Administrator may create a task.

    The assigned user must be:
        Doctor
        Nurse
        Receptionist
        Housekeeper

    The assigned user must also be active.
    """

    # -------------------------------------------------
    # VALIDATE CREATOR
    # -------------------------------------------------

    creator = get_user_by_id(
        db,
        created_by_id,
    )

    if not creator:
        return "creator_not_found"

    if creator.role != "Administrator":
        return "admin_required"

    if creator.is_active != "true":
        return "creator_inactive"

    # -------------------------------------------------
    # VALIDATE ASSIGNEE
    # -------------------------------------------------

    assignee = _validate_work_task_assignee(
        db,
        task.assigned_to_id,
    )

    if isinstance(
        assignee,
        str,
    ):
        return assignee

    # -------------------------------------------------
    # VALIDATE PRIORITY
    # -------------------------------------------------

    if not _validate_work_task_priority(
        task.priority
    ):
        return "invalid_priority"

    # -------------------------------------------------
    # CLEAN TEXT
    # -------------------------------------------------

    title = task.title.strip()

    if not title:
        return "title_required"

    description = (
        task.description.strip()
        if task.description
        else None
    )

    location = (
        task.location.strip()
        if task.location
        else None
    )

    instructions = (
        task.instructions.strip()
        if task.instructions
        else None
    )

    # -------------------------------------------------
    # CREATE
    # -------------------------------------------------

    db_task = models.WorkTask(
        title=title,
        description=description,
        assigned_to_id=assignee.id,
        created_by_id=creator.id,
        priority=task.priority,
        status="Pending",
        due_at=task.due_at,
        location=location,
        instructions=instructions,
    )

    db.add(db_task)

    try:

        db.commit()

        db.refresh(
            db_task
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_task


# -----------------------------------------------------
# UPDATE WORK TASK
# -----------------------------------------------------


def update_work_task(
    db: Session,
    task_id: int,
    task_data: schemas.WorkTaskUpdate,
    updated_by_id: int,
):
    """
    Administrator-only WorkTask modification.

    Completed and Cancelled tasks are treated as
    historical records and cannot be modified.
    """

    # -------------------------------------------------
    # VALIDATE ADMINISTRATOR
    # -------------------------------------------------

    admin = get_user_by_id(
        db,
        updated_by_id,
    )

    if not admin:
        return "admin_not_found"

    if admin.role != "Administrator":
        return "admin_required"

    if admin.is_active != "true":
        return "admin_inactive"

    # -------------------------------------------------
    # GET TASK
    # -------------------------------------------------

    task = get_work_task(
        db,
        task_id,
    )

    if not task:
        return None

    # -------------------------------------------------
    # PROTECT COMPLETED / CANCELLED HISTORY
    # -------------------------------------------------

    if task.status == "Completed":
        return "task_completed"

    if task.status == "Cancelled":
        return "task_cancelled"

    # -------------------------------------------------
    # UPDATE DATA
    # -------------------------------------------------

    update_data = task_data.model_dump(
        exclude_unset=True
    )

    # -------------------------------------------------
    # TITLE
    # -------------------------------------------------

    if "title" in update_data:

        title = (
            update_data["title"].strip()
            if update_data["title"]
            else ""
        )

        if not title:
            return "title_required"

        update_data["title"] = title

    # -------------------------------------------------
    # DESCRIPTION
    # -------------------------------------------------

    if (
        "description"
        in update_data
        and update_data["description"]
    ):

        update_data["description"] = (
            update_data["description"].strip()
        )

    # -------------------------------------------------
    # LOCATION
    # -------------------------------------------------

    if (
        "location"
        in update_data
        and update_data["location"]
    ):

        update_data["location"] = (
            update_data["location"].strip()
        )

    # -------------------------------------------------
    # INSTRUCTIONS
    # -------------------------------------------------

    if (
        "instructions"
        in update_data
        and update_data["instructions"]
    ):

        update_data["instructions"] = (
            update_data["instructions"].strip()
        )

    # -------------------------------------------------
    # PRIORITY
    # -------------------------------------------------

    if "priority" in update_data:

        if not _validate_work_task_priority(
            update_data["priority"]
        ):
            return "invalid_priority"

    # -------------------------------------------------
    # ASSIGNEE
    # -------------------------------------------------

    if "assigned_to_id" in update_data:

        assignee = (
            _validate_work_task_assignee(
                db,
                update_data[
                    "assigned_to_id"
                ],
            )
        )

        if isinstance(
            assignee,
            str,
        ):
            return assignee

        update_data[
            "assigned_to_id"
        ] = assignee.id

    # -------------------------------------------------
    # STATUS IS NOT UPDATED HERE
    # -------------------------------------------------
    #
    # Status transitions are controlled by:
    #
    #     start_work_task()
    #     complete_work_task()
    #     cancel_work_task()
    #
    # This prevents arbitrary status manipulation.
    #
    # -------------------------------------------------

    update_data.pop(
        "status",
        None,
    )

    update_data.pop(
        "started_at",
        None,
    )

    update_data.pop(
        "completed_at",
        None,
    )

    update_data.pop(
        "cancelled_at",
        None,
    )

    # -------------------------------------------------
    # APPLY
    # -------------------------------------------------

    for key, value in update_data.items():

        setattr(
            task,
            key,
            value,
        )

    try:

        db.commit()

        db.refresh(
            task
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return task


# -----------------------------------------------------
# START WORK TASK
# -----------------------------------------------------


def start_work_task(
    db: Session,
    task_id: int,
    user_id: int,
):
    """
    Start a task assigned to the current user.

    Allowed transition:

        Pending  -> In Progress
        Overdue  -> In Progress

    A user cannot start somebody else's task.
    """

    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return "user_not_found"

    if (
        user.role
        not in WORK_TASK_ALLOWED_ROLES
    ):
        return "invalid_staff_role"

    if user.is_active != "true":
        return "user_inactive"

    task = get_work_task(
        db,
        task_id,
    )

    if not task:
        return None

    # -------------------------------------------------
    # OWNERSHIP
    # -------------------------------------------------

    if task.assigned_to_id != user.id:
        return "not_assigned"

    # -------------------------------------------------
    # STATUS
    # -------------------------------------------------

    if task.status == "In Progress":
        return "already_in_progress"

    if task.status == "Completed":
        return "task_completed"

    if task.status == "Cancelled":
        return "task_cancelled"

    # -------------------------------------------------
    # START
    # -------------------------------------------------

    if task.status not in {
        "Pending",
        "Overdue",
    }:
        return "invalid_transition"

    task.status = "In Progress"

    task.started_at = datetime.now(
        timezone.utc
    )

    try:

        db.commit()

        db.refresh(
            task
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return task


# -----------------------------------------------------
# COMPLETE WORK TASK
# -----------------------------------------------------


def complete_work_task(
    db: Session,
    task_id: int,
    user_id: int,
):
    """
    Complete a task assigned to the current user.

    Allowed transition:

        In Progress -> Completed

    A user cannot complete somebody else's task.
    """

    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        return "user_not_found"

    if (
        user.role
        not in WORK_TASK_ALLOWED_ROLES
    ):
        return "invalid_staff_role"

    if user.is_active != "true":
        return "user_inactive"

    task = get_work_task(
        db,
        task_id,
    )

    if not task:
        return None

    # -------------------------------------------------
    # OWNERSHIP
    # -------------------------------------------------

    if task.assigned_to_id != user.id:
        return "not_assigned"

    # -------------------------------------------------
    # STATUS
    # -------------------------------------------------

    if task.status == "Completed":
        return "task_completed"

    if task.status == "Cancelled":
        return "task_cancelled"

    if task.status not in {
        "In Progress",
    }:
        return "invalid_transition"

    # -------------------------------------------------
    # COMPLETE
    # -------------------------------------------------

    task.status = "Completed"

    task.completed_at = datetime.now(
        timezone.utc
    )

    try:

        db.commit()

        db.refresh(
            task
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return task


# -----------------------------------------------------
# CANCEL WORK TASK
# -----------------------------------------------------


def cancel_work_task(
    db: Session,
    task_id: int,
    cancelled_by_id: int,
):
    """
    Cancel a WorkTask.

    Only an Administrator can cancel a task.

    Cancellation preserves the task record for
    operational history and auditing.
    """

    admin = get_user_by_id(
        db,
        cancelled_by_id,
    )

    if not admin:
        return "admin_not_found"

    if admin.role != "Administrator":
        return "admin_required"

    if admin.is_active != "true":
        return "admin_inactive"

    task = get_work_task(
        db,
        task_id,
    )

    if not task:
        return None

    # -------------------------------------------------
    # PROTECT FINAL STATES
    # -------------------------------------------------

    if task.status == "Completed":
        return "task_completed"

    if task.status == "Cancelled":
        return "task_cancelled"

    # -------------------------------------------------
    # CANCEL
    # -------------------------------------------------

    task.status = "Cancelled"

    task.cancelled_at = datetime.now(
        timezone.utc
    )

    try:

        db.commit()

        db.refresh(
            task
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return task


# =====================================================
# CLINICAL ENCOUNTER CRUD
# =====================================================

CLINICAL_ENCOUNTER_STATUSES = {
    "Draft",
    "Completed",
    "Cancelled",
}


def _validate_clinical_encounter_status(status: str):
    if status not in CLINICAL_ENCOUNTER_STATUSES:
        raise ValueError(
            "Invalid clinical encounter status. "
            "Allowed values: Draft, Completed, Cancelled."
        )


def _validate_doctor_user(user):
    if user is None:
        raise ValueError("Doctor not found.")

    if user.role != "Doctor":
        raise ValueError("Selected user is not a Doctor.")

    if user.is_active != "true":
        raise ValueError("Selected Doctor is inactive.")

    return user


def get_clinical_encounter(
    db: Session,
    encounter_id: int,
):
    return (
        db.query(models.ClinicalEncounter)
        .filter(
            models.ClinicalEncounter.id == encounter_id
        )
        .first()
    )


def get_clinical_encounters(
    db: Session,
    patient_id: int | None = None,
    doctor_id: int | None = None,
):
    query = db.query(models.ClinicalEncounter)

    if patient_id is not None:
        query = query.filter(
            models.ClinicalEncounter.patient_id == patient_id
        )

    if doctor_id is not None:
        query = query.filter(
            models.ClinicalEncounter.doctor_id == doctor_id
        )

    return (
        query
        .order_by(
            models.ClinicalEncounter.created_at.desc()
        )
        .all()
    )


def get_clinical_encounters_for_doctor(
    db: Session,
    doctor_id: int,
):
    return (
        db.query(models.ClinicalEncounter)
        .filter(
            models.ClinicalEncounter.doctor_id == doctor_id
        )
        .order_by(
            models.ClinicalEncounter.created_at.desc()
        )
        .all()
    )


def get_clinical_encounters_for_patient(
    db: Session,
    patient_id: int,
):
    return (
        db.query(models.ClinicalEncounter)
        .filter(
            models.ClinicalEncounter.patient_id == patient_id
        )
        .order_by(
            models.ClinicalEncounter.created_at.desc()
        )
        .all()
    )


def create_clinical_encounter(
    db: Session,
    patient_id: int,
    doctor_id: int,
    encounter: schemas.ClinicalEncounterCreate,
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id)
        .first()
    )

    if patient is None:
        raise ValueError("Patient not found.")

    doctor = (
        db.query(models.User)
        .filter(models.User.id == doctor_id)
        .first()
    )

    _validate_doctor_user(doctor)

    _validate_clinical_encounter_status(
        encounter.status
    )

    db_encounter = models.ClinicalEncounter(
        patient_id=patient_id,
        doctor_id=doctor_id,
        status=encounter.status,
        chief_complaint=encounter.chief_complaint,
        symptoms=encounter.symptoms,
        clinical_notes=encounter.clinical_notes,
        diagnosis=encounter.diagnosis,
        treatment_plan=encounter.treatment_plan,
        prescription=encounter.prescription,
        follow_up_date=encounter.follow_up_date,
    )

    db.add(db_encounter)
    db.commit()
    db.refresh(db_encounter)

    return db_encounter


def update_clinical_encounter(
    db: Session,
    encounter_id: int,
    encounter: schemas.ClinicalEncounterUpdate,
):
    db_encounter = get_clinical_encounter(
        db,
        encounter_id,
    )

    if db_encounter is None:
        return None

    if db_encounter.status == "Cancelled":
        raise ValueError(
            "Cancelled clinical encounters cannot be modified."
        )

    update_data = encounter.model_dump(
        exclude_unset=True
    )

    if "status" in update_data:
        _validate_clinical_encounter_status(
            update_data["status"]
        )

    for field, value in update_data.items():
        setattr(
            db_encounter,
            field,
            value,
        )

    db.commit()
    db.refresh(db_encounter)

    return db_encounter


def complete_clinical_encounter(
    db: Session,
    encounter_id: int,
):
    db_encounter = get_clinical_encounter(
        db,
        encounter_id,
    )

    if db_encounter is None:
        return None

    if db_encounter.status == "Cancelled":
        raise ValueError(
            "Cancelled clinical encounters cannot be completed."
        )

    if db_encounter.status == "Completed":
        raise ValueError(
            "Clinical encounter is already completed."
        )

    db_encounter.status = "Completed"

    db.commit()
    db.refresh(db_encounter)

    return db_encounter


def cancel_clinical_encounter(
    db: Session,
    encounter_id: int,
):
    db_encounter = get_clinical_encounter(
        db,
        encounter_id,
    )

    if db_encounter is None:
        return None

    if db_encounter.status == "Completed":
        raise ValueError(
            "Completed clinical encounters cannot be cancelled."
        )

    if db_encounter.status == "Cancelled":
        raise ValueError(
            "Clinical encounter is already cancelled."
        )

    db_encounter.status = "Cancelled"

    db.commit()
    db.refresh(db_encounter)

    return db_encounter


# =====================================================
# REFERRAL CRUD
# =====================================================
#
# Referral lifecycle:
#
#     PENDING -> ACCEPTED -> IN_PROGRESS -> COMPLETED
#     PENDING -> REJECTED
#     PENDING -> CANCELLED
#
# A referral always preserves the patient + clinical encounter
# context and identifies the referring Doctor. The receiving
# Doctor and/or Department is validated before creation.
#
# =====================================================


def get_referral(
    db: Session,
    referral_id: int,
):
    return (
        db.query(models.Referral)
        .options(
            joinedload(models.Referral.patient),
            joinedload(models.Referral.encounter),
            joinedload(models.Referral.referred_by),
            joinedload(models.Referral.referred_to),
            joinedload(models.Referral.department),
        )
        .filter(models.Referral.id == referral_id)
        .first()
    )


def get_referrals_for_patient(
    db: Session,
    patient_id: int,
):
    return (
        db.query(models.Referral)
        .options(
            joinedload(models.Referral.patient),
            joinedload(models.Referral.encounter),
            joinedload(models.Referral.referred_by),
            joinedload(models.Referral.referred_to),
            joinedload(models.Referral.department),
        )
        .filter(models.Referral.patient_id == patient_id)
        .order_by(models.Referral.referred_at.desc())
        .all()
    )


def get_referrals_for_encounter(
    db: Session,
    encounter_id: int,
):
    return (
        db.query(models.Referral)
        .options(
            joinedload(models.Referral.patient),
            joinedload(models.Referral.encounter),
            joinedload(models.Referral.referred_by),
            joinedload(models.Referral.referred_to),
            joinedload(models.Referral.department),
        )
        .filter(models.Referral.encounter_id == encounter_id)
        .order_by(models.Referral.referred_at.desc())
        .all()
    )


def get_referrals_for_doctor(
    db: Session,
    doctor_id: int,
):
    return (
        db.query(models.Referral)
        .options(
            joinedload(models.Referral.patient),
            joinedload(models.Referral.encounter),
            joinedload(models.Referral.referred_by),
            joinedload(models.Referral.referred_to),
            joinedload(models.Referral.department),
        )
        .filter(
            (models.Referral.referred_by_id == doctor_id)
            | (models.Referral.referred_to_id == doctor_id)
        )
        .order_by(models.Referral.referred_at.desc())
        .all()
    )


def _validate_referral_doctor(
    db: Session,
    doctor_id: int,
):
    doctor = (
        db.query(models.User)
        .filter(models.User.id == doctor_id)
        .first()
    )

    if doctor is None:
        raise ValueError("Doctor not found.")

    if doctor.role != "Doctor":
        raise ValueError("Selected user is not a Doctor.")

    if str(doctor.is_active).lower() != "true":
        raise ValueError("Doctor account is inactive.")

    return doctor


def _validate_referral_patient(
    db: Session,
    patient_id: int,
):
    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id)
        .first()
    )

    if patient is None:
        raise ValueError("Patient not found.")

    return patient


def _validate_referral_encounter(
    db: Session,
    encounter_id: int,
    patient_id: int,
):
    encounter = (
        db.query(models.ClinicalEncounter)
        .filter(models.ClinicalEncounter.id == encounter_id)
        .first()
    )

    if encounter is None:
        raise ValueError("Clinical encounter not found.")

    if encounter.patient_id != patient_id:
        raise ValueError(
            "Clinical encounter does not belong to the selected patient."
        )

    if encounter.status == "Cancelled":
        raise ValueError(
            "Referrals cannot be created from a cancelled clinical encounter."
        )

    return encounter


def _validate_referral_department(
    db: Session,
    department_id: Optional[int],
):
    if department_id is None:
        return None

    department = (
        db.query(models.Department)
        .filter(models.Department.id == department_id)
        .first()
    )

    if department is None:
        raise ValueError("Department not found.")

    return department


def _validate_referral_target(
    db: Session,
    referred_to_id: Optional[int],
    department_id: Optional[int],
):
    if referred_to_id is None and department_id is None:
        raise ValueError(
            "Referral must have a receiving Doctor or Department."
        )

    receiving_doctor = None
    department = None

    if referred_to_id is not None:
        receiving_doctor = _validate_referral_doctor(
            db,
            referred_to_id,
        )

    if department_id is not None:
        department = _validate_referral_department(
            db,
            department_id,
        )

    return receiving_doctor, department


def _validate_referral_status(
    status: str,
):
    normalized_status = status.strip().upper()

    if normalized_status not in schemas.REFERRAL_STATUSES:
        raise ValueError("Invalid referral status.")

    return normalized_status


def create_referral(
    db: Session,
    referral: schemas.ReferralCreate,
    referring_doctor_id: int,
):
    _validate_referral_doctor(
        db,
        referring_doctor_id,
    )

    _validate_referral_patient(
        db,
        referral.patient_id,
    )

    encounter = _validate_referral_encounter(
        db,
        referral.encounter_id,
        referral.patient_id,
    )

    if encounter.doctor_id != referring_doctor_id:
        raise ValueError(
            "Only the doctor who owns the clinical encounter can create the referral."
        )

    _validate_referral_target(
        db,
        referral.referred_to_id,
        referral.department_id,
    )

    db_referral = models.Referral(
        patient_id=referral.patient_id,
        encounter_id=referral.encounter_id,
        referred_by_id=referring_doctor_id,
        referred_to_id=referral.referred_to_id,
        department_id=referral.department_id,
        specialty=referral.specialty,
        referral_type=referral.referral_type,
        reason=referral.reason,
        clinical_summary=referral.clinical_summary,
        priority=referral.priority,
        status="PENDING",
        notes=referral.notes,
    )

    db.add(db_referral)
    db.commit()
    db.refresh(db_referral)

    return get_referral(db, db_referral.id)


def update_referral(
    db: Session,
    referral_id: int,
    referral_update: schemas.ReferralUpdate,
    referring_doctor_id: int,
):
    db_referral = get_referral(
        db,
        referral_id,
    )

    if db_referral is None:
        return None

    if db_referral.referred_by_id != referring_doctor_id:
        raise ValueError(
            "Only the referring doctor can edit this referral."
        )

    if db_referral.status != "PENDING":
        raise ValueError(
            "Only pending referrals can be edited."
        )

    update_data = referral_update.model_dump(
        exclude_unset=True,
    )

    for field, value in update_data.items():
        setattr(
            db_referral,
            field,
            value,
        )

    db.commit()
    db.refresh(db_referral)

    return get_referral(db, db_referral.id)


def accept_referral(
    db: Session,
    referral_id: int,
    receiving_doctor_id: int,
):
    db_referral = get_referral(
        db,
        referral_id,
    )

    if db_referral is None:
        return None

    _validate_referral_doctor(
        db,
        receiving_doctor_id,
    )

    if db_referral.referred_to_id != receiving_doctor_id:
        raise ValueError(
            "Only the assigned receiving doctor can accept this referral."
        )

    if db_referral.status != "PENDING":
        raise ValueError(
            "Only pending referrals can be accepted."
        )

    db_referral.status = "ACCEPTED"
    db_referral.accepted_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_referral)

    return get_referral(db, db_referral.id)


def start_referral(
    db: Session,
    referral_id: int,
    receiving_doctor_id: int,
):
    db_referral = get_referral(
        db,
        referral_id,
    )

    if db_referral is None:
        return None

    _validate_referral_doctor(
        db,
        receiving_doctor_id,
    )

    if db_referral.referred_to_id != receiving_doctor_id:
        raise ValueError(
            "Only the assigned receiving doctor can start this referral."
        )

    if db_referral.status != "ACCEPTED":
        raise ValueError(
            "Only accepted referrals can be started."
        )

    db_referral.status = "IN_PROGRESS"
    db_referral.started_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_referral)

    return get_referral(db, db_referral.id)


def complete_referral(
    db: Session,
    referral_id: int,
    receiving_doctor_id: int,
):
    db_referral = get_referral(
        db,
        referral_id,
    )

    if db_referral is None:
        return None

    _validate_referral_doctor(
        db,
        receiving_doctor_id,
    )

    if db_referral.referred_to_id != receiving_doctor_id:
        raise ValueError(
            "Only the assigned receiving doctor can complete this referral."
        )

    if db_referral.status != "IN_PROGRESS":
        raise ValueError(
            "Only in-progress referrals can be completed."
        )

    db_referral.status = "COMPLETED"
    db_referral.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_referral)

    return get_referral(db, db_referral.id)


def reject_referral(
    db: Session,
    referral_id: int,
    receiving_doctor_id: int,
    notes: Optional[str] = None,
):
    db_referral = get_referral(
        db,
        referral_id,
    )

    if db_referral is None:
        return None

    _validate_referral_doctor(
        db,
        receiving_doctor_id,
    )

    if db_referral.referred_to_id != receiving_doctor_id:
        raise ValueError(
            "Only the assigned receiving doctor can reject this referral."
        )

    if db_referral.status != "PENDING":
        raise ValueError(
            "Only pending referrals can be rejected."
        )

    db_referral.status = "REJECTED"
    db_referral.rejected_at = datetime.now(timezone.utc)

    if notes is not None:
        db_referral.notes = notes.strip() or None

    db.commit()
    db.refresh(db_referral)

    return get_referral(db, db_referral.id)


def cancel_referral(
    db: Session,
    referral_id: int,
    referring_doctor_id: int,
    notes: Optional[str] = None,
):
    db_referral = get_referral(
        db,
        referral_id,
    )

    if db_referral is None:
        return None

    if db_referral.referred_by_id != referring_doctor_id:
        raise ValueError(
            "Only the referring doctor can cancel this referral."
        )

    if db_referral.status != "PENDING":
        raise ValueError(
            "Only pending referrals can be cancelled."
        )

    db_referral.status = "CANCELLED"
    db_referral.cancelled_at = datetime.now(timezone.utc)

    if notes is not None:
        db_referral.notes = notes.strip() or None

    db.commit()
    db.refresh(db_referral)

    return get_referral(db, db_referral.id)


# =====================================================
# NURSING OBSERVATION CRUD
# =====================================================

NURSING_CARE_STATUSES = {
    "Stable",
    "Under Observation",
    "Needs Attention",
    "Critical",
}


def _validate_nursing_care_status(care_status: str):
    if care_status not in NURSING_CARE_STATUSES:
        raise ValueError(
            "Invalid care status. Allowed values: "
            "Stable, Under Observation, Needs Attention, Critical."
        )


def _validate_nurse_user(db: Session, nurse_id: int):
    nurse = (
        db.query(models.User)
        .filter(models.User.id == nurse_id)
        .first()
    )

    if nurse is None:
        raise ValueError("Nurse not found.")

    if nurse.role != "Nurse":
        raise ValueError(
            "The selected user is not a Nurse."
        )

    if nurse.is_active != "true":
        raise ValueError(
            "This Nurse account is inactive."
        )

    return nurse


def get_nursing_observation(
    db: Session,
    observation_id: int,
):
    return (
        db.query(models.NursingObservation)
        .filter(
            models.NursingObservation.id
            == observation_id
        )
        .first()
    )


def get_nursing_observations(
    db: Session,
):
    return (
        db.query(models.NursingObservation)
        .order_by(
            models.NursingObservation.recorded_at.desc()
        )
        .all()
    )


def get_nursing_observations_for_nurse(
    db: Session,
    nurse_id: int,
):
    return (
        db.query(models.NursingObservation)
        .filter(
            models.NursingObservation.nurse_id
            == nurse_id
        )
        .order_by(
            models.NursingObservation.recorded_at.desc()
        )
        .all()
    )


def get_nursing_observations_for_patient(
    db: Session,
    patient_id: int,
):
    return (
        db.query(models.NursingObservation)
        .filter(
            models.NursingObservation.patient_id
            == patient_id
        )
        .order_by(
            models.NursingObservation.recorded_at.desc()
        )
        .all()
    )


def create_nursing_observation(
    db: Session,
    patient_id: int,
    nurse_id: int,
    observation: schemas.NursingObservationCreate,
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == patient_id
        )
        .first()
    )

    if patient is None:
        raise ValueError("Patient not found.")

    _validate_nurse_user(
        db=db,
        nurse_id=nurse_id,
    )

    _validate_nursing_care_status(
        observation.care_status
    )

    db_observation = models.NursingObservation(
        patient_id=patient_id,
        nurse_id=nurse_id,
        blood_pressure=observation.blood_pressure,
        pulse=observation.pulse,
        temperature=observation.temperature,
        oxygen_saturation=observation.oxygen_saturation,
        respiratory_rate=observation.respiratory_rate,
        weight=observation.weight,
        nursing_notes=observation.nursing_notes,
        care_status=observation.care_status,
    )

    db.add(db_observation)
    db.commit()
    db.refresh(db_observation)

    return db_observation


def update_nursing_observation(
    db: Session,
    observation_id: int,
    observation: schemas.NursingObservationUpdate,
):
    db_observation = get_nursing_observation(
        db=db,
        observation_id=observation_id,
    )

    if db_observation is None:
        return None

    if observation.care_status is not None:
        _validate_nursing_care_status(
            observation.care_status
        )

    update_data = observation.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(
            db_observation,
            field,
            value,
        )

    db.commit()
    db.refresh(db_observation)

    return db_observation

# =====================================================
# APPOINTMENT CRUD
# =====================================================
#
# Appointment is the patient-flow record created before
# queue / clinical encounter processing.
#
# Flow:
#
#     Patient
#        ↓
#     Appointment / Walk-in
#        ↓
#     Checked-in
#        ↓
#     In Queue
#        ↓
#     Clinical Encounter
#        ↓
#     Completed
#
# Appointment history is preserved. Cancellation and
# no-show are represented by status rather than deletion.
# =====================================================


APPOINTMENT_TYPES = {
    "Scheduled",
    "Walk-in",
}


APPOINTMENT_STATUSES = {
    "Scheduled",
    "Checked-in",
    "In Queue",
    "Completed",
    "Cancelled",
    "No-show",
}


def _validate_appointment_type(
    appointment_type: str,
):
    if appointment_type not in APPOINTMENT_TYPES:
        raise ValueError(
            "Invalid appointment type."
        )


def _validate_appointment_status(
    status: str,
):
    if status not in APPOINTMENT_STATUSES:
        raise ValueError(
            "Invalid appointment status."
        )


def _validate_appointment_patient(
    db: Session,
    patient_id: int,
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == patient_id
        )
        .first()
    )

    if patient is None:
        raise ValueError(
            "Patient not found."
        )

    return patient


def _validate_appointment_department(
    db: Session,
    department_id: int,
):
    department = (
        db.query(models.Department)
        .filter(
            models.Department.id == department_id
        )
        .first()
    )

    if department is None:
        raise ValueError(
            "Department not found."
        )

    if not department.is_active:
        raise ValueError(
            "Selected department is inactive."
        )

    return department


def _validate_appointment_doctor(
    db: Session,
    doctor_id: Optional[int],
):
    if doctor_id is None:
        return None

    doctor = (
        db.query(models.User)
        .filter(
            models.User.id == doctor_id
        )
        .first()
    )

    if doctor is None:
        raise ValueError(
            "Doctor not found."
        )

    if doctor.role != "Doctor":
        raise ValueError(
            "Selected user is not a Doctor."
        )

    if doctor.is_active != "true":
        raise ValueError(
            "Selected Doctor is inactive."
        )

    return doctor


def get_appointment(
    db: Session,
    appointment_id: int,
):
    return (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id
        )
        .first()
    )


def get_appointments(
    db: Session,
    patient_id: Optional[int] = None,
    department_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    status: Optional[str] = None,
):
    query = db.query(models.Appointment)

    if patient_id is not None:
        query = query.filter(
            models.Appointment.patient_id
            == patient_id
        )

    if department_id is not None:
        query = query.filter(
            models.Appointment.department_id
            == department_id
        )

    if doctor_id is not None:
        query = query.filter(
            models.Appointment.doctor_id
            == doctor_id
        )

    if status is not None:
        _validate_appointment_status(status)

        query = query.filter(
            models.Appointment.status
            == status
        )

    return (
        query
        .order_by(
            models.Appointment.scheduled_at.asc(),
            models.Appointment.id.asc(),
        )
        .all()
    )


def get_appointments_for_patient(
    db: Session,
    patient_id: int,
):
    _validate_appointment_patient(
        db,
        patient_id,
    )

    return (
        db.query(models.Appointment)
        .filter(
            models.Appointment.patient_id
            == patient_id
        )
        .order_by(
            models.Appointment.scheduled_at.desc(),
            models.Appointment.id.desc(),
        )
        .all()
    )


def get_appointments_for_doctor(
    db: Session,
    doctor_id: int,
):
    _validate_appointment_doctor(
        db,
        doctor_id,
    )

    return (
        db.query(models.Appointment)
        .filter(
            models.Appointment.doctor_id
            == doctor_id
        )
        .order_by(
            models.Appointment.scheduled_at.asc(),
            models.Appointment.id.asc(),
        )
        .all()
    )


def create_appointment(
    db: Session,
    appointment: schemas.AppointmentCreate,
    created_by: int,
):
    _validate_appointment_patient(
        db,
        appointment.patient_id,
    )

    _validate_appointment_department(
        db,
        appointment.department_id,
    )

    _validate_appointment_doctor(
        db,
        appointment.doctor_id,
    )

    _validate_appointment_type(
        appointment.appointment_type
    )

    creator = get_user_by_id(
        db,
        created_by,
    )

    if creator is None:
        raise ValueError(
            "Appointment creator not found."
        )

    if creator.is_active != "true":
        raise ValueError(
            "Appointment creator is inactive."
        )

    db_appointment = models.Appointment(
        patient_id=appointment.patient_id,
        department_id=appointment.department_id,
        doctor_id=appointment.doctor_id,
        scheduled_at=appointment.scheduled_at,
        appointment_type=appointment.appointment_type,
        status="Scheduled",
        reason=appointment.reason,
        notes=appointment.notes,
        created_by=created_by,
    )

    db.add(db_appointment)

    try:
        db.commit()
        db.refresh(db_appointment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_appointment


def update_appointment(
    db: Session,
    appointment_id: int,
    appointment: schemas.AppointmentUpdate,
):
    db_appointment = get_appointment(
        db,
        appointment_id,
    )

    if db_appointment is None:
        return None

    if db_appointment.status in {
        "Completed",
        "Cancelled",
        "No-show",
    }:
        raise ValueError(
            "Completed, cancelled, or no-show appointments cannot be modified."
        )

    update_data = appointment.model_dump(
        exclude_unset=True
    )

    # -------------------------------------------------
    # PATIENT IDENTITY
    # -------------------------------------------------
    #
    # An appointment remains tied to the patient that
    # created the appointment history. It must not be
    # moved to another patient through an update.
    #
    update_data.pop(
        "patient_id",
        None,
    )

    # -------------------------------------------------
    # DEPARTMENT
    # -------------------------------------------------

    if "department_id" in update_data:
        _validate_appointment_department(
            db,
            update_data["department_id"],
        )

    # -------------------------------------------------
    # DOCTOR
    # -------------------------------------------------

    if "doctor_id" in update_data:
        _validate_appointment_doctor(
            db,
            update_data["doctor_id"],
        )

    # -------------------------------------------------
    # APPOINTMENT TYPE
    # -------------------------------------------------

    if "appointment_type" in update_data:
        _validate_appointment_type(
            update_data["appointment_type"]
        )

    # -------------------------------------------------
    # STATUS
    # -------------------------------------------------
    #
    # Lifecycle status changes must use the dedicated
    # functions below. This prevents the client from
    # bypassing check-in / queue / completion rules.
    #
    if "status" in update_data:
        _validate_appointment_status(
            update_data["status"]
        )

        if update_data["status"] != db_appointment.status:
            raise ValueError(
                "Use the dedicated appointment lifecycle action for status changes."
            )

        update_data.pop(
            "status",
            None,
        )

    for field, value in update_data.items():
        setattr(
            db_appointment,
            field,
            value,
        )

    try:
        db.commit()
        db.refresh(db_appointment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_appointment


def check_in_appointment(
    db: Session,
    appointment_id: int,
):
    db_appointment = get_appointment(
        db,
        appointment_id,
    )

    if db_appointment is None:
        return None

    if db_appointment.status != "Scheduled":
        raise ValueError(
            "Only scheduled appointments can be checked in."
        )

    db_appointment.status = "Checked-in"

    try:
        db.commit()
        db.refresh(db_appointment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_appointment


def move_appointment_to_queue(
    db: Session,
    appointment_id: int,
):
    db_appointment = get_appointment(
        db,
        appointment_id,
    )

    if db_appointment is None:
        return None

    if db_appointment.status != "Checked-in":
        raise ValueError(
            "Only checked-in appointments can be moved to the queue."
        )

    db_appointment.status = "In Queue"

    try:
        db.commit()
        db.refresh(db_appointment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_appointment


def complete_appointment(
    db: Session,
    appointment_id: int,
):
    db_appointment = get_appointment(
        db,
        appointment_id,
    )

    if db_appointment is None:
        return None

    if db_appointment.status != "In Queue":
        raise ValueError(
            "Only appointments in queue can be completed."
        )

    db_appointment.status = "Completed"

    try:
        db.commit()
        db.refresh(db_appointment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_appointment


def cancel_appointment(
    db: Session,
    appointment_id: int,
):
    db_appointment = get_appointment(
        db,
        appointment_id,
    )

    if db_appointment is None:
        return None

    if db_appointment.status in {
        "Completed",
        "Cancelled",
        "No-show",
    }:
        raise ValueError(
            "This appointment cannot be cancelled."
        )

    db_appointment.status = "Cancelled"
    db_appointment.cancelled_at = datetime.now(
        timezone.utc
    )

    try:
        db.commit()
        db.refresh(db_appointment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_appointment


def mark_appointment_no_show(
    db: Session,
    appointment_id: int,
):
    db_appointment = get_appointment(
        db,
        appointment_id,
    )

    if db_appointment is None:
        return None

    if db_appointment.status != "Scheduled":
        raise ValueError(
            "Only scheduled appointments can be marked as no-show."
        )

    db_appointment.status = "No-show"

    try:
        db.commit()
        db.refresh(db_appointment)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_appointment
# =====================================================
# PATIENT QUEUE / TRIAGE CRUD
# =====================================================
#
# Flow:
#
#     Appointment
#          ↓
#      Checked-in
#          ↓
#      Patient Queue
#          ↓
#        Called
#          ↓
#       In Triage
#          ↓
#        Ready
#          ↓
#     Doctor Workflow
#
# Queue history is preserved. Terminal states are
# represented by status instead of deletion.
# =====================================================


QUEUE_STATUSES = {
    "Waiting",
    "Called",
    "In Triage",
    "Ready",
    "Completed",
    "Cancelled",
    "No-show",
}


TRIAGE_PRIORITIES = {
    "Normal",
    "Urgent",
    "Emergency",
}


TRIAGE_STATUSES = {
    "Pending",
    "Completed",
}


def _validate_queue_status(status: str):
    if status not in QUEUE_STATUSES:
        raise ValueError(
            "Invalid queue status."
        )


def _validate_triage_priority(priority: str):
    if priority not in TRIAGE_PRIORITIES:
        raise ValueError(
            "Invalid triage priority."
        )


def _validate_triage_status(status: str):
    if status not in TRIAGE_STATUSES:
        raise ValueError(
            "Invalid triage status."
        )


def get_patient_queue(
    db: Session,
    queue_id: int,
):
    return (
        db.query(models.PatientQueue)
        .filter(
            models.PatientQueue.id == queue_id
        )
        .first()
    )


def get_patient_queue_by_appointment(
    db: Session,
    appointment_id: int,
):
    return (
        db.query(models.PatientQueue)
        .filter(
            models.PatientQueue.appointment_id
            == appointment_id
        )
        .first()
    )


def get_patient_queues(
    db: Session,
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    triage_status: Optional[str] = None,
    triage_priority: Optional[str] = None,
):
    query = db.query(models.PatientQueue)

    if department_id is not None:
        query = query.filter(
            models.PatientQueue.department_id
            == department_id
        )

    if status is not None:
        _validate_queue_status(status)
        query = query.filter(
            models.PatientQueue.status == status
        )

    if triage_status is not None:
        _validate_triage_status(triage_status)
        query = query.filter(
            models.PatientQueue.triage_status
            == triage_status
        )

    if triage_priority is not None:
        _validate_triage_priority(triage_priority)
        query = query.filter(
            models.PatientQueue.triage_priority
            == triage_priority
        )

    return (
        query
        .order_by(
            models.PatientQueue.queue_number.asc(),
            models.PatientQueue.queued_at.asc(),
            models.PatientQueue.id.asc(),
        )
        .all()
    )


def get_patient_queues_for_patient(
    db: Session,
    patient_id: int,
):
    patient = get_patient(
        db,
        patient_id,
    )

    if patient is None:
        raise ValueError(
            "Patient not found."
        )

    return (
        db.query(models.PatientQueue)
        .filter(
            models.PatientQueue.patient_id
            == patient_id
        )
        .order_by(
            models.PatientQueue.queued_at.desc(),
            models.PatientQueue.id.desc(),
        )
        .all()
    )


def _validate_queue_appointment(
    db: Session,
    appointment_id: int,
):
    appointment = get_appointment(
        db,
        appointment_id,
    )

    if appointment is None:
        raise ValueError(
            "Appointment not found."
        )

    if appointment.status != "Checked-in":
        raise ValueError(
            "Only checked-in appointments can be added to the queue."
        )

    existing_queue = get_patient_queue_by_appointment(
        db,
        appointment_id,
    )

    if existing_queue is not None:
        return "duplicate"

    return appointment


def _get_next_queue_number(
    db: Session,
    department_id: int,
):
    now = datetime.now(timezone.utc)
    start = _start_of_day(now)
    end = _end_of_day(now)

    current_max = (
        db.query(
            models.PatientQueue.queue_number
        )
        .filter(
            models.PatientQueue.department_id
            == department_id,
            models.PatientQueue.queued_at >= start,
            models.PatientQueue.queued_at <= end,
        )
        .order_by(
            models.PatientQueue.queue_number.desc()
        )
        .first()
    )

    if current_max is None:
        return 1

    return int(current_max[0]) + 1


def create_patient_queue(
    db: Session,
    queue_data: schemas.PatientQueueCreate,
):
    appointment = _validate_queue_appointment(
        db,
        queue_data.appointment_id,
    )

    if appointment == "duplicate":
        return "duplicate"

    patient = get_patient(
        db,
        appointment.patient_id,
    )

    if patient is None:
        raise ValueError(
            "Patient not found."
        )

    department = get_department(
        db,
        appointment.department_id,
    )

    if department is None:
        raise ValueError(
            "Department not found."
        )

    if not department.is_active:
        raise ValueError(
            "Selected department is inactive."
        )

    queue_number = _get_next_queue_number(
        db,
        appointment.department_id,
    )

    db_queue = models.PatientQueue(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        department_id=appointment.department_id,
        queue_number=queue_number,
        status="Waiting",
        triage_priority="Normal",
        triage_status="Pending",
        triage_notes=None,
        triaged_by=None,
        triaged_at=None,
        called_at=None,
        completed_at=None,
        cancelled_at=None,
    )

    # Keep Appointment and Queue synchronized.
    appointment.status = "In Queue"

    db.add(db_queue)

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue


def update_patient_queue(
    db: Session,
    queue_id: int,
    queue_data: schemas.PatientQueueUpdate,
):
    db_queue = get_patient_queue(
        db,
        queue_id,
    )

    if db_queue is None:
        return None

    if db_queue.status in {
        "Completed",
        "Cancelled",
        "No-show",
    }:
        raise ValueError(
            "Completed, cancelled, or no-show queue entries cannot be modified."
        )

    update_data = queue_data.model_dump(
        exclude_unset=True
    )

    if "status" in update_data:
        _validate_queue_status(
            update_data["status"]
        )

        if update_data["status"] != db_queue.status:
            raise ValueError(
                "Use the dedicated queue lifecycle action for status changes."
            )

        update_data.pop(
            "status",
            None,
        )

    if "triage_priority" in update_data:
        _validate_triage_priority(
            update_data["triage_priority"]
        )

    if "triage_status" in update_data:
        _validate_triage_status(
            update_data["triage_status"]
        )

    for field, value in update_data.items():
        setattr(
            db_queue,
            field,
            value,
        )

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue


def call_patient_queue(
    db: Session,
    queue_id: int,
):
    db_queue = get_patient_queue(
        db,
        queue_id,
    )

    if db_queue is None:
        return None

    if db_queue.status != "Waiting":
        raise ValueError(
            "Only waiting patients can be called."
        )

    db_queue.status = "Called"
    db_queue.called_at = datetime.now(
        timezone.utc
    )

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue


def start_patient_triage(
    db: Session,
    queue_id: int,
    nurse_id: int,
):
    db_queue = get_patient_queue(
        db,
        queue_id,
    )

    if db_queue is None:
        return None

    if db_queue.status != "Called":
        raise ValueError(
            "Only called patients can enter triage."
        )

    nurse = get_user_by_id(
        db,
        nurse_id,
    )

    if nurse is None:
        return "nurse_not_found"

    if nurse.role != "Nurse":
        return "invalid_nurse_role"

    if nurse.is_active != "true":
        return "nurse_inactive"

    db_queue.status = "In Triage"
    db_queue.triaged_by = nurse_id

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue


def complete_patient_triage(
    db: Session,
    queue_id: int,
    nurse_id: int,
    triage_priority: str,
    triage_notes: Optional[str] = None,
):
    db_queue = get_patient_queue(
        db,
        queue_id,
    )

    if db_queue is None:
        return None

    if db_queue.status != "In Triage":
        raise ValueError(
            "Only patients currently in triage can complete triage."
        )

    _validate_triage_priority(
        triage_priority
    )

    nurse = get_user_by_id(
        db,
        nurse_id,
    )

    if nurse is None:
        return "nurse_not_found"

    if nurse.role != "Nurse":
        return "invalid_nurse_role"

    if nurse.is_active != "true":
        return "nurse_inactive"

    if (
        db_queue.triaged_by is not None
        and db_queue.triaged_by != nurse_id
    ):
        return "triage_owner_mismatch"

    db_queue.triage_priority = triage_priority
    db_queue.triage_status = "Completed"
    db_queue.triage_notes = (
        triage_notes.strip()
        if triage_notes
        else None
    )
    db_queue.triaged_by = nurse_id
    db_queue.triaged_at = datetime.now(
        timezone.utc
    )
    db_queue.status = "Ready"

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue


def mark_patient_queue_ready(
    db: Session,
    queue_id: int,
):
    db_queue = get_patient_queue(
        db,
        queue_id,
    )

    if db_queue is None:
        return None

    if db_queue.status != "In Triage":
        raise ValueError(
            "Only patients in triage can be marked ready."
        )

    if db_queue.triage_status != "Completed":
        raise ValueError(
            "Triage must be completed before the patient is ready."
        )

    db_queue.status = "Ready"

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue


def complete_patient_queue(
    db: Session,
    queue_id: int,
):
    db_queue = get_patient_queue(
        db,
        queue_id,
    )

    if db_queue is None:
        return None

    if db_queue.status != "Ready":
        raise ValueError(
            "Only ready patients can be completed from the queue."
        )

    db_queue.status = "Completed"
    db_queue.completed_at = datetime.now(
        timezone.utc
    )

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue


def cancel_patient_queue(
    db: Session,
    queue_id: int,
):
    db_queue = get_patient_queue(
        db,
        queue_id,
    )

    if db_queue is None:
        return None

    if db_queue.status in {
        "Completed",
        "Cancelled",
        "No-show",
    }:
        raise ValueError(
            "This queue entry cannot be cancelled."
        )

    db_queue.status = "Cancelled"
    db_queue.cancelled_at = datetime.now(
        timezone.utc
    )

    appointment = get_appointment(
        db,
        db_queue.appointment_id,
    )

    if appointment is not None and appointment.status not in {
        "Completed",
        "Cancelled",
        "No-show",
    }:
        appointment.status = "Cancelled"
        appointment.cancelled_at = datetime.now(
            timezone.utc
        )

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue


def mark_patient_queue_no_show(
    db: Session,
    queue_id: int,
):
    db_queue = get_patient_queue(
        db,
        queue_id,
    )

    if db_queue is None:
        return None

    if db_queue.status not in {
        "Waiting",
        "Called",
    }:
        raise ValueError(
            "Only waiting or called patients can be marked as no-show."
        )

    db_queue.status = "No-show"

    appointment = get_appointment(
        db,
        db_queue.appointment_id,
    )

    if appointment is not None:
        appointment.status = "No-show"

    try:
        db.commit()
        db.refresh(db_queue)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_queue



# =====================================================
# LAB MANAGEMENT CRUD
# =====================================================
#
# Lab workflow:
#
#     Clinical Encounter
#            ↓
#        Lab Order
#            ↓
#      Lab Order Items
#            ↓
#      Sample Pending
#            ↓
#         Collected
#            ↓
#        Processing
#            ↓
#      Result Entered
#            ↓
#    Technical Validation
#            ↓
#       Doctor Review
#            ↓
#         Finalized
#
# Important:
#
# - Lab is a separate clinical subsystem.
# - Lab does NOT modify ClinicalEncounter.
# - The authenticated doctor is the source of identity
#   when creating / reviewing laboratory data.
# - Patient ↔ Encounter consistency is always checked.
# - Finalized results are protected from modification.
#
# =====================================================


# =====================================================
# LAB CONSTANTS
# =====================================================


LAB_ORDER_STATUSES = {
    "ORDERED",
    "SAMPLE_PENDING",
    "COLLECTED",
    "PROCESSING",
    "RESULT_ENTERED",
    "TECHNICALLY_VALIDATED",
    "DOCTOR_REVIEW",
    "FINALIZED",
    "CANCELLED",
    "REJECTED",
}


LAB_ORDER_PRIORITIES = {
    "Routine",
    "Urgent",
    "STAT",
}


LAB_SAMPLE_STATUSES = {
    "Pending",
    "Collected",
    "Received",
    "Rejected",
    "Processed",
}


LAB_RESULT_STATUSES = {
    "RESULT_ENTERED",
    "TECHNICALLY_VALIDATED",
    "DOCTOR_REVIEW",
    "FINALIZED",
}


LAB_RESULT_TYPES = {
    "Numeric",
    "Text",
    "Positive/Negative",
    "Qualitative",
}


# =====================================================
# LAB HELPER VALIDATORS
# =====================================================


def _validate_lab_order_priority(
    priority: str,
):
    if priority not in LAB_ORDER_PRIORITIES:
        raise ValueError(
            "Invalid laboratory order priority."
        )


def _validate_lab_order_status(
    status: str,
):
    if status not in LAB_ORDER_STATUSES:
        raise ValueError(
            "Invalid laboratory order status."
        )


def _validate_lab_sample_status(
    status: str,
):
    if status not in LAB_SAMPLE_STATUSES:
        raise ValueError(
            "Invalid laboratory sample status."
        )


def _validate_lab_result_status(
    status: str,
):
    if status not in LAB_RESULT_STATUSES:
        raise ValueError(
            "Invalid laboratory result status."
        )


# =====================================================
# LAB USER VALIDATION
# =====================================================


def _validate_lab_doctor(
    db: Session,
    doctor_id: int,
):
    """
    Validate the doctor responsible for a laboratory
    order or doctor review.
    """

    doctor = (
        db.query(models.User)
        .filter(
            models.User.id == doctor_id
        )
        .first()
    )

    if doctor is None:
        raise ValueError(
            "Doctor not found."
        )

    if doctor.role != "Doctor":
        raise ValueError(
            "Selected user is not a Doctor."
        )

    if doctor.is_active != "true":
        raise ValueError(
            "Selected Doctor is inactive."
        )

    return doctor


def _validate_lab_staff(
    db: Session,
    user_id: int,
):
    """
    Validate an active staff account for laboratory
    operational actions.

    We intentionally do NOT require a new
    'Lab Technician' role yet because the current
    User role system does not contain that role.
    """

    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id
        )
        .first()
    )

    if user is None:
        raise ValueError(
            "Staff member not found."
        )

    if user.is_active != "true":
        raise ValueError(
            "Staff account is inactive."
        )

    if user.role not in {
        "Administrator",
        "Doctor",
        "Nurse",
        "Receptionist",
        "Housekeeper",
    }:
        raise ValueError(
            "User is not an authorized hospital staff member."
        )

    return user


# =====================================================
# LAB TEST CATALOG
# =====================================================


def get_lab_test(
    db: Session,
    lab_test_id: int,
):
    return (
        db.query(models.LabTest)
        .filter(
            models.LabTest.id
            == lab_test_id
        )
        .first()
    )


def get_lab_test_by_code(
    db: Session,
    code: str,
):
    if not code:
        return None

    return (
        db.query(models.LabTest)
        .filter(
            models.LabTest.code
            == code.strip()
        )
        .first()
    )


def get_lab_tests(
    db: Session,
    active_only: bool = False,
):
    query = db.query(
        models.LabTest
    )

    if active_only:
        query = query.filter(
            models.LabTest.is_active == True
        )

    return (
        query
        .order_by(
            models.LabTest.category.asc(),
            models.LabTest.name.asc(),
        )
        .all()
    )


def create_lab_test(
    db: Session,
    lab_test: schemas.LabTestCreate,
):
    """
    Create a laboratory test in the master catalog.
    """

    code = lab_test.code.strip()
    name = lab_test.name.strip()

    existing_code = get_lab_test_by_code(
        db,
        code,
    )

    if existing_code:
        return "code_exists"

    db_lab_test = models.LabTest(
        code=code,
        name=name,
        category=lab_test.category.strip(),
        specimen_type=lab_test.specimen_type.strip(),
        result_type=lab_test.result_type,
        unit=(
            lab_test.unit.strip()
            if lab_test.unit
            else None
        ),
        reference_range_text=(
            lab_test.reference_range_text.strip()
            if lab_test.reference_range_text
            else None
        ),
        reference_min=lab_test.reference_min,
        reference_max=lab_test.reference_max,
        is_active=lab_test.is_active,
        description=(
            lab_test.description.strip()
            if lab_test.description
            else None
        ),
    )

    db.add(db_lab_test)

    try:
        db.commit()
        db.refresh(db_lab_test)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_lab_test


def update_lab_test(
    db: Session,
    lab_test_id: int,
    lab_test: schemas.LabTestUpdate,
):
    """
    Update laboratory catalog metadata.

    Existing patient results are not modified.
    """

    db_lab_test = get_lab_test(
        db,
        lab_test_id,
    )

    if not db_lab_test:
        return None

    update_data = lab_test.model_dump(
        exclude_unset=True
    )

    if "code" in update_data:

        code = (
            update_data["code"].strip()
            if update_data["code"]
            else ""
        )

        if not code:
            return "code_required"

        existing = (
            db.query(models.LabTest)
            .filter(
                models.LabTest.code == code,
                models.LabTest.id != lab_test_id,
            )
            .first()
        )

        if existing:
            return "code_exists"

        update_data["code"] = code

    for field in {
        "name",
        "category",
        "specimen_type",
        "unit",
        "reference_range_text",
        "description",
    }:

        if (
            field in update_data
            and update_data[field] is not None
        ):
            update_data[field] = (
                update_data[field].strip()
            )

    if (
        "reference_min" in update_data
        and "reference_max" in update_data
    ):

        minimum = update_data["reference_min"]
        maximum = update_data["reference_max"]

        if (
            minimum is not None
            and maximum is not None
            and minimum > maximum
        ):
            return "invalid_reference_range"

    for field, value in update_data.items():
        setattr(
            db_lab_test,
            field,
            value,
        )

    try:
        db.commit()
        db.refresh(db_lab_test)

    except IntegrityError:
        db.rollback()
        return "duplicate"

    return db_lab_test


# =====================================================
# LAB ORDER
# =====================================================


def get_lab_order(
    db: Session,
    lab_order_id: int,
):
    return (
        db.query(models.LabOrder)
        .filter(
            models.LabOrder.id
            == lab_order_id
        )
        .first()
    )


def get_lab_orders(
    db: Session,
    patient_id: Optional[int] = None,
    encounter_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    status: Optional[str] = None,
):
    query = db.query(
        models.LabOrder
    )

    if patient_id is not None:
        query = query.filter(
            models.LabOrder.patient_id
            == patient_id
        )

    if encounter_id is not None:
        query = query.filter(
            models.LabOrder.encounter_id
            == encounter_id
        )

    if doctor_id is not None:
        query = query.filter(
            models.LabOrder.ordered_by_id
            == doctor_id
        )

    if status is not None:
        _validate_lab_order_status(
            status
        )

        query = query.filter(
            models.LabOrder.status
            == status
        )

    return (
        query
        .order_by(
            models.LabOrder.ordered_at.desc(),
            models.LabOrder.id.desc(),
        )
        .all()
    )


def get_lab_orders_for_patient(
    db: Session,
    patient_id: int,
):
    return get_lab_orders(
        db=db,
        patient_id=patient_id,
    )


def get_lab_orders_for_encounter(
    db: Session,
    encounter_id: int,
):
    return get_lab_orders(
        db=db,
        encounter_id=encounter_id,
    )


def get_lab_orders_for_doctor(
    db: Session,
    doctor_id: int,
):
    return get_lab_orders(
        db=db,
        doctor_id=doctor_id,
    )


# =====================================================
# VALIDATE LAB ORDER TARGET
# =====================================================


def _validate_lab_order_target(
    db: Session,
    patient_id: int,
    encounter_id: int,
    doctor_id: int,
):
    """
    Validate:

        Patient exists
        Encounter exists
        Encounter belongs to Patient
        Doctor exists and is active
        Encounter belongs to Doctor
    """

    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id
            == patient_id
        )
        .first()
    )

    if patient is None:
        raise ValueError(
            "Patient not found."
        )

    encounter = (
        db.query(models.ClinicalEncounter)
        .filter(
            models.ClinicalEncounter.id
            == encounter_id
        )
        .first()
    )

    if encounter is None:
        raise ValueError(
            "Clinical encounter not found."
        )

    if encounter.patient_id != patient_id:
        raise ValueError(
            "Clinical encounter does not belong to the selected patient."
        )

    doctor = _validate_lab_doctor(
        db,
        doctor_id,
    )

    if encounter.doctor_id != doctor_id:
        raise ValueError(
            "Laboratory order must be created by the doctor assigned to the clinical encounter."
        )

    if encounter.status == "Cancelled":
        raise ValueError(
            "Laboratory orders cannot be created for a cancelled clinical encounter."
        )

    return {
        "patient": patient,
        "encounter": encounter,
        "doctor": doctor,
    }


# =====================================================
# VALIDATE LAB TESTS FOR ORDER
# =====================================================


def _validate_lab_order_items(
    db: Session,
    items,
):
    """
    Validate all requested laboratory tests before
    creating the order.

    Only active tests may be ordered.
    """

    if not items:
        raise ValueError(
            "At least one laboratory test is required."
        )

    test_ids = [
        item.lab_test_id
        for item in items
    ]

    if len(test_ids) != len(set(test_ids)):
        raise ValueError(
            "Duplicate laboratory tests are not allowed in one order."
        )

    lab_tests = []

    for test_id in test_ids:

        lab_test = get_lab_test(
            db,
            test_id,
        )

        if lab_test is None:
            raise ValueError(
                f"Laboratory test {test_id} not found."
            )

        if not lab_test.is_active:
            raise ValueError(
                f"Laboratory test '{lab_test.name}' is inactive."
            )

        lab_tests.append(
            lab_test
        )

    return lab_tests


# =====================================================
# CREATE LAB ORDER
# =====================================================


def create_lab_order(
    db: Session,
    order: schemas.LabOrderCreate,
    doctor_id: int,
):
    """
    Create a laboratory order from a clinical encounter.

    The authenticated doctor is always used as the
    ordering doctor.

    The frontend cannot choose ordered_by_id.
    """

    validation = _validate_lab_order_target(
        db=db,
        patient_id=order.patient_id,
        encounter_id=order.encounter_id,
        doctor_id=doctor_id,
    )

    _validate_lab_order_priority(
        order.priority
    )

    lab_tests = _validate_lab_order_items(
        db,
        order.items,
    )

    db_order = models.LabOrder(
        patient_id=order.patient_id,
        encounter_id=order.encounter_id,
        ordered_by_id=doctor_id,
        priority=order.priority,
        status="ORDERED",
        clinical_indication=(
            order.clinical_indication.strip()
            if order.clinical_indication
            else None
        ),
        notes=(
            order.notes.strip()
            if order.notes
            else None
        ),
    )

    db.add(db_order)

    try:

        db.flush()

        for index, item in enumerate(
            order.items
        ):

            db_item = models.LabOrderItem(
                lab_order_id=db_order.id,
                lab_test_id=lab_tests[index].id,
                status="ORDERED",
                notes=(
                    item.notes.strip()
                    if item.notes
                    else None
                ),
            )

            db.add(db_item)

        db.commit()

        db.refresh(
            db_order
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_order


# =====================================================
# UPDATE LAB ORDER
# =====================================================


def update_lab_order(
    db: Session,
    lab_order_id: int,
    order: schemas.LabOrderUpdate,
    updated_by_id: int,
):
    """
    Update laboratory order metadata.

    Finalized, cancelled and rejected orders are
    protected.
    """

    db_order = get_lab_order(
        db,
        lab_order_id,
    )

    if db_order is None:
        return None

    if db_order.status == "FINALIZED":
        return "order_finalized"

    if db_order.status == "CANCELLED":
        return "order_cancelled"

    if db_order.status == "REJECTED":
        return "order_rejected"

    doctor = _validate_lab_doctor(
        db,
        updated_by_id,
    )

    if db_order.ordered_by_id != doctor.id:
        return "not_ordering_doctor"

    update_data = order.model_dump(
        exclude_unset=True
    )

    if "priority" in update_data:
        _validate_lab_order_priority(
            update_data["priority"]
        )

    if (
        "clinical_indication"
        in update_data
        and update_data["clinical_indication"]
    ):
        update_data["clinical_indication"] = (
            update_data[
                "clinical_indication"
            ].strip()
        )

    if (
        "notes" in update_data
        and update_data["notes"]
    ):
        update_data["notes"] = (
            update_data["notes"].strip()
        )

    for field, value in update_data.items():
        setattr(
            db_order,
            field,
            value,
        )

    try:

        db.commit()

        db.refresh(
            db_order
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_order


# =====================================================
# LAB ORDER ITEM
# =====================================================


def get_lab_order_item(
    db: Session,
    order_item_id: int,
):
    return (
        db.query(models.LabOrderItem)
        .filter(
            models.LabOrderItem.id
            == order_item_id
        )
        .first()
    )


def get_lab_order_items(
    db: Session,
    lab_order_id: int,
):
    return (
        db.query(models.LabOrderItem)
        .filter(
            models.LabOrderItem.lab_order_id
            == lab_order_id
        )
        .order_by(
            models.LabOrderItem.id.asc()
        )
        .all()
    )


# =====================================================
# LAB SAMPLE
# =====================================================


def get_lab_sample(
    db: Session,
    sample_id: int,
):
    return (
        db.query(models.LabSample)
        .filter(
            models.LabSample.id
            == sample_id
        )
        .first()
    )


def get_lab_samples_for_order(
    db: Session,
    lab_order_id: int,
):
    return (
        db.query(models.LabSample)
        .filter(
            models.LabSample.lab_order_id
            == lab_order_id
        )
        .order_by(
            models.LabSample.created_at.asc(),
            models.LabSample.id.asc(),
        )
        .all()
    )


def _generate_lab_sample_code(
    db: Session,
):
    """
    Generate a unique human-readable sample code.

    Example:
        LAB-20260923-000001
    """

    today = datetime.now(
        timezone.utc
    ).strftime("%Y%m%d")

    prefix = f"LAB-{today}-"

    existing_samples = (
        db.query(
            models.LabSample.sample_code
        )
        .filter(
            models.LabSample.sample_code.like(
                f"{prefix}%"
            )
        )
        .all()
    )

    highest_number = 0

    for row in existing_samples:

        sample_code = row[0]

        if not sample_code:
            continue

        try:

            number = int(
                sample_code.split("-")[-1]
            )

            highest_number = max(
                highest_number,
                number,
            )

        except (
            ValueError,
            IndexError,
        ):
            continue

    return (
        f"{prefix}{highest_number + 1:06d}"
    )


# =====================================================
# CREATE LAB SAMPLE
# =====================================================


def create_lab_sample(
    db: Session,
    lab_order_id: int,
    sample: schemas.LabSampleCreate,
    created_by_id: int,
):
    """
    Register a sample for an existing laboratory order.
    """

    _validate_lab_staff(
        db,
        created_by_id,
    )

    db_order = get_lab_order(
        db,
        lab_order_id,
    )

    if db_order is None:
        return None

    if db_order.status in {
        "CANCELLED",
        "REJECTED",
        "FINALIZED",
    }:
        return "order_closed"

    specimen_type = (
        sample.specimen_type.strip()
    )

    if not specimen_type:
        return "specimen_type_required"

    sample_code = _generate_lab_sample_code(
        db
    )

    db_sample = models.LabSample(
        lab_order_id=lab_order_id,
        sample_code=sample_code,
        specimen_type=specimen_type,
        status="Pending",
        notes=(
            sample.notes.strip()
            if sample.notes
            else None
        ),
    )

    db.add(db_sample)

    # Once a sample is registered, the order waits
    # for collection.
    if db_order.status == "ORDERED":
        db_order.status = "SAMPLE_PENDING"

    try:

        db.commit()

        db.refresh(
            db_sample
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_sample


# =====================================================
# COLLECT LAB SAMPLE
# =====================================================


def collect_lab_sample(
    db: Session,
    sample_id: int,
    collected_by_id: int,
    data: schemas.LabSampleCollection,
):
    """
    Mark a laboratory sample as collected.
    """

    staff = _validate_lab_staff(
        db,
        collected_by_id,
    )

    sample = get_lab_sample(
        db,
        sample_id,
    )

    if sample is None:
        return None

    if sample.status == "Rejected":
        return "sample_rejected"

    if sample.status == "Processed":
        return "sample_processed"

    if sample.status == "Collected":
        return "already_collected"

    if sample.status != "Pending":
        return "invalid_transition"

    sample.status = "Collected"

    sample.collected_by_id = staff.id

    sample.collected_at = datetime.now(
        timezone.utc
    )

    if data.notes:
        sample.notes = data.notes.strip()

    db_order = get_lab_order(
        db,
        sample.lab_order_id,
    )

    if db_order:

        if db_order.status in {
            "ORDERED",
            "SAMPLE_PENDING",
        }:
            db_order.status = "COLLECTED"

    try:

        db.commit()

        db.refresh(
            sample
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return sample


# =====================================================
# RECEIVE LAB SAMPLE
# =====================================================


def receive_lab_sample(
    db: Session,
    sample_id: int,
    received_by_id: int,
    data: schemas.LabSampleReceive,
):
    """
    Mark a collected laboratory sample as received
    by laboratory operations.
    """

    _validate_lab_staff(
        db,
        received_by_id,
    )

    sample = get_lab_sample(
        db,
        sample_id,
    )

    if sample is None:
        return None

    if sample.status == "Rejected":
        return "sample_rejected"

    if sample.status == "Processed":
        return "sample_processed"

    if sample.status != "Collected":
        return "invalid_transition"

    sample.status = "Received"

    sample.received_at = datetime.now(
        timezone.utc
    )

    if data.notes:
        sample.notes = data.notes.strip()

    db_order = get_lab_order(
        db,
        sample.lab_order_id,
    )

    if db_order:

        if db_order.status in {
            "ORDERED",
            "SAMPLE_PENDING",
            "COLLECTED",
        }:
            db_order.status = "PROCESSING"

    try:

        db.commit()

        db.refresh(
            sample
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return sample


# =====================================================
# REJECT LAB SAMPLE
# =====================================================


def reject_lab_sample(
    db: Session,
    sample_id: int,
    rejected_by_id: int,
    data: schemas.LabSampleReject,
):
    """
    Reject an unsuitable specimen while preserving
    the laboratory history.
    """

    _validate_lab_staff(
        db,
        rejected_by_id,
    )

    sample = get_lab_sample(
        db,
        sample_id,
    )

    if sample is None:
        return None

    if sample.status == "Rejected":
        return "sample_rejected"

    if sample.status == "Processed":
        return "sample_processed"

    sample.status = "Rejected"

    sample.rejection_reason = (
        data.rejection_reason.strip()
    )

    if data.notes:
        sample.notes = data.notes.strip()

    db_order = get_lab_order(
        db,
        sample.lab_order_id,
    )

    if db_order:
        db_order.status = "REJECTED"

    try:

        db.commit()

        db.refresh(
            sample
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return sample


# =====================================================
# PROCESS LAB SAMPLE
# =====================================================


def process_lab_sample(
    db: Session,
    sample_id: int,
    processed_by_id: int,
):
    """
    Mark a received sample as processed.

    The actual laboratory processing is represented
    operationally here. Instrument integration can be
    added later without changing the core workflow.
    """

    _validate_lab_staff(
        db,
        processed_by_id,
    )

    sample = get_lab_sample(
        db,
        sample_id,
    )

    if sample is None:
        return None

    if sample.status == "Rejected":
        return "sample_rejected"

    if sample.status == "Processed":
        return "already_processed"

    if sample.status != "Received":
        return "invalid_transition"

    sample.status = "Processed"

    db_order = get_lab_order(
        db,
        sample.lab_order_id,
    )

    if db_order:
        db_order.status = "PROCESSING"

    try:

        db.commit()

        db.refresh(
            sample
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return sample


# =====================================================
# LAB RESULT
# =====================================================


def get_lab_result(
    db: Session,
    result_id: int,
):
    return (
        db.query(models.LabResult)
        .filter(
            models.LabResult.id
            == result_id
        )
        .first()
    )


def get_lab_result_for_order_item(
    db: Session,
    order_item_id: int,
):
    return (
        db.query(models.LabResult)
        .filter(
            models.LabResult.lab_order_item_id
            == order_item_id
        )
        .first()
    )


# =====================================================
# RESULT VALUE VALIDATION
# =====================================================


def _validate_lab_result_values(
    lab_test,
    result,
):
    """
    Validate result data against the test definition.

    This prevents obviously incompatible result types.
    """

    result_type = lab_test.result_type

    if result_type == "Numeric":

        if result.numeric_value is None:
            return "numeric_value_required"

    elif result_type == "Text":

        if not result.text_value:
            return "text_value_required"

    elif result_type == "Positive/Negative":

        if not result.text_value:
            return "positive_negative_value_required"

        normalized = (
            result.text_value
            .strip()
            .lower()
        )

        if normalized not in {
            "positive",
            "negative",
        }:
            return "invalid_positive_negative_value"

    elif result_type == "Qualitative":

        if not result.text_value:
            return "text_value_required"

    if (
        result.reference_min is not None
        and result.reference_max is not None
        and result.reference_min
        > result.reference_max
    ):
        return "invalid_reference_range"

    return None


# =====================================================
# ENTER LAB RESULT
# =====================================================


def create_lab_result(
    db: Session,
    order_item_id: int,
    result: schemas.LabResultCreate,
    entered_by_id: int,
):
    """
    Enter a laboratory result for one order item.

    One order item can have only one active result
    record.
    """

    staff = _validate_lab_staff(
        db,
        entered_by_id,
    )

    order_item = get_lab_order_item(
        db,
        order_item_id,
    )

    if order_item is None:
        return None

    db_order = get_lab_order(
        db,
        order_item.lab_order_id,
    )

    if db_order is None:
        return "order_not_found"

    if db_order.status in {
        "CANCELLED",
        "REJECTED",
        "FINALIZED",
    }:
        return "order_closed"

    if order_item.status in {
        "FINALIZED",
        "CANCELLED",
        "REJECTED",
    }:
        return "item_closed"

    existing_result = (
        get_lab_result_for_order_item(
            db,
            order_item_id,
        )
    )

    if existing_result:
        return "result_exists"

    lab_test = get_lab_test(
        db,
        order_item.lab_test_id,
    )

    if lab_test is None:
        return "test_not_found"

    validation_error = (
        _validate_lab_result_values(
            lab_test,
            result,
        )
    )

    if validation_error:
        return validation_error

    db_result = models.LabResult(
        lab_order_item_id=order_item_id,
        status="RESULT_ENTERED",
        numeric_value=result.numeric_value,
        text_value=(
            result.text_value.strip()
            if result.text_value
            else None
        ),
        unit=(
            result.unit.strip()
            if result.unit
            else lab_test.unit
        ),
        reference_range_text=(
            result.reference_range_text.strip()
            if result.reference_range_text
            else lab_test.reference_range_text
        ),
        reference_min=(
            result.reference_min
            if result.reference_min is not None
            else lab_test.reference_min
        ),
        reference_max=(
            result.reference_max
            if result.reference_max is not None
            else lab_test.reference_max
        ),
        abnormal_flag=(
            result.abnormal_flag
        ),
        is_critical=result.is_critical,
        interpretation=(
            result.interpretation.strip()
            if result.interpretation
            else None
        ),
        result_notes=(
            result.result_notes.strip()
            if result.result_notes
            else None
        ),
        entered_by_id=staff.id,
        entered_at=datetime.now(
            timezone.utc
        ),
    )

    db.add(db_result)

    order_item.status = "RESULT_ENTERED"

    # Check whether every item has a result.
    all_items = get_lab_order_items(
        db,
        db_order.id,
    )

    all_have_results = True

    for item in all_items:

        if item.id == order_item.id:
            continue

        if not get_lab_result_for_order_item(
            db,
            item.id,
        ):
            all_have_results = False
            break

    if all_have_results:
        db_order.status = "RESULT_ENTERED"

    try:

        db.commit()

        db.refresh(
            db_result
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_result


# =====================================================
# UPDATE LAB RESULT
# =====================================================


def update_lab_result(
    db: Session,
    result_id: int,
    result: schemas.LabResultUpdate,
    updated_by_id: int,
):
    """
    Update a result before technical validation.

    Once technically validated, the result is protected.
    """

    _validate_lab_staff(
        db,
        updated_by_id,
    )

    db_result = get_lab_result(
        db,
        result_id,
    )

    if db_result is None:
        return None

    if db_result.status == "FINALIZED":
        return "result_finalized"

    if db_result.status in {
        "TECHNICALLY_VALIDATED",
        "DOCTOR_REVIEW",
    }:
        return "result_locked"

    order_item = get_lab_order_item(
        db,
        db_result.lab_order_item_id,
    )

    if order_item is None:
        return "order_item_not_found"

    lab_test = get_lab_test(
        db,
        order_item.lab_test_id,
    )

    if lab_test is None:
        return "test_not_found"

    update_data = result.model_dump(
        exclude_unset=True
    )

    numeric_value = update_data.get(
        "numeric_value",
        db_result.numeric_value,
    )

    text_value = update_data.get(
        "text_value",
        db_result.text_value,
    )

    reference_min = update_data.get(
        "reference_min",
        db_result.reference_min,
    )

    reference_max = update_data.get(
        "reference_max",
        db_result.reference_max,
    )

    # -------------------------------------------------
    # RESULT TYPE VALIDATION
    # -------------------------------------------------

    if lab_test.result_type == "Numeric":

        if numeric_value is None:
            return "numeric_value_required"

    elif lab_test.result_type in {
        "Text",
        "Positive/Negative",
        "Qualitative",
    }:

        if not text_value:
            return "text_value_required"

    if (
        lab_test.result_type
        == "Positive/Negative"
        and text_value
    ):

        normalized = (
            text_value.strip().lower()
        )

        if normalized not in {
            "positive",
            "negative",
        }:
            return "invalid_positive_negative_value"

    if (
        reference_min is not None
        and reference_max is not None
        and reference_min > reference_max
    ):
        return "invalid_reference_range"

    for field, value in update_data.items():

        if (
            isinstance(value, str)
            and value
        ):
            value = value.strip()

        setattr(
            db_result,
            field,
            value,
        )

    try:

        db.commit()

        db.refresh(
            db_result
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_result


# =====================================================
# TECHNICAL VALIDATION
# =====================================================


def validate_lab_result(
    db: Session,
    result_id: int,
    validated_by_id: int,
    data: schemas.LabResultValidation,
):
    """
    Technically validate a laboratory result.

    This is intentionally separate from doctor review.
    """

    _validate_lab_staff(
        db,
        validated_by_id,
    )

    db_result = get_lab_result(
        db,
        result_id,
    )

    if db_result is None:
        return None

    if db_result.status == "FINALIZED":
        return "result_finalized"

    if db_result.status == "TECHNICALLY_VALIDATED":
        return "already_validated"

    if db_result.status != "RESULT_ENTERED":
        return "invalid_transition"

    db_result.status = (
        "TECHNICALLY_VALIDATED"
    )

    db_result.validated_by_id = (
        validated_by_id
    )

    db_result.validated_at = (
        datetime.now(timezone.utc)
    )

    if data.validation_notes:
        db_result.validation_notes = (
            data.validation_notes.strip()
        )

    order_item = get_lab_order_item(
        db,
        db_result.lab_order_item_id,
    )

    if order_item:
        order_item.status = (
            "TECHNICALLY_VALIDATED"
        )

        db_order = get_lab_order(
            db,
            order_item.lab_order_id,
        )

        if db_order:

            all_items = get_lab_order_items(
                db,
                db_order.id,
            )

            all_validated = True

            for item in all_items:

                item_result = (
                    get_lab_result_for_order_item(
                        db,
                        item.id,
                    )
                )

                if (
                    item_result is None
                    or item_result.status
                    != "TECHNICALLY_VALIDATED"
                ):
                    all_validated = False
                    break

            if all_validated:
                db_order.status = (
                    "TECHNICALLY_VALIDATED"
                )

    try:

        db.commit()

        db.refresh(
            db_result
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_result


# =====================================================
# DOCTOR REVIEW
# =====================================================


def review_lab_result(
    db: Session,
    result_id: int,
    doctor_id: int,
    data: schemas.LabResultDoctorReview,
):
    """
    Doctor reviews a technically validated result.

    Only the doctor responsible for the original
    clinical encounter can perform the review.
    """

    doctor = _validate_lab_doctor(
        db,
        doctor_id,
    )

    db_result = get_lab_result(
        db,
        result_id,
    )

    if db_result is None:
        return None

    if db_result.status == "FINALIZED":
        return "result_finalized"

    if db_result.status == "DOCTOR_REVIEW":
        return "already_reviewed"

    if db_result.status != "TECHNICALLY_VALIDATED":
        return "invalid_transition"

    order_item = get_lab_order_item(
        db,
        db_result.lab_order_item_id,
    )

    if order_item is None:
        return "order_item_not_found"

    db_order = get_lab_order(
        db,
        order_item.lab_order_id,
    )

    if db_order is None:
        return "order_not_found"

    if db_order.ordered_by_id != doctor.id:
        return "not_ordering_doctor"

    encounter = (
        db.query(
            models.ClinicalEncounter
        )
        .filter(
            models.ClinicalEncounter.id
            == db_order.encounter_id
        )
        .first()
    )

    if encounter is None:
        return "encounter_not_found"

    if encounter.doctor_id != doctor.id:
        return "not_encounter_doctor"

    db_result.status = "DOCTOR_REVIEW"

    db_result.reviewed_by_id = (
        doctor.id
    )

    db_result.reviewed_at = (
        datetime.now(timezone.utc)
    )

    if data.review_notes:
        db_result.review_notes = (
            data.review_notes.strip()
        )

    order_item.status = "DOCTOR_REVIEW"

    try:

        db.commit()

        db.refresh(
            db_result
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_result


# =====================================================
# FINALIZE LAB RESULT
# =====================================================


def finalize_lab_result(
    db: Session,
    result_id: int,
    doctor_id: int,
    data: schemas.LabResultFinalize,
):
    """
    Finalize a laboratory result.

    Finalization is the final clinical state.

    After finalization:
        - result cannot be edited
        - order item becomes FINALIZED
        - order becomes FINALIZED when all items
          are finalized
    """

    doctor = _validate_lab_doctor(
        db,
        doctor_id,
    )

    db_result = get_lab_result(
        db,
        result_id,
    )

    if db_result is None:
        return None

    if db_result.status == "FINALIZED":
        return "result_finalized"

    if db_result.status != "DOCTOR_REVIEW":
        return "invalid_transition"

    order_item = get_lab_order_item(
        db,
        db_result.lab_order_item_id,
    )

    if order_item is None:
        return "order_item_not_found"

    db_order = get_lab_order(
        db,
        order_item.lab_order_id,
    )

    if db_order is None:
        return "order_not_found"

    if db_order.ordered_by_id != doctor.id:
        return "not_ordering_doctor"

    db_result.status = "FINALIZED"

    db_result.finalized_at = (
        datetime.now(timezone.utc)
    )

    if data.review_notes:
        db_result.review_notes = (
            data.review_notes.strip()
        )

    order_item.status = "FINALIZED"

    # -------------------------------------------------
    # CHECK WHETHER ALL ORDER ITEMS ARE FINALIZED
    # -------------------------------------------------

    all_items = get_lab_order_items(
        db,
        db_order.id,
    )

    all_finalized = True

    for item in all_items:

        if item.id == order_item.id:
            continue

        item_result = (
            get_lab_result_for_order_item(
                db,
                item.id,
            )
        )

        if (
            item_result is None
            or item_result.status
            != "FINALIZED"
        ):
            all_finalized = False
            break

    if all_finalized:

        db_order.status = "FINALIZED"

        db_order.finalized_at = (
            datetime.now(timezone.utc)
        )

    try:

        db.commit()

        db.refresh(
            db_result
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_result


# =====================================================
# CANCEL LAB ORDER
# =====================================================


def cancel_lab_order(
    db: Session,
    lab_order_id: int,
    cancelled_by_id: int,
):
    """
    Cancel a laboratory order while preserving its
    historical record.
    """

    doctor = _validate_lab_doctor(
        db,
        cancelled_by_id,
    )

    db_order = get_lab_order(
        db,
        lab_order_id,
    )

    if db_order is None:
        return None

    if db_order.ordered_by_id != doctor.id:
        return "not_ordering_doctor"

    if db_order.status == "FINALIZED":
        return "order_finalized"

    if db_order.status == "CANCELLED":
        return "order_cancelled"

    db_order.status = "CANCELLED"

    db_order.cancelled_at = (
        datetime.now(timezone.utc)
    )

    # Preserve child history but mark unfinished
    # order items as cancelled.
    items = get_lab_order_items(
        db,
        db_order.id,
    )

    for item in items:

        if item.status not in {
            "FINALIZED",
            "CANCELLED",
            "REJECTED",
        }:
            item.status = "CANCELLED"

    try:

        db.commit()

        db.refresh(
            db_order
        )

    except IntegrityError:

        db.rollback()

        return "duplicate"

    return db_order


# =====================================================
# PATIENT LAB HISTORY
# =====================================================


def get_patient_lab_history(
    db: Session,
    patient_id: int,
):
    """
    Return all laboratory orders associated with a
    patient, newest first.
    """

    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id
            == patient_id
        )
        .first()
    )

    if patient is None:
        return None

    return (
        db.query(models.LabOrder)
        .filter(
            models.LabOrder.patient_id
            == patient_id
        )
        .order_by(
            models.LabOrder.ordered_at.desc(),
            models.LabOrder.id.desc(),
        )
        .all()
    )


# =====================================================
# LAB RESULTS FOR PATIENT
# =====================================================


def get_patient_lab_results(
    db: Session,
    patient_id: int,
):
    """
    Return finalized / reviewed laboratory results
    belonging to a patient.

    Results remain linked through:

        Patient
          ↓
        LabOrder
          ↓
        LabOrderItem
          ↓
        LabResult
    """

    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id
            == patient_id
        )
        .first()
    )

    if patient is None:
        return None

    return (
        db.query(models.LabResult)
        .join(
            models.LabOrderItem,
            models.LabOrderItem.id
            == models.LabResult.lab_order_item_id,
        )
        .join(
            models.LabOrder,
            models.LabOrder.id
            == models.LabOrderItem.lab_order_id,
        )
        .filter(
            models.LabOrder.patient_id
            == patient_id,
        )
        .filter(
            models.LabResult.status
            == "FINALIZED",
        )
        .order_by(
            models.LabResult.finalized_at.desc(),
            models.LabResult.id.desc(),
        )
        .all()
    )
    
# =====================================================
# PRESCRIPTION CRUD
# =====================================================


PRESCRIPTION_ACTIVE_STATUSES = {
    "DRAFT",
    "ACTIVE",
    "COMPLETED",
    "DISCONTINUED",
    "CANCELLED",
}


# =====================================================
# PRESCRIPTION HELPERS
# =====================================================


def _prescription_query(db: Session):
    """
    Build the standard prescription query with eager loading.

    A prescription response needs its patient name, doctor name,
    and medication items. Loading these relationships up front
    prevents N+1 queries when prescription lists are serialized.
    """
    return (
        db.query(models.Prescription)
        .options(
            joinedload(models.Prescription.patient),
            joinedload(models.Prescription.prescribed_by),
            selectinload(models.Prescription.items),
        )
    )


def get_prescription(
    db: Session,
    prescription_id: int,
):
    return (
        _prescription_query(db)
        .filter(
            models.Prescription.id
            == prescription_id
        )
        .first()
    )


def get_prescription_item(
    db: Session,
    item_id: int,
):
    return (
        db.query(models.PrescriptionItem)
        .filter(
            models.PrescriptionItem.id
            == item_id
        )
        .first()
    )


def get_prescriptions_for_patient(
    db: Session,
    patient_id: int,
):
    return (
        _prescription_query(db)
        .filter(
            models.Prescription.patient_id
            == patient_id
        )
        .order_by(
            models.Prescription.prescribed_at.desc()
        )
        .all()
    )


def get_prescriptions_for_encounter(
    db: Session,
    encounter_id: int,
):
    return (
        _prescription_query(db)
        .filter(
            models.Prescription.encounter_id
            == encounter_id
        )
        .order_by(
            models.Prescription.prescribed_at.desc()
        )
        .all()
    )


def get_prescriptions_for_doctor(
    db: Session,
    doctor_id: int,
):
    return (
        _prescription_query(db)
        .filter(
            models.Prescription.prescribed_by_id
            == prescribed_by_id
        )
        .order_by(
            models.Prescription.prescribed_at.desc()
        )
        .all()
    )


def _validate_prescription_doctor(
    db: Session,
    doctor_id: int,
):
    doctor = (
        db.query(models.User)
        .filter(
            models.User.id == doctor_id
        )
        .first()
    )

    if doctor is None:
        raise ValueError(
            "Doctor not found."
        )

    if doctor.role != "Doctor":
        raise ValueError(
            "Selected user is not a Doctor."
        )

    if doctor.is_active != "true":
        raise ValueError(
            "Selected Doctor is inactive."
        )

    return doctor


def _validate_prescription_patient(
    db: Session,
    patient_id: int,
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == patient_id
        )
        .first()
    )

    if patient is None:
        raise ValueError(
            "Patient not found."
        )

    return patient


def _validate_prescription_encounter(
    db: Session,
    encounter_id: int,
    patient_id: int,
    doctor_id: int,
):
    encounter = (
        db.query(models.ClinicalEncounter)
        .filter(
            models.ClinicalEncounter.id
            == encounter_id
        )
        .first()
    )

    if encounter is None:
        raise ValueError(
            "Clinical encounter not found."
        )

    if encounter.patient_id != patient_id:
        raise ValueError(
            "Clinical encounter does not belong to the selected patient."
        )

    if encounter.doctor_id != doctor_id:
        raise ValueError(
            "You can only prescribe for your own clinical encounter."
        )

    if encounter.status == "Cancelled":
        raise ValueError(
            "Prescription cannot be created for a cancelled encounter."
        )

    return encounter


def _validate_prescription_status(
    status: str,
):
    if (
        status
        not in PRESCRIPTION_ACTIVE_STATUSES
    ):
        raise ValueError(
            "Invalid prescription status."
        )


def _normalize_and_validate_prescription_item(
    item_data,
    existing_medication_names=None,
):
    """
    Normalize and validate one prescription medication.

    This is intentionally enforced at the CRUD/database boundary
    so the prescription remains safe even when the API is called
    without the frontend.
    """

    data = item_data.model_dump()

    string_fields = {
        "medication_name",
        "generic_name",
        "strength",
        "dosage_form",
        "route",
        "dose",
        "frequency",
        "duration_unit",
        "quantity",
        "instructions",
    }

    for field in string_fields:
        value = data.get(field)

        if value is not None:
            value = value.strip()
            data[field] = value or None

    medication_name = data.get("medication_name")

    if not medication_name:
        raise ValueError(
            "Medication name is required."
        )

    required_fields = {
        "dosage_form": "Dosage form is required.",
        "route": "Medication route is required.",
        "dose": "Medication dose is required.",
        "frequency": "Medication frequency is required.",
    }

    for field, message in required_fields.items():
        if not data.get(field):
            raise ValueError(message)

    duration_value = data.get("duration_value")
    duration_unit = data.get("duration_unit")

    if (
        duration_value is None
        and duration_unit is not None
    ):
        raise ValueError(
            "Duration value is required when duration unit is provided."
        )

    if (
        duration_value is not None
        and duration_unit is None
    ):
        raise ValueError(
            "Duration unit is required when duration value is provided."
        )

    if (
        duration_value is not None
        and duration_value <= 0
    ):
        raise ValueError(
            "Duration value must be greater than zero."
        )

    if existing_medication_names:
        normalized_name = medication_name.casefold()

        for existing_name in existing_medication_names:
            if (
                existing_name
                and existing_name.strip().casefold()
                == normalized_name
            ):
                raise ValueError(
                    f"Duplicate medication is not allowed in the same prescription: "
                    f"{medication_name}."
                )

    return data


# =====================================================
# CREATE PRESCRIPTION
# =====================================================


def create_prescription(
    db: Session,
    doctor_id: int,
    prescription: schemas.PrescriptionCreate,
):
    # -------------------------------------------------
    # VALIDATE DOCTOR
    # -------------------------------------------------

    _validate_prescription_doctor(
        db,
        doctor_id,
    )

    # -------------------------------------------------
    # VALIDATE PATIENT
    # -------------------------------------------------

    _validate_prescription_patient(
        db,
        prescription.patient_id,
    )

    # -------------------------------------------------
    # VALIDATE ENCOUNTER
    # -------------------------------------------------

    _validate_prescription_encounter(
        db,
        prescription.encounter_id,
        prescription.patient_id,
        doctor_id,
    )

    # -------------------------------------------------
    # AT LEAST ONE MEDICATION
    # -------------------------------------------------

    if not prescription.items:
        raise ValueError(
            "At least one medication is required."
        )

    # -------------------------------------------------
    # CREATE PRESCRIPTION
    # -------------------------------------------------

    db_prescription = models.Prescription(
        patient_id=prescription.patient_id,
        encounter_id=prescription.encounter_id,
        prescribed_by_id=doctor_id,
        status="DRAFT",
        notes=(
            prescription.notes.strip()
            if prescription.notes
            else None
        ),
    )

    db.add(
        db_prescription
    )

    # -------------------------------------------------
    # CREATE MEDICATION ITEMS
    # -------------------------------------------------

    medication_names = set()

    for item in prescription.items:

        item_data = _normalize_and_validate_prescription_item(
            item,
            existing_medication_names=medication_names,
        )

        medication_names.add(
            item_data["medication_name"]
        )

        db_item = models.PrescriptionItem(
            prescription=db_prescription,
            **item_data,
        )

        db.add(db_item)

    db.commit()
    db.refresh(db_prescription)

    return db_prescription


# =====================================================
# UPDATE PRESCRIPTION NOTES
# =====================================================


def update_prescription(
    db: Session,
    prescription_id: int,
    prescription: schemas.PrescriptionUpdate,
):
    db_prescription = get_prescription(
        db,
        prescription_id,
    )

    if db_prescription is None:
        return None

    if db_prescription.status != "DRAFT":
        raise ValueError(
            "Only draft prescriptions can be modified."
        )

    update_data = prescription.model_dump(
        exclude_unset=True
    )

    if "notes" in update_data:
        value = update_data["notes"]

        update_data["notes"] = (
            value.strip()
            if value
            else None
        )

    for field, value in update_data.items():
        setattr(
            db_prescription,
            field,
            value,
        )

    db.commit()
    db.refresh(db_prescription)

    return db_prescription


# =====================================================
# ADD PRESCRIPTION ITEM
# =====================================================


def add_prescription_item(
    db: Session,
    prescription_id: int,
    item: schemas.PrescriptionItemCreate,
):
    db_prescription = get_prescription(
        db,
        prescription_id,
    )

    if db_prescription is None:
        return None

    if db_prescription.status != "DRAFT":
        raise ValueError(
            "Medication can only be added to a draft prescription."
        )

    existing_names = [
        row[0]
        for row in (
            db.query(
                models.PrescriptionItem.medication_name
            )
            .filter(
                models.PrescriptionItem.prescription_id
                == prescription_id
            )
            .all()
        )
    ]

    item_data = _normalize_and_validate_prescription_item(
        item,
        existing_medication_names=existing_names,
    )

    db_item = models.PrescriptionItem(
        prescription_id=prescription_id,
        **item_data,
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item


# =====================================================
# UPDATE PRESCRIPTION ITEM
# =====================================================


def update_prescription_item(
    db: Session,
    item_id: int,
    item: schemas.PrescriptionItemUpdate,
):
    db_item = get_prescription_item(
        db,
        item_id,
    )

    if db_item is None:
        return None

    db_prescription = get_prescription(
        db,
        db_item.prescription_id,
    )

    if db_prescription is None:
        return None

    if db_prescription.status != "DRAFT":
        raise ValueError(
            "Only draft prescriptions can have their medications modified."
        )

    update_data = item.model_dump(
        exclude_unset=True
    )

    # Merge the incoming partial update with the
    # current persisted values so the complete medication
    # is validated before it is saved.
    merged_data = {
        "medication_name": db_item.medication_name,
        "generic_name": db_item.generic_name,
        "strength": db_item.strength,
        "dosage_form": db_item.dosage_form,
        "route": db_item.route,
        "dose": db_item.dose,
        "frequency": db_item.frequency,
        "duration_value": db_item.duration_value,
        "duration_unit": db_item.duration_unit,
        "quantity": db_item.quantity,
        "is_prn": db_item.is_prn,
        "instructions": db_item.instructions,
    }

    merged_data.update(
        update_data
    )

    # Build a validation object using the same schema
    # contract used for new prescription items.
    validated_item = schemas.PrescriptionItemCreate(
        **merged_data
    )

    existing_names = [
        row[0]
        for row in (
            db.query(
                models.PrescriptionItem.medication_name
            )
            .filter(
                models.PrescriptionItem.prescription_id
                == db_prescription.id,
                models.PrescriptionItem.id
                != item_id,
            )
            .all()
        )
    ]

    normalized_data = (
        _normalize_and_validate_prescription_item(
            validated_item,
            existing_medication_names=existing_names,
        )
    )

    for field, value in normalized_data.items():
        setattr(
            db_item,
            field,
            value,
        )

    db.commit()
    db.refresh(db_item)

    return db_item


# =====================================================
# DELETE PRESCRIPTION ITEM
# =====================================================


def delete_prescription_item(
    db: Session,
    item_id: int,
):
    db_item = get_prescription_item(
        db,
        item_id,
    )

    if db_item is None:
        return None

    db_prescription = get_prescription(
        db,
        db_item.prescription_id,
    )

    if db_prescription is None:
        return None

    if db_prescription.status != "DRAFT":
        raise ValueError(
            "Only draft prescriptions can have medications removed."
        )

    remaining_items = (
        db.query(models.PrescriptionItem)
        .filter(
            models.PrescriptionItem.prescription_id
            == db_prescription.id,
            models.PrescriptionItem.id
            != item_id,
        )
        .count()
    )

    if remaining_items == 0:
        raise ValueError(
            "A prescription must contain at least one medication."
        )

    db.delete(db_item)
    db.commit()

    return True


# =====================================================
# ACTIVATE PRESCRIPTION
# =====================================================


def activate_prescription(
    db: Session,
    prescription_id: int,
):
    db_prescription = get_prescription(
        db,
        prescription_id,
    )

    if db_prescription is None:
        return None

    if db_prescription.status != "DRAFT":
        raise ValueError(
            "Only draft prescriptions can be activated."
        )

    item_count = (
        db.query(models.PrescriptionItem)
        .filter(
            models.PrescriptionItem.prescription_id
            == prescription_id
        )
        .count()
    )

    if item_count == 0:
        raise ValueError(
            "A prescription must contain at least one medication before activation."
        )

    db_prescription.status = "ACTIVE"
    db_prescription.activated_at = (
        datetime.now(timezone.utc)
    )

    db.commit()
    db.refresh(db_prescription)

    return db_prescription


# =====================================================
# COMPLETE PRESCRIPTION
# =====================================================


def complete_prescription(
    db: Session,
    prescription_id: int,
):
    db_prescription = get_prescription(
        db,
        prescription_id,
    )

    if db_prescription is None:
        return None

    if db_prescription.status != "ACTIVE":
        raise ValueError(
            "Only active prescriptions can be completed."
        )

    db_prescription.status = "COMPLETED"
    db_prescription.completed_at = (
        datetime.now(timezone.utc)
    )

    db.commit()
    db.refresh(db_prescription)

    return db_prescription


# =====================================================
# DISCONTINUE PRESCRIPTION
# =====================================================


def discontinue_prescription(
    db: Session,
    prescription_id: int,
):
    db_prescription = get_prescription(
        db,
        prescription_id,
    )

    if db_prescription is None:
        return None

    if db_prescription.status != "ACTIVE":
        raise ValueError(
            "Only active prescriptions can be discontinued."
        )

    db_prescription.status = "DISCONTINUED"
    db_prescription.discontinued_at = (
        datetime.now(timezone.utc)
    )

    db.commit()
    db.refresh(db_prescription)

    return db_prescription


# =====================================================
# CANCEL PRESCRIPTION
# =====================================================


def cancel_prescription(
    db: Session,
    prescription_id: int,
):
    db_prescription = get_prescription(
        db,
        prescription_id,
    )

    if db_prescription is None:
        return None

    if db_prescription.status != "DRAFT":
        raise ValueError(
            "Only draft prescriptions can be cancelled."
        )

    db_prescription.status = "CANCELLED"
    db_prescription.cancelled_at = (
        datetime.now(timezone.utc)
    )

    db.commit()
    db.refresh(db_prescription)

    return db_prescription

# =====================================================
# PATIENT TRANSFER CRUD
# =====================================================

def get_patient_transfer(
    db: Session,
    transfer_id: int,
):
    return (
        db.query(models.PatientTransfer)
        .options(
            joinedload(models.PatientTransfer.patient),
            joinedload(models.PatientTransfer.encounter),
            joinedload(models.PatientTransfer.requested_by),
            joinedload(models.PatientTransfer.approved_by),
            joinedload(models.PatientTransfer.completed_by),
            joinedload(models.PatientTransfer.source_department),
            joinedload(models.PatientTransfer.source_ward),
            joinedload(models.PatientTransfer.source_room),
            joinedload(models.PatientTransfer.source_bed),
            joinedload(models.PatientTransfer.destination_department),
            joinedload(models.PatientTransfer.destination_ward),
            joinedload(models.PatientTransfer.destination_room),
            joinedload(models.PatientTransfer.destination_bed),
        )
        .filter(models.PatientTransfer.id == transfer_id)
        .first()
    )


def get_patient_transfers(
    db: Session,
    patient_id: int,
):
    return (
        db.query(models.PatientTransfer)
        .options(
            joinedload(models.PatientTransfer.patient),
            joinedload(models.PatientTransfer.encounter),
            joinedload(models.PatientTransfer.requested_by),
            joinedload(models.PatientTransfer.approved_by),
            joinedload(models.PatientTransfer.completed_by),
            joinedload(models.PatientTransfer.source_department),
            joinedload(models.PatientTransfer.source_ward),
            joinedload(models.PatientTransfer.source_room),
            joinedload(models.PatientTransfer.source_bed),
            joinedload(models.PatientTransfer.destination_department),
            joinedload(models.PatientTransfer.destination_ward),
            joinedload(models.PatientTransfer.destination_room),
            joinedload(models.PatientTransfer.destination_bed),
        )
        .filter(models.PatientTransfer.patient_id == patient_id)
        .order_by(
            models.PatientTransfer.requested_at.desc(),
            models.PatientTransfer.id.desc(),
        )
        .all()
    )


def get_patient_transfers_for_encounter(
    db: Session,
    encounter_id: int,
):
    return (
        db.query(models.PatientTransfer)
        .options(
            joinedload(models.PatientTransfer.patient),
            joinedload(models.PatientTransfer.encounter),
            joinedload(models.PatientTransfer.requested_by),
            joinedload(models.PatientTransfer.approved_by),
            joinedload(models.PatientTransfer.completed_by),
            joinedload(models.PatientTransfer.source_department),
            joinedload(models.PatientTransfer.source_ward),
            joinedload(models.PatientTransfer.source_room),
            joinedload(models.PatientTransfer.source_bed),
            joinedload(models.PatientTransfer.destination_department),
            joinedload(models.PatientTransfer.destination_ward),
            joinedload(models.PatientTransfer.destination_room),
            joinedload(models.PatientTransfer.destination_bed),
        )
        .filter(models.PatientTransfer.encounter_id == encounter_id)
        .order_by(
            models.PatientTransfer.requested_at.desc(),
            models.PatientTransfer.id.desc(),
        )
        .all()
    )


def get_patient_transfers_requested_by(
    db: Session,
    user_id: int,
):
    return (
        db.query(models.PatientTransfer)
        .options(
            joinedload(models.PatientTransfer.patient),
            joinedload(models.PatientTransfer.encounter),
            joinedload(models.PatientTransfer.requested_by),
            joinedload(models.PatientTransfer.approved_by),
            joinedload(models.PatientTransfer.completed_by),
            joinedload(models.PatientTransfer.source_department),
            joinedload(models.PatientTransfer.source_ward),
            joinedload(models.PatientTransfer.source_room),
            joinedload(models.PatientTransfer.source_bed),
            joinedload(models.PatientTransfer.destination_department),
            joinedload(models.PatientTransfer.destination_ward),
            joinedload(models.PatientTransfer.destination_room),
            joinedload(models.PatientTransfer.destination_bed),
        )
        .filter(models.PatientTransfer.requested_by_id == user_id)
        .order_by(
            models.PatientTransfer.requested_at.desc(),
            models.PatientTransfer.id.desc(),
        )
        .all()
    )


def _validate_transfer_patient_and_encounter(
    db: Session,
    patient_id: int,
    encounter_id: int,
):
    patient = get_patient(db, patient_id)

    if not patient:
        return "patient_not_found"

    encounter = (
        db.query(models.ClinicalEncounter)
        .filter(models.ClinicalEncounter.id == encounter_id)
        .first()
    )

    if not encounter:
        return "encounter_not_found"

    if encounter.patient_id != patient_id:
        return "encounter_patient_mismatch"

    if encounter.status == "Cancelled":
        return "encounter_cancelled"

    return {
        "patient": patient,
        "encounter": encounter,
    }


def _get_active_patient_assignment(
    db: Session,
    patient_id: int,
):
    return (
        db.query(models.PatientAssignment)
        .filter(
            models.PatientAssignment.patient_id == patient_id,
            models.PatientAssignment.status == "Active",
        )
        .order_by(
            models.PatientAssignment.assigned_at.desc(),
            models.PatientAssignment.id.desc(),
        )
        .first()
    )


def _validate_transfer_location(
    db: Session,
    department_id: Optional[int],
    ward_id: Optional[int],
    room_id: Optional[int],
    bed_id: Optional[int],
    *,
    destination: bool = False,
):
    department = None
    ward = None
    room = None
    bed = None
    floor = None

    # =====================================================
    # DEPARTMENT
    # =====================================================

    if department_id is not None:
        department = get_department(
            db,
            department_id,
        )

        if not department:
            return (
                "destination_department_not_found"
                if destination
                else "source_department_not_found"
            )

        if not getattr(
            department,
            "is_active",
            True,
        ):
            return (
                "destination_department_inactive"
                if destination
                else "source_department_inactive"
            )

    # =====================================================
    # WARD
    # =====================================================
    #
    # Ward does not directly contain department_id.
    # Correct hierarchy:
    #
    # Department -> Floor -> Ward
    #
    # Therefore, when department_id is supplied, validate
    # the ward through its parent floor.
    # =====================================================

    if ward_id is not None:
        ward = get_ward(
            db,
            ward_id,
        )

        if not ward:
            return (
                "destination_ward_not_found"
                if destination
                else "source_ward_not_found"
            )

        if not getattr(
            ward,
            "is_active",
            True,
        ):
            return (
                "destination_ward_inactive"
                if destination
                else "source_ward_inactive"
            )

        # -------------------------------------------------
        # WARD -> FLOOR -> DEPARTMENT
        # -------------------------------------------------

        if department_id is not None:
            floor = get_floor(
                db,
                ward.floor_id,
            )

            if (
                not floor
                or floor.department_id != department_id
            ):
                return (
                    "destination_ward_not_in_department"
                    if destination
                    else "source_ward_not_in_department"
                )

    # =====================================================
    # ROOM
    # =====================================================

    if room_id is not None:
        room = get_room(
            db,
            room_id,
        )

        if not room:
            return (
                "destination_room_not_found"
                if destination
                else "source_room_not_found"
            )

        if not getattr(
            room,
            "is_active",
            True,
        ):
            return (
                "destination_room_inactive"
                if destination
                else "source_room_inactive"
            )

        # -------------------------------------------------
        # ROOM -> WARD
        # -------------------------------------------------

        if (
            ward_id is not None
            and room.ward_id != ward_id
        ):
            return (
                "destination_room_not_in_ward"
                if destination
                else "source_room_not_in_ward"
            )

    # =====================================================
    # BED
    # =====================================================

    if bed_id is not None:
        bed = get_bed(
            db,
            bed_id,
        )

        if not bed:
            return (
                "destination_bed_not_found"
                if destination
                else "source_bed_not_found"
            )

        if not getattr(
            bed,
            "is_active",
            True,
        ):
            return (
                "destination_bed_inactive"
                if destination
                else "source_bed_inactive"
            )

        # -------------------------------------------------
        # BED -> ROOM
        # -------------------------------------------------

        if (
            room_id is not None
            and bed.room_id != room_id
        ):
            return (
                "destination_bed_not_in_room"
                if destination
                else "source_bed_not_in_room"
            )

        # -------------------------------------------------
        # BED -> ROOM -> WARD
        # -------------------------------------------------

        if ward_id is not None:
            bed_room = get_room(
                db,
                bed.room_id,
            )

            if (
                not bed_room
                or bed_room.ward_id != ward_id
            ):
                return (
                    "destination_bed_not_in_ward"
                    if destination
                    else "source_bed_not_in_ward"
                )

    # =====================================================
    # VALID
    # =====================================================

    return {
        "department": department,
        "ward": ward,
        "room": room,
        "bed": bed,
    }


def _validate_transfer_destination_availability(
    db: Session,
    bed,
):
    if bed is None:
        return True

    if bed.status != "Available":
        return "destination_bed_not_available"

    existing_assignment = (
        db.query(models.PatientAssignment)
        .filter(
            models.PatientAssignment.bed_id == bed.id,
            models.PatientAssignment.status == "Active",
        )
        .first()
    )

    if existing_assignment:
        return "destination_bed_already_assigned"

    return True


def _validate_transfer_source(
    active_assignment,
    source_department_id: Optional[int],
    source_ward_id: Optional[int],
    source_room_id: Optional[int],
    source_bed_id: Optional[int],
):
    if active_assignment is None:
        if any(
            value is not None
            for value in (
                source_department_id,
                source_ward_id,
                source_room_id,
                source_bed_id,
            )
        ):
            return "source_assignment_not_found"

        return True

    expected = {
        "department_id": active_assignment.department_id,
        "ward_id": active_assignment.ward_id,
        "bed_id": active_assignment.bed_id,
    }

    if (
        source_department_id is not None
        and expected["department_id"] != source_department_id
    ):
        return "source_department_mismatch"

    if (
        source_ward_id is not None
        and expected["ward_id"] != source_ward_id
    ):
        return "source_ward_mismatch"

    if (
        source_bed_id is not None
        and expected["bed_id"] != source_bed_id
    ):
        return "source_bed_mismatch"

    return True


def _validate_transfer_request(
    db: Session,
    transfer: schemas.TransferCreate,
):
    validation = _validate_transfer_patient_and_encounter(
        db,
        transfer.patient_id,
        transfer.encounter_id,
    )

    if isinstance(validation, str):
        return validation

    active_assignment = _get_active_patient_assignment(
        db,
        transfer.patient_id,
    )

    source_validation = _validate_transfer_source(
        active_assignment,
        transfer.source_department_id,
        transfer.source_ward_id,
        transfer.source_room_id,
        transfer.source_bed_id,
    )

    if isinstance(source_validation, str):
        return source_validation

    destination_validation = _validate_transfer_location(
        db,
        transfer.destination_department_id,
        transfer.destination_ward_id,
        transfer.destination_room_id,
        transfer.destination_bed_id,
        destination=True,
    )

    if isinstance(destination_validation, str):
        return destination_validation

    availability = _validate_transfer_destination_availability(
        db,
        destination_validation["bed"],
    )

    if availability is not True:
        return availability

    return {
        **validation,
        "active_assignment": active_assignment,
        "destination": destination_validation,
    }


def create_patient_transfer(
    db: Session,
    transfer: schemas.TransferCreate,
    requested_by_id: int,
):
    validation = _validate_transfer_request(
        db,
        transfer,
    )

    if isinstance(validation, str):
        return validation

    # Prevent duplicate active transfer requests for the same patient.
    existing_active = (
        db.query(models.PatientTransfer)
        .filter(
            models.PatientTransfer.patient_id == transfer.patient_id,
            models.PatientTransfer.status.in_(
                [
                    "REQUESTED",
                    "APPROVED",
                    "IN_PROGRESS",
                ]
            ),
        )
        .first()
    )

    if existing_active:
        return "active_transfer_exists"

    transfer_data = transfer.model_dump()

    db_transfer = models.PatientTransfer(
        **transfer_data,
        requested_by_id=requested_by_id,
        status="REQUESTED",
    )

    db.add(db_transfer)

    try:
        db.commit()
        db.refresh(db_transfer)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return get_patient_transfer(db, db_transfer.id)


def update_patient_transfer(
    db: Session,
    transfer_id: int,
    transfer: schemas.TransferUpdate,
):
    db_transfer = get_patient_transfer(db, transfer_id)

    if not db_transfer:
        return None

    if db_transfer.status != "REQUESTED":
        return "transfer_not_editable"

    update_data = transfer.model_dump(exclude_unset=True)

    merged = {
        field: getattr(db_transfer, field)
        for field in [
            "transfer_type",
            "priority",
            "source_department_id",
            "source_ward_id",
            "source_room_id",
            "source_bed_id",
            "destination_department_id",
            "destination_ward_id",
            "destination_room_id",
            "destination_bed_id",
            "reason",
            "clinical_summary",
            "handover_notes",
            "transport_mode",
            "notes",
        ]
    }

    merged.update(update_data)

    try:
        candidate = schemas.TransferCreate(
            patient_id=db_transfer.patient_id,
            encounter_id=db_transfer.encounter_id,
            **merged,
        )
    except Exception as exc:
        return str(exc)

    validation = _validate_transfer_request(db, candidate)

    if isinstance(validation, str):
        return validation

    for key, value in update_data.items():
        setattr(db_transfer, key, value)

    try:
        db.commit()
        db.refresh(db_transfer)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return get_patient_transfer(db, db_transfer.id)


def approve_patient_transfer(
    db: Session,
    transfer_id: int,
    approved_by_id: int,
    notes: Optional[str] = None,
):
    db_transfer = get_patient_transfer(db, transfer_id)

    if not db_transfer:
        return None

    if db_transfer.status != "REQUESTED":
        return "invalid_transfer_status"

    validation = _validate_transfer_request(
        db,
        schemas.TransferCreate(
            patient_id=db_transfer.patient_id,
            encounter_id=db_transfer.encounter_id,
            transfer_type=db_transfer.transfer_type,
            priority=db_transfer.priority,
            source_department_id=db_transfer.source_department_id,
            source_ward_id=db_transfer.source_ward_id,
            source_room_id=db_transfer.source_room_id,
            source_bed_id=db_transfer.source_bed_id,
            destination_department_id=db_transfer.destination_department_id,
            destination_ward_id=db_transfer.destination_ward_id,
            destination_room_id=db_transfer.destination_room_id,
            destination_bed_id=db_transfer.destination_bed_id,
            reason=db_transfer.reason,
            clinical_summary=db_transfer.clinical_summary,
            handover_notes=db_transfer.handover_notes,
            transport_mode=db_transfer.transport_mode,
            notes=notes if notes is not None else db_transfer.notes,
        ),
    )

    if isinstance(validation, str):
        return validation

    db_transfer.status = "APPROVED"
    db_transfer.approved_by_id = approved_by_id
    db_transfer.approved_at = datetime.now(timezone.utc)

    if notes is not None:
        db_transfer.notes = notes.strip() or None

    try:
        db.commit()
        db.refresh(db_transfer)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return get_patient_transfer(db, db_transfer.id)


def start_patient_transfer(
    db: Session,
    transfer_id: int,
    user_id: int,
    notes: Optional[str] = None,
):
    db_transfer = get_patient_transfer(db, transfer_id)

    if not db_transfer:
        return None

    if db_transfer.status != "APPROVED":
        return "invalid_transfer_status"

    db_transfer.status = "IN_PROGRESS"
    db_transfer.started_at = datetime.now(timezone.utc)

    if notes is not None:
        db_transfer.handover_notes = notes.strip() or None

    try:
        db.commit()
        db.refresh(db_transfer)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return get_patient_transfer(db, db_transfer.id)


def complete_patient_transfer(
    db: Session,
    transfer_id: int,
    completed_by_id: int,
    notes: Optional[str] = None,
):
    db_transfer = get_patient_transfer(db, transfer_id)

    if not db_transfer:
        return None

    if db_transfer.status != "IN_PROGRESS":
        return "invalid_transfer_status"

    # Re-check destination immediately before changing the active
    # patient assignment. This protects against a bed becoming
    # occupied after the transfer was approved.
    validation = _validate_transfer_request(
        db,
        schemas.TransferCreate(
            patient_id=db_transfer.patient_id,
            encounter_id=db_transfer.encounter_id,
            transfer_type=db_transfer.transfer_type,
            priority=db_transfer.priority,
            source_department_id=db_transfer.source_department_id,
            source_ward_id=db_transfer.source_ward_id,
            source_room_id=db_transfer.source_room_id,
            source_bed_id=db_transfer.source_bed_id,
            destination_department_id=db_transfer.destination_department_id,
            destination_ward_id=db_transfer.destination_ward_id,
            destination_room_id=db_transfer.destination_room_id,
            destination_bed_id=db_transfer.destination_bed_id,
            reason=db_transfer.reason,
            clinical_summary=db_transfer.clinical_summary,
            handover_notes=db_transfer.handover_notes,
            transport_mode=db_transfer.transport_mode,
            notes=notes if notes is not None else db_transfer.notes,
        ),
    )

    if isinstance(validation, str):
        return validation

    active_assignment = validation["active_assignment"]

    # Build the new PatientAssignment explicitly so the transfer
    # updates the actual operational location and preserves the
    # existing assignment history.
    new_assignment = schemas.PatientAssignmentCreate(
        patient_id=db_transfer.patient_id,
        department_id=db_transfer.destination_department_id,
        doctor_id=active_assignment.doctor_id if active_assignment else None,
        nurse_id=active_assignment.nurse_id if active_assignment else None,
        ward_id=db_transfer.destination_ward_id,
        bed_id=db_transfer.destination_bed_id,
        assignment_type=(
            active_assignment.assignment_type
            if active_assignment
            else "Patient Allocation"
        ),
        status="Active",
        notes=(
            notes.strip()
            if notes and notes.strip()
            else f"Transfer #{db_transfer.id} completed."
        ),
    )

    # Validate the assignment target without committing. The transfer
    # and the resulting PatientAssignment must be committed atomically.
    assignment_validation = _validate_patient_assignment_targets(
        db,
        new_assignment,
    )

    if isinstance(assignment_validation, str):
        db.rollback()
        return assignment_validation

    current_assignment = (
        db.query(models.PatientAssignment)
        .filter(
            models.PatientAssignment.patient_id == new_assignment.patient_id,
            models.PatientAssignment.assignment_type == new_assignment.assignment_type,
            models.PatientAssignment.status == "Active",
        )
        .order_by(
            models.PatientAssignment.assigned_at.desc(),
            models.PatientAssignment.id.desc(),
        )
        .first()
    )

    if current_assignment:
        current_assignment.status = "Transferred"
        current_assignment.released_at = datetime.now(timezone.utc)

        if (
            current_assignment.bed_id is not None
            and current_assignment.bed_id != new_assignment.bed_id
        ):
            old_bed = get_bed(db, current_assignment.bed_id)
            if old_bed:
                old_bed.status = "Available"

    assignment_data = new_assignment.model_dump(exclude={"status"})
    db_assignment = models.PatientAssignment(
        **assignment_data,
        assigned_by=completed_by_id,
        assigned_at=datetime.now(timezone.utc),
        status="Active",
    )
    db.add(db_assignment)

    if new_assignment.bed_id is not None:
        destination_bed = assignment_validation["bed"]
        if destination_bed:
            destination_bed.status = "Occupied"

    db_transfer.status = "COMPLETED"
    db_transfer.completed_by_id = completed_by_id
    db_transfer.completed_at = datetime.now(timezone.utc)

    if notes is not None:
        db_transfer.notes = notes.strip() or None

    try:
        db.commit()
        db.refresh(db_transfer)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return get_patient_transfer(db, db_transfer.id)


def reject_patient_transfer(
    db: Session,
    transfer_id: int,
    notes: Optional[str] = None,
):
    db_transfer = get_patient_transfer(db, transfer_id)

    if not db_transfer:
        return None

    if db_transfer.status != "REQUESTED":
        return "invalid_transfer_status"

    db_transfer.status = "REJECTED"
    db_transfer.rejected_at = datetime.now(timezone.utc)

    if notes is not None:
        db_transfer.notes = notes.strip() or None

    try:
        db.commit()
        db.refresh(db_transfer)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return get_patient_transfer(db, db_transfer.id)


def cancel_patient_transfer(
    db: Session,
    transfer_id: int,
    requested_by_id: int,
    notes: Optional[str] = None,
):
    db_transfer = get_patient_transfer(db, transfer_id)

    if not db_transfer:
        return None

    if db_transfer.requested_by_id != requested_by_id:
        return "forbidden"

    if db_transfer.status != "REQUESTED":
        return "invalid_transfer_status"

    db_transfer.status = "CANCELLED"
    db_transfer.cancelled_at = datetime.now(timezone.utc)

    if notes is not None:
        db_transfer.notes = notes.strip() or None

    try:
        db.commit()
        db.refresh(db_transfer)
    except IntegrityError:
        db.rollback()
        return "duplicate"

    return get_patient_transfer(db, db_transfer.id)


# =====================================================
# DISCHARGE CRUD
# =====================================================
#
# Discharge lifecycle:
#
# PLANNED -> READY -> DISCHARGED
# PLANNED -> CANCELLED
# READY   -> CANCELLED
#
# A discharge belongs to exactly one Patient and one
# ClinicalEncounter.
#
# The discharge is created/managed by an authenticated
# Doctor. The encounter must belong to the selected patient
# and cannot be cancelled.
#
# =====================================================


DISCHARGE_STATUSES = {
    "PLANNED",
    "READY",
    "DISCHARGED",
    "CANCELLED",
}


DISCHARGE_TYPES = {
    "ROUTINE",
    "LAMA",
    "REFERRED",
    "TRANSFERRED",
    "DECEASED",
}


# -----------------------------------------------------
# DISCHARGE QUERY
# -----------------------------------------------------


def _discharge_query(db: Session):
    """
    Standard discharge query with eager loading.

    Loads patient, encounter and discharging doctor so
    response serialization does not create unnecessary
    additional queries.
    """
    return (
        db.query(models.Discharge)
        .options(
            joinedload(models.Discharge.patient),
            joinedload(models.Discharge.encounter),
            joinedload(models.Discharge.discharged_by),
        )
    )


# -----------------------------------------------------
# GET DISCHARGE
# -----------------------------------------------------


def get_discharge(
    db: Session,
    discharge_id: int,
):
    return (
        _discharge_query(db)
        .filter(
            models.Discharge.id
            == discharge_id
        )
        .first()
    )


# -----------------------------------------------------
# GET ALL DISCHARGES
# -----------------------------------------------------


def get_discharges(
    db: Session,
    patient_id: Optional[int] = None,
    encounter_id: Optional[int] = None,
    discharged_by_id: Optional[int] = None,
    status: Optional[str] = None,
):
    query = _discharge_query(db)

    if patient_id is not None:
        query = query.filter(
            models.Discharge.patient_id
            == patient_id
        )

    if encounter_id is not None:
        query = query.filter(
            models.Discharge.encounter_id
            == encounter_id
        )

    if discharged_by_id is not None:
        query = query.filter(
            models.Discharge.discharged_by_id
            == discharged_by_id
        )

    if status is not None:
        _validate_discharge_status(status)

        query = query.filter(
            models.Discharge.status
            == status.strip().upper()
        )

    return (
        query
        .order_by(
            models.Discharge.planned_at.desc(),
            models.Discharge.id.desc(),
        )
        .all()
    )


# -----------------------------------------------------
# GET PATIENT DISCHARGES
# -----------------------------------------------------


def get_discharges_for_patient(
    db: Session,
    patient_id: int,
):
    return get_discharges(
        db=db,
        patient_id=patient_id,
    )


# -----------------------------------------------------
# GET ENCOUNTER DISCHARGES
# -----------------------------------------------------


def get_discharges_for_encounter(
    db: Session,
    encounter_id: int,
):
    return get_discharges(
        db=db,
        encounter_id=encounter_id,
    )


# -----------------------------------------------------
# VALIDATE DISCHARGE STATUS
# -----------------------------------------------------


def _validate_discharge_status(
    status: str,
):
    normalized_status = status.strip().upper()

    if normalized_status not in DISCHARGE_STATUSES:
        raise ValueError(
            "Invalid discharge status."
        )

    return normalized_status


# -----------------------------------------------------
# VALIDATE DISCHARGE TYPE
# -----------------------------------------------------


def _validate_discharge_type(
    discharge_type: str,
):
    normalized_type = discharge_type.strip().upper()

    if normalized_type not in DISCHARGE_TYPES:
        raise ValueError(
            "Invalid discharge type."
        )

    return normalized_type


# -----------------------------------------------------
# VALIDATE DISCHARGE DOCTOR
# -----------------------------------------------------


def _validate_discharge_doctor(
    db: Session,
    doctor_id: int,
):
    doctor = (
        db.query(models.User)
        .filter(
            models.User.id
            == doctor_id
        )
        .first()
    )

    if doctor is None:
        raise ValueError(
            "Doctor not found."
        )

    if doctor.role != "Doctor":
        raise ValueError(
            "Selected user is not a Doctor."
        )

    if str(doctor.is_active).lower() != "true":
        raise ValueError(
            "Doctor account is inactive."
        )

    return doctor


# -----------------------------------------------------
# VALIDATE DISCHARGE TARGET
# -----------------------------------------------------


def _validate_discharge_target(
    db: Session,
    patient_id: int,
    encounter_id: int,
    doctor_id: int,
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id
            == patient_id
        )
        .first()
    )

    if patient is None:
        raise ValueError(
            "Patient not found."
        )

    encounter = (
        db.query(models.ClinicalEncounter)
        .filter(
            models.ClinicalEncounter.id
            == encounter_id
        )
        .first()
    )

    if encounter is None:
        raise ValueError(
            "Clinical encounter not found."
        )

    if encounter.patient_id != patient_id:
        raise ValueError(
            "Clinical encounter does not belong to the selected patient."
        )

    if encounter.status == "Cancelled":
        raise ValueError(
            "Discharge cannot be created for a cancelled clinical encounter."
        )

    doctor = _validate_discharge_doctor(
        db,
        doctor_id,
    )

    return {
        "patient": patient,
        "encounter": encounter,
        "doctor": doctor,
    }


# -----------------------------------------------------
# CREATE DISCHARGE
# -----------------------------------------------------


def create_discharge(
    db: Session,
    discharge: schemas.DischargeCreate,
    discharged_by_id: int,
):
    """
    Create a planned discharge.

    New discharge records always start in PLANNED state.
    The client cannot directly create a DISCHARGED record.
    """

    _validate_discharge_type(
        discharge.discharge_type
    )

    validation = _validate_discharge_target(
        db=db,
        patient_id=discharge.patient_id,
        encounter_id=discharge.encounter_id,
        doctor_id=discharged_by_id,
    )

    # -------------------------------------------------
    # ONLY ONE ACTIVE DISCHARGE PER ENCOUNTER
    # -------------------------------------------------

    existing_discharge = (
        db.query(models.Discharge)
        .filter(
            models.Discharge.encounter_id
            == discharge.encounter_id,
            models.Discharge.status.in_(
                [
                    "PLANNED",
                    "READY",
                ]
            ),
        )
        .first()
    )

    if existing_discharge:
        raise ValueError(
            "An active discharge already exists for this clinical encounter."
        )

    # -------------------------------------------------
    # CREATE
    # -------------------------------------------------

    db_discharge = models.Discharge(
        patient_id=discharge.patient_id,
        encounter_id=discharge.encounter_id,
        discharged_by_id=discharged_by_id,
        status="PLANNED",
        discharge_type=discharge.discharge_type.strip().upper(),
        final_diagnosis=discharge.final_diagnosis,
        clinical_summary=discharge.clinical_summary,
        condition_at_discharge=discharge.condition_at_discharge,
        treatment_summary=discharge.treatment_summary,
        discharge_medications=discharge.discharge_medications,
        discharge_instructions=discharge.discharge_instructions,
        diet_instructions=discharge.diet_instructions,
        activity_restrictions=discharge.activity_restrictions,
        warning_signs=discharge.warning_signs,
        follow_up_required=discharge.follow_up_required,
        follow_up_date=discharge.follow_up_date,
        follow_up_instructions=discharge.follow_up_instructions,
        notes=discharge.notes,
    )

    db.add(db_discharge)

    db.commit()
    db.refresh(db_discharge)

    return get_discharge(
        db,
        db_discharge.id,
    )


# -----------------------------------------------------
# UPDATE DISCHARGE
# -----------------------------------------------------


def update_discharge(
    db: Session,
    discharge_id: int,
    discharge: schemas.DischargeUpdate,
    discharged_by_id: int,
):
    db_discharge = get_discharge(
        db,
        discharge_id,
    )

    if db_discharge is None:
        return None

    if (
        db_discharge.discharged_by_id
        != discharged_by_id
    ):
        raise ValueError(
            "Only the doctor who created the discharge can edit it."
        )

    if db_discharge.status in {
        "DISCHARGED",
        "CANCELLED",
    }:
        raise ValueError(
            "Discharged or cancelled records cannot be modified."
        )

    update_data = discharge.model_dump(
        exclude_unset=True
    )

    if "discharge_type" in update_data:
        update_data["discharge_type"] = (
            _validate_discharge_type(
                update_data["discharge_type"]
            )
        )

    for field, value in update_data.items():
        setattr(
            db_discharge,
            field,
            value,
        )

    db.commit()
    db.refresh(db_discharge)

    return get_discharge(
        db,
        db_discharge.id,
    )


# -----------------------------------------------------
# UPDATE DISCHARGE STATUS
# -----------------------------------------------------


def update_discharge_status(
    db: Session,
    discharge_id: int,
    status_update: schemas.DischargeStatusUpdate,
    discharged_by_id: int,
):
    db_discharge = get_discharge(
        db,
        discharge_id,
    )

    if db_discharge is None:
        return None

    if (
        db_discharge.discharged_by_id
        != discharged_by_id
    ):
        raise ValueError(
            "Only the doctor who created the discharge can change its status."
        )

    new_status = _validate_discharge_status(
        status_update.status
    )

    current_status = db_discharge.status

    # -------------------------------------------------
    # VALID TRANSITIONS
    # -------------------------------------------------

    allowed_transitions = {
        "PLANNED": {
            "READY",
            "CANCELLED",
        },
        "READY": {
            "DISCHARGED",
            "CANCELLED",
        },
        "DISCHARGED": set(),
        "CANCELLED": set(),
    }

    if (
        new_status
        not in allowed_transitions.get(
            current_status,
            set(),
        )
    ):
        raise ValueError(
            f"Invalid discharge status transition: "
            f"{current_status} -> {new_status}."
        )

    now = datetime.now(
        timezone.utc
    )

    db_discharge.status = new_status

    if new_status == "READY":
        db_discharge.ready_at = now

    elif new_status == "DISCHARGED":
        db_discharge.discharged_at = now

    elif new_status == "CANCELLED":
        db_discharge.cancelled_at = now

    db.commit()
    db.refresh(db_discharge)

    return get_discharge(
        db,
        db_discharge.id,
    )


# =====================================================
# FOLLOW-UP CRUD
# =====================================================
#
# Follow-up lifecycle:
#
# SCHEDULED -> COMPLETED
# SCHEDULED -> CANCELLED
# SCHEDULED -> MISSED
#
# Follow-up may optionally belong to a discharge.
#
# =====================================================


FOLLOW_UP_STATUSES = {
    "SCHEDULED",
    "COMPLETED",
    "CANCELLED",
    "MISSED",
}


FOLLOW_UP_TYPES = {
    "ROUTINE",
    "SPECIALIST",
    "POST_DISCHARGE",
    "MEDICATION_REVIEW",
    "DIAGNOSTIC_REVIEW",
    "OTHER",
}


FOLLOW_UP_PRIORITIES = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
}


# -----------------------------------------------------
# FOLLOW-UP QUERY
# -----------------------------------------------------


def _follow_up_query(db: Session):
    """
    Standard follow-up query with eager loading.
    """

    return (
        db.query(models.FollowUp)
        .options(
            joinedload(models.FollowUp.patient),
            joinedload(models.FollowUp.encounter),
            joinedload(models.FollowUp.discharge),
            joinedload(models.FollowUp.doctor),
        )
    )


# -----------------------------------------------------
# GET FOLLOW-UP
# -----------------------------------------------------


def get_follow_up(
    db: Session,
    follow_up_id: int,
):
    return (
        _follow_up_query(db)
        .filter(
            models.FollowUp.id
            == follow_up_id
        )
        .first()
    )


# -----------------------------------------------------
# GET FOLLOW-UPS
# -----------------------------------------------------


def get_follow_ups(
    db: Session,
    patient_id: Optional[int] = None,
    encounter_id: Optional[int] = None,
    discharge_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    status: Optional[str] = None,
):
    query = _follow_up_query(db)

    if patient_id is not None:
        query = query.filter(
            models.FollowUp.patient_id
            == patient_id
        )

    if encounter_id is not None:
        query = query.filter(
            models.FollowUp.encounter_id
            == encounter_id
        )

    if discharge_id is not None:
        query = query.filter(
            models.FollowUp.discharge_id
            == discharge_id
        )

    if doctor_id is not None:
        query = query.filter(
            models.FollowUp.doctor_id
            == doctor_id
        )

    if status is not None:
        _validate_follow_up_status(
            status
        )

        query = query.filter(
            models.FollowUp.status
            == status.strip().upper()
        )

    return (
        query
        .order_by(
            models.FollowUp.scheduled_at.asc(),
            models.FollowUp.id.desc(),
        )
        .all()
    )


# -----------------------------------------------------
# GET PATIENT FOLLOW-UPS
# -----------------------------------------------------


def get_follow_ups_for_patient(
    db: Session,
    patient_id: int,
):
    return get_follow_ups(
        db=db,
        patient_id=patient_id,
    )


# -----------------------------------------------------
# VALIDATE FOLLOW-UP STATUS
# -----------------------------------------------------


def _validate_follow_up_status(
    status: str,
):
    normalized_status = status.strip().upper()

    if normalized_status not in FOLLOW_UP_STATUSES:
        raise ValueError(
            "Invalid follow-up status."
        )

    return normalized_status


# -----------------------------------------------------
# VALIDATE FOLLOW-UP TYPE
# -----------------------------------------------------


def _validate_follow_up_type(
    follow_up_type: str,
):
    normalized_type = (
        follow_up_type
        .strip()
        .upper()
    )

    if normalized_type not in FOLLOW_UP_TYPES:
        raise ValueError(
            "Invalid follow-up type."
        )

    return normalized_type


# -----------------------------------------------------
# VALIDATE FOLLOW-UP PRIORITY
# -----------------------------------------------------


def _validate_follow_up_priority(
    priority: str,
):
    normalized_priority = (
        priority
        .strip()
        .upper()
    )

    if normalized_priority not in FOLLOW_UP_PRIORITIES:
        raise ValueError(
            "Invalid follow-up priority."
        )

    return normalized_priority


# -----------------------------------------------------
# VALIDATE FOLLOW-UP DOCTOR
# -----------------------------------------------------


def _validate_follow_up_doctor(
    db: Session,
    doctor_id: int,
):
    doctor = (
        db.query(models.User)
        .filter(
            models.User.id
            == doctor_id
        )
        .first()
    )

    if doctor is None:
        raise ValueError(
            "Doctor not found."
        )

    if doctor.role != "Doctor":
        raise ValueError(
            "Selected user is not a Doctor."
        )

    if str(doctor.is_active).lower() != "true":
        raise ValueError(
            "Doctor account is inactive."
        )

    return doctor


# -----------------------------------------------------
# VALIDATE FOLLOW-UP TARGET
# -----------------------------------------------------


def _validate_follow_up_target(
    db: Session,
    patient_id: int,
    encounter_id: int,
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id
            == patient_id
        )
        .first()
    )

    if patient is None:
        raise ValueError(
            "Patient not found."
        )

    encounter = (
        db.query(models.ClinicalEncounter)
        .filter(
            models.ClinicalEncounter.id
            == encounter_id
        )
        .first()
    )

    if encounter is None:
        raise ValueError(
            "Clinical encounter not found."
        )

    if encounter.patient_id != patient_id:
        raise ValueError(
            "Clinical encounter does not belong to the selected patient."
        )

    if encounter.status == "Cancelled":
        raise ValueError(
            "Follow-up cannot be created for a cancelled clinical encounter."
        )

    return {
        "patient": patient,
        "encounter": encounter,
    }


# -----------------------------------------------------
# VALIDATE FOLLOW-UP DISCHARGE
# -----------------------------------------------------


def _validate_follow_up_discharge(
    db: Session,
    discharge_id: Optional[int],
    patient_id: int,
    encounter_id: int,
):
    if discharge_id is None:
        return None

    discharge = (
        db.query(models.Discharge)
        .filter(
            models.Discharge.id
            == discharge_id
        )
        .first()
    )

    if discharge is None:
        raise ValueError(
            "Discharge not found."
        )

    if discharge.patient_id != patient_id:
        raise ValueError(
            "Discharge does not belong to the selected patient."
        )

    if discharge.encounter_id != encounter_id:
        raise ValueError(
            "Discharge does not belong to the selected clinical encounter."
        )

    if discharge.status == "CANCELLED":
        raise ValueError(
            "Follow-up cannot be linked to a cancelled discharge."
        )

    return discharge


# -----------------------------------------------------
# CREATE FOLLOW-UP
# -----------------------------------------------------


def create_follow_up(
    db: Session,
    follow_up: schemas.FollowUpCreate,
    doctor_id: int,
):
    """
    Create a scheduled patient follow-up.

    The authenticated doctor is stored as doctor_id.
    """

    _validate_follow_up_doctor(
        db,
        doctor_id,
    )

    _validate_follow_up_type(
        follow_up.follow_up_type
    )

    _validate_follow_up_priority(
        follow_up.priority
    )

    _validate_follow_up_target(
        db=db,
        patient_id=follow_up.patient_id,
        encounter_id=follow_up.encounter_id,
    )

    discharge = _validate_follow_up_discharge(
        db=db,
        discharge_id=follow_up.discharge_id,
        patient_id=follow_up.patient_id,
        encounter_id=follow_up.encounter_id,
    )

    # -------------------------------------------------
    # CREATE
    # -------------------------------------------------

    db_follow_up = models.FollowUp(
        patient_id=follow_up.patient_id,
        encounter_id=follow_up.encounter_id,
        discharge_id=follow_up.discharge_id,
        doctor_id=doctor_id,
        follow_up_type=(
            follow_up.follow_up_type
            .strip()
            .upper()
        ),
        priority=(
            follow_up.priority
            .strip()
            .upper()
        ),
        status="SCHEDULED",
        scheduled_at=follow_up.scheduled_at,
        reason=follow_up.reason,
        clinical_summary=follow_up.clinical_summary,
        instructions=follow_up.instructions,
        notes=follow_up.notes,
    )

    db.add(db_follow_up)

    db.commit()
    db.refresh(db_follow_up)

    return get_follow_up(
        db,
        db_follow_up.id,
    )


# -----------------------------------------------------
# UPDATE FOLLOW-UP
# -----------------------------------------------------


def update_follow_up(
    db: Session,
    follow_up_id: int,
    follow_up: schemas.FollowUpUpdate,
    doctor_id: int,
):
    db_follow_up = get_follow_up(
        db,
        follow_up_id,
    )

    if db_follow_up is None:
        return None

    if (
        db_follow_up.doctor_id
        != doctor_id
    ):
        raise ValueError(
            "Only the assigned doctor can edit this follow-up."
        )

    if db_follow_up.status != "SCHEDULED":
        raise ValueError(
            "Only scheduled follow-ups can be edited."
        )

    update_data = follow_up.model_dump(
        exclude_unset=True
    )

    # -------------------------------------------------
    # VALIDATE TYPE
    # -------------------------------------------------

    if "follow_up_type" in update_data:
        update_data["follow_up_type"] = (
            _validate_follow_up_type(
                update_data["follow_up_type"]
            )
        )

    # -------------------------------------------------
    # VALIDATE PRIORITY
    # -------------------------------------------------

    if "priority" in update_data:
        update_data["priority"] = (
            _validate_follow_up_priority(
                update_data["priority"]
            )
        )

    # -------------------------------------------------
    # VALIDATE TARGET CHANGES
    # -------------------------------------------------

    target_patient_id = update_data.get(
        "patient_id",
        db_follow_up.patient_id,
    )

    target_encounter_id = update_data.get(
        "encounter_id",
        db_follow_up.encounter_id,
    )

    target_discharge_id = update_data.get(
        "discharge_id",
        db_follow_up.discharge_id,
    )

    _validate_follow_up_target(
        db=db,
        patient_id=target_patient_id,
        encounter_id=target_encounter_id,
    )

    _validate_follow_up_discharge(
        db=db,
        discharge_id=target_discharge_id,
        patient_id=target_patient_id,
        encounter_id=target_encounter_id,
    )

    # -------------------------------------------------
    # APPLY UPDATE
    # -------------------------------------------------

    for field, value in update_data.items():
        setattr(
            db_follow_up,
            field,
            value,
        )

    db.commit()
    db.refresh(db_follow_up)

    return get_follow_up(
        db,
        db_follow_up.id,
    )


# -----------------------------------------------------
# UPDATE FOLLOW-UP STATUS
# -----------------------------------------------------


def update_follow_up_status(
    db: Session,
    follow_up_id: int,
    status_update: schemas.FollowUpStatusUpdate,
    doctor_id: int,
):
    db_follow_up = get_follow_up(
        db,
        follow_up_id,
    )

    if db_follow_up is None:
        return None

    if (
        db_follow_up.doctor_id
        != doctor_id
    ):
        raise ValueError(
            "Only the assigned doctor can change this follow-up status."
        )

    new_status = _validate_follow_up_status(
        status_update.status
    )

    current_status = db_follow_up.status

    allowed_transitions = {
        "SCHEDULED": {
            "COMPLETED",
            "CANCELLED",
            "MISSED",
        },
        "COMPLETED": set(),
        "CANCELLED": set(),
        "MISSED": set(),
    }

    if (
        new_status
        not in allowed_transitions.get(
            current_status,
            set(),
        )
    ):
        raise ValueError(
            f"Invalid follow-up status transition: "
            f"{current_status} -> {new_status}."
        )

    now = datetime.now(
        timezone.utc
    )

    db_follow_up.status = new_status

    if new_status == "COMPLETED":
        db_follow_up.completed_at = now

    elif new_status == "CANCELLED":
        db_follow_up.cancelled_at = now

    db.commit()
    db.refresh(db_follow_up)

    return get_follow_up(
        db,
        db_follow_up.id,
    )