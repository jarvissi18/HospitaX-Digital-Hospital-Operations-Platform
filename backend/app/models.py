from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Float,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# =====================================================
# HOSPITAL STRUCTURE
# =====================================================


class Department(Base):
    __tablename__ = "departments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )

    code = Column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
    )

    description = Column(
        String(255),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    floors = relationship(
        "Floor",
        back_populates="department",
        cascade="all, delete-orphan",
    )


# =====================================================
# FLOOR
# =====================================================


class Floor(Base):
    __tablename__ = "floors"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    floor_number = Column(
        Integer,
        nullable=False,
    )

    department_id = Column(
        Integer,
        ForeignKey(
            "departments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    department = relationship(
        "Department",
        back_populates="floors",
    )

    wards = relationship(
        "Ward",
        back_populates="floor",
        cascade="all, delete-orphan",
    )


# =====================================================
# WARD
# =====================================================


class Ward(Base):
    __tablename__ = "wards"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    ward_type = Column(
        String(50),
        nullable=False,
    )

    floor_id = Column(
        Integer,
        ForeignKey(
            "floors.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    description = Column(
        String(255),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    floor = relationship(
        "Floor",
        back_populates="wards",
    )

    rooms = relationship(
        "Room",
        back_populates="ward",
        cascade="all, delete-orphan",
    )


# =====================================================
# ROOM
# =====================================================


class Room(Base):
    __tablename__ = "rooms"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    room_number = Column(
        String(30),
        nullable=False,
        index=True,
    )

    room_type = Column(
        String(50),
        nullable=False,
    )

    capacity = Column(
        Integer,
        nullable=False,
        default=1,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Available",
        index=True,
    )

    ward_id = Column(
        Integer,
        ForeignKey(
            "wards.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    ward = relationship(
        "Ward",
        back_populates="rooms",
    )

    beds = relationship(
        "Bed",
        back_populates="room",
        cascade="all, delete-orphan",
    )

    housekeeper_assignments = relationship(
        "RoomHousekeeperAssignment",
        back_populates="room",
        cascade="all, delete-orphan",
    )


# =====================================================
# BED
# =====================================================


class Bed(Base):
    __tablename__ = "beds"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    bed_number = Column(
        String(30),
        nullable=False,
        index=True,
    )

    bed_type = Column(
        String(50),
        nullable=False,
        default="Standard",
    )

    status = Column(
        String(30),
        nullable=False,
        default="Available",
        index=True,
    )

    room_id = Column(
        Integer,
        ForeignKey(
            "rooms.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    room = relationship(
        "Room",
        back_populates="beds",
    )


# =====================================================
# PATIENTS
# =====================================================


class Patient(Base):
    __tablename__ = "patients"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    age = Column(
        Integer,
        nullable=False,
    )

    gender = Column(
        String(20),
        nullable=False,
    )

    village = Column(
        String(100),
        nullable=False,
    )

    disease = Column(
        String(150),
        nullable=False,
    )

    mobile = Column(
        String(15),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


# =====================================================
# SETTINGS
# =====================================================


class Settings(Base):
    __tablename__ = "settings"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # Hospital Information
    # -------------------------------------------------

    hospital_name = Column(
        String(150),
        default="MediVoice AI Hospital",
    )

    hospital_address = Column(
        String(255),
        default="",
    )

    hospital_phone = Column(
        String(20),
        default="",
    )

    hospital_email = Column(
        String(100),
        default="",
    )

    # -------------------------------------------------
    # Administrator Profile
    # -------------------------------------------------

    admin_name = Column(
        String(100),
        default="Admin",
    )

    admin_email = Column(
        String(100),
        default="admin@medivoice.ai",
    )

    admin_phone = Column(
        String(20),
        default="",
    )

    admin_role = Column(
        String(50),
        default="Administrator",
    )

    # -------------------------------------------------
    # Timestamps
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# =====================================================
# USERS / STAFF
# =====================================================


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # STAFF IDENTITY
    # -------------------------------------------------

    employee_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    full_name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
    )

    mobile = Column(
        String(15),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # AUTHENTICATION
    # -------------------------------------------------

    password_hash = Column(
        String(255),
        nullable=False,
    )

    pin_hash = Column(
        String(255),
        nullable=True,
    )

    # -------------------------------------------------
    # WORKFORCE
    # -------------------------------------------------

    role = Column(
        String(30),
        nullable=False,
        default="Receptionist",
        index=True,
    )

    shift = Column(
        String(30),
        nullable=True,
        index=True,
    )

    is_active = Column(
        String(10),
        nullable=False,
        default="true",
        index=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # ATTENDANCE
    # -------------------------------------------------

    attendance_records = relationship(
        "Attendance",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # -------------------------------------------------
    # ROOM HOUSEKEEPING ASSIGNMENTS
    # -------------------------------------------------

    housekeeper_assignments = relationship(
        "RoomHousekeeperAssignment",
        back_populates="housekeeper",
        cascade="all, delete-orphan",
        foreign_keys="RoomHousekeeperAssignment.housekeeper_id",
    )

    # -------------------------------------------------
    # WORK MANAGEMENT
    # -------------------------------------------------

    assigned_work_tasks = relationship(
        "WorkTask",
        foreign_keys="WorkTask.assigned_to_id",
        back_populates="assigned_to",
    )

    created_work_tasks = relationship(
        "WorkTask",
        foreign_keys="WorkTask.created_by_id",
        back_populates="created_by",
    )


# =====================================================
# STAFF ATTENDANCE
# =====================================================


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    attendance_date = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    shift = Column(
        String(30),
        nullable=False,
    )

    check_in = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    check_out = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Absent",
        index=True,
    )

    work_duration_minutes = Column(
        Integer,
        nullable=True,
    )

    notes = Column(
        String(500),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship(
        "User",
        back_populates="attendance_records",
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "attendance_date",
            name="uq_attendance_user_date",
        ),
    )


# =====================================================
# ROOM HOUSEKEEPER ASSIGNMENT
# =====================================================


class RoomHousekeeperAssignment(Base):
    __tablename__ = "room_housekeeper_assignments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    housekeeper_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    room_id = Column(
        Integer,
        ForeignKey(
            "rooms.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    assignment_status = Column(
        String(30),
        nullable=False,
        default="Active",
        index=True,
    )

    responsibilities = Column(
        String(1000),
        nullable=True,
    )

    notes = Column(
        String(500),
        nullable=True,
    )

    assigned_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    housekeeper = relationship(
        "User",
        back_populates="housekeeper_assignments",
        foreign_keys=[housekeeper_id],
    )

    room = relationship(
        "Room",
        back_populates="housekeeper_assignments",
    )


# =====================================================
# WORK MANAGEMENT
# =====================================================


class WorkTask(Base):
    __tablename__ = "work_tasks"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    title = Column(
        String(150),
        nullable=False,
        index=True,
    )

    description = Column(
        String(1000),
        nullable=True,
    )

    assigned_to_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    created_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    priority = Column(
        String(20),
        nullable=False,
        default="Medium",
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True,
    )

    due_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    location = Column(
        String(255),
        nullable=True,
    )

    instructions = Column(
        String(1500),
        nullable=True,
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    assigned_to = relationship(
        "User",
        foreign_keys=[assigned_to_id],
        back_populates="assigned_work_tasks",
    )

    created_by = relationship(
        "User",
        foreign_keys=[created_by_id],
        back_populates="created_work_tasks",
    )


# =====================================================
# CLINICAL ENCOUNTER
# =====================================================


class ClinicalEncounter(Base):
    __tablename__ = "clinical_encounters"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    doctor_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Draft",
        index=True,
    )

    chief_complaint = Column(
        String(1000),
        nullable=True,
    )

    symptoms = Column(
        String(3000),
        nullable=True,
    )

    clinical_notes = Column(
        String(5000),
        nullable=True,
    )

    diagnosis = Column(
        String(2000),
        nullable=True,
    )

    treatment_plan = Column(
        String(3000),
        nullable=True,
    )

    prescription = Column(
        String(5000),
        nullable=True,
    )

    follow_up_date = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# =====================================================
# PRESCRIPTION
# =====================================================
#
# Prescription represents a structured medication
# prescription created by a Doctor for a patient.
#
# One ClinicalEncounter can have multiple prescription
# records over time.
#
# Prescription itself contains the prescription-level
# information while PrescriptionItem contains each
# individual medication.
#
# =====================================================


class Prescription(Base):
    __tablename__ = "prescriptions"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # PATIENT
    # -------------------------------------------------

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL ENCOUNTER
    # -------------------------------------------------

    encounter_id = Column(
        Integer,
        ForeignKey(
            "clinical_encounters.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # PRESCRIBING DOCTOR
    # -------------------------------------------------

    prescribed_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # STATUS
    # -------------------------------------------------
    #
    # Allowed values:
    #
    #     DRAFT
    #     ACTIVE
    #     COMPLETED
    #     DISCONTINUED
    #     CANCELLED
    #
    # -------------------------------------------------

    status = Column(
        String(30),
        nullable=False,
        default="DRAFT",
        index=True,
    )

    # -------------------------------------------------
    # PRESCRIPTION NOTES
    # -------------------------------------------------

    notes = Column(
        String(2000),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    prescribed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    activated_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    discontinued_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # -------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------

    items = relationship(
        "PrescriptionItem",
        back_populates="prescription",
        cascade="all, delete-orphan",
        order_by="PrescriptionItem.id",
    )

    # -------------------------------------------------
    # READ-ONLY DISPLAY RELATIONSHIPS
    # -------------------------------------------------
    #
    # These relationships do NOT add new database
    # columns. They allow the prescription response
    # layer to expose the patient's name and the
    # prescribing doctor's name without requiring
    # duplicate data to be stored in prescriptions.
    #

    patient = relationship(
        "Patient",
        foreign_keys=[patient_id],
    )

    prescribed_by = relationship(
        "User",
        foreign_keys=[prescribed_by_id],
    )

    @property
    def patient_name(self):
        if self.patient is None:
            return None

        return self.patient.name

    @property
    def doctor_name(self):
        if self.prescribed_by is None:
            return None

        return self.prescribed_by.full_name


# =====================================================
# PRESCRIPTION ITEM
# =====================================================
#
# PrescriptionItem represents one medication inside
# a prescription.
#
# Example:
#
#     Paracetamol
#     500 mg
#     Tablet
#     Oral
#     1 tablet
#     Twice daily
#     5 days
#
# =====================================================


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # PRESCRIPTION
    # -------------------------------------------------

    prescription_id = Column(
        Integer,
        ForeignKey(
            "prescriptions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # MEDICATION
    # -------------------------------------------------

    medication_name = Column(
        String(200),
        nullable=False,
        index=True,
    )

    generic_name = Column(
        String(200),
        nullable=True,
    )

    # -------------------------------------------------
    # MEDICATION DETAILS
    # -------------------------------------------------

    strength = Column(
        String(100),
        nullable=True,
    )

    dosage_form = Column(
        String(50),
        nullable=True,
    )

    route = Column(
        String(50),
        nullable=True,
    )

    # -------------------------------------------------
    # DOSAGE
    # -------------------------------------------------

    dose = Column(
        String(100),
        nullable=True,
    )

    frequency = Column(
        String(100),
        nullable=True,
    )

    # -------------------------------------------------
    # DURATION
    # -------------------------------------------------

    duration_value = Column(
        Integer,
        nullable=True,
    )

    duration_unit = Column(
        String(30),
        nullable=True,
    )

    # -------------------------------------------------
    # QUANTITY
    # -------------------------------------------------

    quantity = Column(
        String(100),
        nullable=True,
    )

    # -------------------------------------------------
    # PRN / AS NEEDED
    # -------------------------------------------------

    is_prn = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    # -------------------------------------------------
    # INSTRUCTIONS
    # -------------------------------------------------

    instructions = Column(
        String(1000),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # RELATIONSHIP
    # -------------------------------------------------

    prescription = relationship(
        "Prescription",
        back_populates="items",
    )


# =====================================================
# NURSING OBSERVATION
# =====================================================


# =====================================================
# REFERRAL
# =====================================================
#
# Referral represents a formal clinical request from one
# Doctor to another Doctor and/or Department for specialist
# consultation or additional clinical care.
#
# Referral lifecycle:                                       
#     PENDING -> ACCEPTED -> IN_PROGRESS -> COMPLETED     
#     PENDING -> REJECTED                                  
#     PENDING -> CANCELLED                                 
#
# The model keeps the original clinical context through
# patient_id + encounter_id and preserves both the
# referring Doctor and the optional receiving Doctor.
#
# =====================================================


class Referral(Base):
    __tablename__ = "referrals"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # PATIENT
    # -------------------------------------------------

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL ENCOUNTER
    # -------------------------------------------------

    encounter_id = Column(
        Integer,
        ForeignKey(
            "clinical_encounters.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # REFERRING DOCTOR
    # -------------------------------------------------

    referred_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # RECEIVING DOCTOR
    # -------------------------------------------------
    #
    # Optional because a referral can initially be sent
    # only to a Department/Specialty.
    #

    referred_to_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # DEPARTMENT
    # -------------------------------------------------
    #
    # Optional because a referral may target a specific
    # Doctor directly. Backend validation will require
    # at least one of referred_to_id or department_id.
    #

    department_id = Column(
        Integer,
        ForeignKey(
            "departments.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # SPECIALTY / REFERRAL TYPE
    # -------------------------------------------------

    specialty = Column(
        String(100),
        nullable=True,
        index=True,
    )

    referral_type = Column(
        String(50),
        nullable=False,
        default="Specialist Consultation",
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL REASON / SUMMARY
    # -------------------------------------------------

    reason = Column(
        String(2000),
        nullable=False,
    )

    clinical_summary = Column(
        String(5000),
        nullable=True,
    )

    # -------------------------------------------------
    # PRIORITY
    # -------------------------------------------------

    priority = Column(
        String(20),
        nullable=False,
        default="Medium",
        index=True,
    )

    # -------------------------------------------------
    # STATUS
    # -------------------------------------------------

    status = Column(
        String(30),
        nullable=False,
        default="PENDING",
        index=True,
    )

    # -------------------------------------------------
    # NOTES
    # -------------------------------------------------

    notes = Column(
        String(2000),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    referred_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    accepted_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    rejected_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # -------------------------------------------------
    # READ-ONLY DISPLAY RELATIONSHIPS
    # -------------------------------------------------

    patient = relationship(
        "Patient",
        foreign_keys=[patient_id],
    )

    encounter = relationship(
        "ClinicalEncounter",
        foreign_keys=[encounter_id],
    )

    referred_by = relationship(
        "User",
        foreign_keys=[referred_by_id],
    )

    referred_to = relationship(
        "User",
        foreign_keys=[referred_to_id],
    )

    department = relationship(
        "Department",
        foreign_keys=[department_id],
    )

    @property
    def patient_name(self):
        if self.patient is None:
            return None

        return self.patient.name

    @property
    def referring_doctor_name(self):
        if self.referred_by is None:
            return None

        return self.referred_by.full_name

    @property
    def receiving_doctor_name(self):
        if self.referred_to is None:
            return None

        return self.referred_to.full_name

    @property
    def department_name(self):
        if self.department is None:
            return None

        return self.department.name


class NursingObservation(Base):
    __tablename__ = "nursing_observations"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    nurse_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    blood_pressure = Column(
        String(30),
        nullable=True,
    )

    pulse = Column(
        Integer,
        nullable=True,
    )

    temperature = Column(
        Float,
        nullable=True,
    )

    oxygen_saturation = Column(
        Integer,
        nullable=True,
    )

    respiratory_rate = Column(
        Integer,
        nullable=True,
    )

    weight = Column(
        Float,
        nullable=True,
    )

    nursing_notes = Column(
        String(5000),
        nullable=True,
    )

    care_status = Column(
        String(30),
        nullable=False,
        default="Stable",
        index=True,
    )

    recorded_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# =====================================================
# PATIENT TRANSFER
# =====================================================
#
# Transfer represents a controlled intra-hospital movement
# request for a patient from one operational location to
# another.
#
# Lifecycle:
#
#     REQUESTED
#        ↓
#     APPROVED
#        ↓
#     IN_PROGRESS
#        ↓
#     COMPLETED
#
# Alternative terminal paths:
#
#     REQUESTED → REJECTED
#     REQUESTED → CANCELLED
#
# Source and destination location fields are stored as
# snapshots/references so the transfer history remains
# auditable even after the patient's active assignment
# changes.
#
# The transfer workflow must not silently mutate the
# PatientAssignment record until the transfer is actually
# completed.
#
# =====================================================


class PatientTransfer(Base):
    __tablename__ = "patient_transfers"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # PATIENT / ENCOUNTER
    # -------------------------------------------------

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    encounter_id = Column(
        Integer,
        ForeignKey(
            "clinical_encounters.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # REQUEST / APPROVAL / EXECUTION USERS
    # -------------------------------------------------

    requested_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    approved_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    completed_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # TRANSFER CLASSIFICATION
    # -------------------------------------------------

    transfer_type = Column(
        String(50),
        nullable=False,
        default="WARD_TRANSFER",
        index=True,
    )

    priority = Column(
        String(20),
        nullable=False,
        default="MEDIUM",
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="REQUESTED",
        index=True,
    )

    # -------------------------------------------------
    # SOURCE LOCATION
    # -------------------------------------------------

    source_department_id = Column(
        Integer,
        ForeignKey(
            "departments.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    source_ward_id = Column(
        Integer,
        ForeignKey(
            "wards.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    source_room_id = Column(
        Integer,
        ForeignKey(
            "rooms.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    source_bed_id = Column(
        Integer,
        ForeignKey(
            "beds.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # DESTINATION LOCATION
    # -------------------------------------------------

    destination_department_id = Column(
        Integer,
        ForeignKey(
            "departments.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    destination_ward_id = Column(
        Integer,
        ForeignKey(
            "wards.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    destination_room_id = Column(
        Integer,
        ForeignKey(
            "rooms.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    destination_bed_id = Column(
        Integer,
        ForeignKey(
            "beds.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL / OPERATIONAL CONTEXT
    # -------------------------------------------------

    reason = Column(
        String(2000),
        nullable=False,
    )

    clinical_summary = Column(
        String(5000),
        nullable=True,
    )

    handover_notes = Column(
        String(5000),
        nullable=True,
    )

    transport_mode = Column(
        String(50),
        nullable=True,
    )

    notes = Column(
        String(2000),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    requested_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    rejected_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------

    patient = relationship(
        "Patient",
        foreign_keys=[patient_id],
    )

    encounter = relationship(
        "ClinicalEncounter",
        foreign_keys=[encounter_id],
    )

    requested_by = relationship(
        "User",
        foreign_keys=[requested_by_id],
    )

    approved_by = relationship(
        "User",
        foreign_keys=[approved_by_id],
    )

    completed_by = relationship(
        "User",
        foreign_keys=[completed_by_id],
    )

    source_department = relationship(
        "Department",
        foreign_keys=[source_department_id],
    )

    source_ward = relationship(
        "Ward",
        foreign_keys=[source_ward_id],
    )

    source_room = relationship(
        "Room",
        foreign_keys=[source_room_id],
    )

    source_bed = relationship(
        "Bed",
        foreign_keys=[source_bed_id],
    )

    destination_department = relationship(
        "Department",
        foreign_keys=[destination_department_id],
    )

    destination_ward = relationship(
        "Ward",
        foreign_keys=[destination_ward_id],
    )

    destination_room = relationship(
        "Room",
        foreign_keys=[destination_room_id],
    )

    destination_bed = relationship(
        "Bed",
        foreign_keys=[destination_bed_id],
    )

    # -------------------------------------------------
    # READ-ONLY DISPLAY PROPERTIES
    # -------------------------------------------------

    @property
    def patient_name(self):
        if self.patient is None:
            return None

        return self.patient.name

    @property
    def requesting_user_name(self):
        if self.requested_by is None:
            return None

        return self.requested_by.full_name

    @property
    def approving_user_name(self):
        if self.approved_by is None:
            return None

        return self.approved_by.full_name

    @property
    def completed_by_name(self):
        if self.completed_by is None:
            return None

        return self.completed_by.full_name

    @property
    def source_department_name(self):
        if self.source_department is None:
            return None

        return self.source_department.name

    @property
    def source_ward_name(self):
        if self.source_ward is None:
            return None

        return self.source_ward.name

    @property
    def source_room_name(self):
        if self.source_room is None:
            return None

        return self.source_room.name

    @property
    def source_bed_name(self):
        if self.source_bed is None:
            return None

        return self.source_bed.bed_number

    @property
    def destination_department_name(self):
        if self.destination_department is None:
            return None

        return self.destination_department.name

    @property
    def destination_ward_name(self):
        if self.destination_ward is None:
            return None

        return self.destination_ward.name

    @property
    def destination_room_name(self):
        if self.destination_room is None:
            return None

        return self.destination_room.name

    @property
    def destination_bed_name(self):
        if self.destination_bed is None:
            return None

        return self.destination_bed.bed_number



# =====================================================
# PATIENT ASSIGNMENTS
# =====================================================


class PatientAssignment(Base):
    __tablename__ = "patient_assignments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    department_id = Column(
        Integer,
        ForeignKey(
            "departments.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    doctor_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    nurse_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    ward_id = Column(
        Integer,
        ForeignKey(
            "wards.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    bed_id = Column(
        Integer,
        ForeignKey(
            "beds.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    assignment_type = Column(
        String(50),
        nullable=False,
        default="Patient Allocation",
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Active",
        index=True,
    )

    notes = Column(
        String(500),
        nullable=True,
    )

    assigned_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    assigned_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    released_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )


# =====================================================
# APPOINTMENT
# =====================================================


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    department_id = Column(
        Integer,
        ForeignKey(
            "departments.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    doctor_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    scheduled_at = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    appointment_type = Column(
        String(30),
        nullable=False,
        default="Scheduled",
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Scheduled",
        index=True,
    )

    reason = Column(
        String(1000),
        nullable=True,
    )

    notes = Column(
        String(2000),
        nullable=True,
    )

    created_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# =====================================================
# PATIENT QUEUE / TRIAGE
# =====================================================


class PatientQueue(Base):
    __tablename__ = "patient_queue"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    appointment_id = Column(
        Integer,
        ForeignKey(
            "appointments.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    department_id = Column(
        Integer,
        ForeignKey(
            "departments.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    queue_number = Column(
        Integer,
        nullable=False,
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="Waiting",
        index=True,
    )

    triage_priority = Column(
        String(30),
        nullable=False,
        default="Normal",
        index=True,
    )

    triage_status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True,
    )

    triage_notes = Column(
        String(3000),
        nullable=True,
    )

    triaged_by = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    triaged_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    queued_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    called_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "department_id",
            "queue_number",
            "queued_at",
            name="uq_patient_queue_department_number_time",
        ),
    )


# =====================================================
# LAB MANAGEMENT
# =====================================================
#
# Laboratory subsystem for diagnostic test ordering,
# sample collection, result entry, validation and
# doctor review.
#
# Core relationship:
#
#     ClinicalEncounter
#             ↓
#         LabOrder
#             ↓
#       LabOrderItem
#          ↙      ↘
#     LabTest    LabResult
#
#     LabOrder
#        ↓
#     LabSample
#
# IMPORTANT:
#
# Lab data is intentionally kept separate from
# ClinicalEncounter.
#
# ClinicalEncounter remains the consultation record.
# LabOrder represents the diagnostic investigation.
#
# =====================================================


# =====================================================
# LAB TEST CATALOG
# =====================================================


class LabTest(Base):
    __tablename__ = "lab_tests"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # TEST IDENTIFICATION
    # -------------------------------------------------

    code = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    name = Column(
        String(150),
        nullable=False,
        index=True,
    )

    category = Column(
        String(100),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # SPECIMEN
    # -------------------------------------------------
    #
    # Examples:
    #
    # Blood
    # Urine
    # Serum
    # Plasma
    # Stool
    # Swab
    #
    # -------------------------------------------------

    specimen_type = Column(
        String(100),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # RESULT CONFIGURATION
    # -------------------------------------------------
    #
    # Examples:
    #
    # Numeric
    # Text
    # Positive/Negative
    # Qualitative
    #
    # -------------------------------------------------

    result_type = Column(
        String(30),
        nullable=False,
        default="Numeric",
        index=True,
    )

    unit = Column(
        String(50),
        nullable=True,
    )

    # -------------------------------------------------
    # REFERENCE RANGE
    # -------------------------------------------------
    #
    # Used primarily for numeric laboratory results.
    #
    # -------------------------------------------------

    reference_range_text = Column(
        String(255),
        nullable=True,
    )

    reference_min = Column(
        Float,
        nullable=True,
    )

    reference_max = Column(
        Float,
        nullable=True,
    )

    # -------------------------------------------------
    # TEST STATUS
    # -------------------------------------------------

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    description = Column(
        String(1000),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------

    order_items = relationship(
        "LabOrderItem",
        back_populates="lab_test",
    )


# =====================================================
# LAB ORDER
# =====================================================
#
# Represents a diagnostic order created from a clinical
# encounter.
#
# One order can contain multiple tests.
#
# Example:
#
#     LabOrder #1001
#         ├── CBC
#         ├── Blood Glucose
#         └── Lipid Profile
#
# =====================================================


class LabOrder(Base):
    __tablename__ = "lab_orders"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # PATIENT
    # -------------------------------------------------

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL ENCOUNTER
    # -------------------------------------------------
    #
    # Lab orders originate from a clinical encounter.
    #
    # -------------------------------------------------

    encounter_id = Column(
        Integer,
        ForeignKey(
            "clinical_encounters.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # ORDERING DOCTOR
    # -------------------------------------------------

    ordered_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # ORDER PRIORITY
    # -------------------------------------------------
    #
    # Routine
    # Urgent
    # STAT
    #
    # -------------------------------------------------

    priority = Column(
        String(20),
        nullable=False,
        default="Routine",
        index=True,
    )

    # -------------------------------------------------
    # ORDER STATUS
    # -------------------------------------------------
    #
    # Lifecycle:
    #
    #     ORDERED
    #       ↓
    #     SAMPLE_PENDING
    #       ↓
    #     COLLECTED
    #       ↓
    #     PROCESSING
    #       ↓
    #     RESULT_ENTERED
    #       ↓
    #     TECHNICALLY_VALIDATED
    #       ↓
    #     DOCTOR_REVIEW
    #       ↓
    #     FINALIZED
    #
    # Terminal:
    #
    #     CANCELLED
    #     REJECTED
    #
    # -------------------------------------------------

    status = Column(
        String(40),
        nullable=False,
        default="ORDERED",
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL REASON
    # -------------------------------------------------

    clinical_indication = Column(
        String(2000),
        nullable=True,
    )

    notes = Column(
        String(3000),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    ordered_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    finalized_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # -------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------

    items = relationship(
        "LabOrderItem",
        back_populates="lab_order",
        cascade="all, delete-orphan",
    )

    samples = relationship(
        "LabSample",
        back_populates="lab_order",
        cascade="all, delete-orphan",
    )


# =====================================================
# LAB ORDER ITEM
# =====================================================
#
# Connects one LabOrder with one LabTest.
#
# This allows:
#
#     One order
#         ↓
#     Multiple tests
#
# =====================================================


class LabOrderItem(Base):
    __tablename__ = "lab_order_items"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # LAB ORDER
    # -------------------------------------------------

    lab_order_id = Column(
        Integer,
        ForeignKey(
            "lab_orders.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # LAB TEST
    # -------------------------------------------------

    lab_test_id = Column(
        Integer,
        ForeignKey(
            "lab_tests.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # ITEM STATUS
    # -------------------------------------------------
    #
    # Allows individual tests to progress while still
    # belonging to the same order.
    #
    # -------------------------------------------------

    status = Column(
        String(40),
        nullable=False,
        default="ORDERED",
        index=True,
    )

    # -------------------------------------------------
    # TEST-SPECIFIC NOTES
    # -------------------------------------------------

    notes = Column(
        String(1500),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------

    lab_order = relationship(
        "LabOrder",
        back_populates="items",
    )

    lab_test = relationship(
        "LabTest",
        back_populates="order_items",
    )

    result = relationship(
        "LabResult",
        back_populates="order_item",
        uselist=False,
        cascade="all, delete-orphan",
    )


# =====================================================
# LAB SAMPLE
# =====================================================
#
# Represents the physical specimen collected for a
# laboratory order.
#
# A future implementation can support multiple samples
# per order when different specimen types are required.
#
# =====================================================


class LabSample(Base):
    __tablename__ = "lab_samples"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # LAB ORDER
    # -------------------------------------------------

    lab_order_id = Column(
        Integer,
        ForeignKey(
            "lab_orders.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # SAMPLE IDENTIFICATION
    # -------------------------------------------------

    sample_code = Column(
        String(80),
        nullable=False,
        unique=True,
        index=True,
    )

    specimen_type = Column(
        String(100),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # SAMPLE STATUS
    # -------------------------------------------------
    #
    # Expected lifecycle:
    #
    #     Pending
    #     Collected
    #     Received
    #     Rejected
    #     Processed
    #
    # -------------------------------------------------

    status = Column(
        String(30),
        nullable=False,
        default="Pending",
        index=True,
    )

    # -------------------------------------------------
    # COLLECTION
    # -------------------------------------------------

    collected_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    collected_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # LAB RECEIVING
    # -------------------------------------------------

    received_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # -------------------------------------------------
    # REJECTION
    # -------------------------------------------------

    rejection_reason = Column(
        String(1000),
        nullable=True,
    )

    # -------------------------------------------------
    # SAMPLE NOTES
    # -------------------------------------------------

    notes = Column(
        String(1500),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------

    lab_order = relationship(
        "LabOrder",
        back_populates="samples",
    )


# =====================================================
# LAB RESULT
# =====================================================
#
# Stores the diagnostic result for one LabOrderItem.
#
# Supports:
#
#     Numeric results
#     Text results
#     Reference ranges
#     Abnormal flags
#     Critical values
#     Technical validation
#     Doctor review
#     Finalization
#
# =====================================================


class LabResult(Base):
    __tablename__ = "lab_results"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # ORDER ITEM
    # -------------------------------------------------
    #
    # One LabOrderItem has one final result record.
    #
    # -------------------------------------------------

    lab_order_item_id = Column(
        Integer,
        ForeignKey(
            "lab_order_items.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    # -------------------------------------------------
    # RESULT STATUS
    # -------------------------------------------------
    #
    # Lifecycle:
    #
    #     RESULT_ENTERED
    #     TECHNICALLY_VALIDATED
    #     DOCTOR_REVIEW
    #     FINALIZED
    #
    # -------------------------------------------------

    status = Column(
        String(40),
        nullable=False,
        default="RESULT_ENTERED",
        index=True,
    )

    # -------------------------------------------------
    # NUMERIC RESULT
    # -------------------------------------------------
    #
    # Used when LabTest.result_type == Numeric.
    #
    # -------------------------------------------------

    numeric_value = Column(
        Float,
        nullable=True,
    )

    # -------------------------------------------------
    # TEXT RESULT
    # -------------------------------------------------
    #
    # Used for qualitative/text-based results.
    #
    # -------------------------------------------------

    text_value = Column(
        String(5000),
        nullable=True,
    )

    # -------------------------------------------------
    # UNIT
    # -------------------------------------------------

    unit = Column(
        String(50),
        nullable=True,
    )

    # -------------------------------------------------
    # REFERENCE RANGE
    # -------------------------------------------------
    #
    # Snapshot stored with the result so that a future
    # change to the LabTest catalog does not rewrite
    # historical reports.
    #
    # -------------------------------------------------

    reference_range_text = Column(
        String(255),
        nullable=True,
    )

    reference_min = Column(
        Float,
        nullable=True,
    )

    reference_max = Column(
        Float,
        nullable=True,
    )

    # -------------------------------------------------
    # INTERPRETATION
    # -------------------------------------------------
    #
    # Examples:
    #
    # Normal
    # Low
    # High
    # Critical
    # Positive
    # Negative
    #
    # -------------------------------------------------

    abnormal_flag = Column(
        String(30),
        nullable=True,
        index=True,
    )

    is_critical = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    interpretation = Column(
        String(2000),
        nullable=True,
    )

    result_notes = Column(
        String(3000),
        nullable=True,
    )

    # -------------------------------------------------
    # RESULT ENTERED BY
    # -------------------------------------------------

    entered_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    entered_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # -------------------------------------------------
    # TECHNICAL VALIDATION
    # -------------------------------------------------

    validated_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    validated_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    validation_notes = Column(
        String(2000),
        nullable=True,
    )

    # -------------------------------------------------
    # DOCTOR REVIEW
    # -------------------------------------------------

    reviewed_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    review_notes = Column(
        String(2000),
        nullable=True,
    )

    # -------------------------------------------------
    # FINALIZATION
    # -------------------------------------------------

    finalized_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # RELATIONSHIP
    # -------------------------------------------------

    order_item = relationship(
        "LabOrderItem",
        back_populates="result",
    )
    
# =====================================================
# DISCHARGE
# =====================================================
#
# Discharge represents the formal clinical discharge
# process of a patient from the hospital.
#
# Lifecycle:
#
#     PLANNED
#        ↓
#     READY
#        ↓
#     DISCHARGED
#
# Alternative:
#
#     PLANNED → CANCELLED
#
# A discharge belongs to a Patient and ClinicalEncounter.
# The record stores the final clinical and operational
# information required for discharge and follow-up.
#
# =====================================================


class Discharge(Base):
    __tablename__ = "discharges"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # PATIENT
    # -------------------------------------------------

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL ENCOUNTER
    # -------------------------------------------------

    encounter_id = Column(
        Integer,
        ForeignKey(
            "clinical_encounters.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # DISCHARGE DOCTOR
    # -------------------------------------------------

    discharged_by_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # STATUS
    # -------------------------------------------------

    # Allowed values:
    #
    #     PLANNED
    #     READY
    #     DISCHARGED
    #     CANCELLED
    #
    # -------------------------------------------------

    status = Column(
        String(30),
        nullable=False,
        default="PLANNED",
        index=True,
    )

    # -------------------------------------------------
    # DISCHARGE TYPE
    # -------------------------------------------------

    # Examples:
    #
    #     ROUTINE
    #     LAMA
    #     REFERRED
    #     TRANSFERRED
    #     DECEASED
    #
    # -------------------------------------------------

    discharge_type = Column(
        String(30),
        nullable=False,
        default="ROUTINE",
        index=True,
    )

    # -------------------------------------------------
    # FINAL CLINICAL INFORMATION
    # -------------------------------------------------

    final_diagnosis = Column(
        String(3000),
        nullable=True,
    )

    clinical_summary = Column(
        String(5000),
        nullable=True,
    )

    condition_at_discharge = Column(
        String(1000),
        nullable=True,
    )

    treatment_summary = Column(
        String(5000),
        nullable=True,
    )

    # -------------------------------------------------
    # MEDICATIONS / INSTRUCTIONS
    # -------------------------------------------------

    discharge_medications = Column(
        String(5000),
        nullable=True,
    )

    discharge_instructions = Column(
        String(5000),
        nullable=True,
    )

    diet_instructions = Column(
        String(2000),
        nullable=True,
    )

    activity_restrictions = Column(
        String(2000),
        nullable=True,
    )

    warning_signs = Column(
        String(3000),
        nullable=True,
    )

    # -------------------------------------------------
    # FOLLOW-UP
    # -------------------------------------------------

    follow_up_required = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    follow_up_date = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    follow_up_instructions = Column(
        String(3000),
        nullable=True,
    )

    # -------------------------------------------------
    # OPERATIONAL NOTES
    # -------------------------------------------------

    notes = Column(
        String(3000),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    planned_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    ready_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    discharged_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------

    patient = relationship(
        "Patient",
        foreign_keys=[patient_id],
    )

    encounter = relationship(
        "ClinicalEncounter",
        foreign_keys=[encounter_id],
    )

    discharged_by = relationship(
        "User",
        foreign_keys=[discharged_by_id],
    )

    # -------------------------------------------------
    # DISPLAY PROPERTIES
    # -------------------------------------------------

    @property
    def patient_name(self):
        if self.patient is None:
            return None

        return self.patient.name

    @property
    def doctor_name(self):
        if self.discharged_by is None:
            return None

        return self.discharged_by.full_name


# =====================================================
# FOLLOW-UP
# =====================================================
#
# FollowUp represents a scheduled clinical follow-up
# after discharge or as part of an ongoing encounter.
#
# Lifecycle:
#
#     SCHEDULED
#        ↓
#     COMPLETED
#
# Alternative terminal paths:
#
#     SCHEDULED → CANCELLED
#     SCHEDULED → MISSED
#
# =====================================================


class FollowUp(Base):
    __tablename__ = "follow_ups"

    # -------------------------------------------------
    # PRIMARY KEY
    # -------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # -------------------------------------------------
    # PATIENT
    # -------------------------------------------------

    patient_id = Column(
        Integer,
        ForeignKey(
            "patients.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL ENCOUNTER
    # -------------------------------------------------

    encounter_id = Column(
        Integer,
        ForeignKey(
            "clinical_encounters.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # DISCHARGE
    # -------------------------------------------------

    discharge_id = Column(
        Integer,
        ForeignKey(
            "discharges.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # FOLLOW-UP DOCTOR
    # -------------------------------------------------

    doctor_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # FOLLOW-UP CLASSIFICATION
    # -------------------------------------------------

    follow_up_type = Column(
        String(50),
        nullable=False,
        default="ROUTINE",
        index=True,
    )

    priority = Column(
        String(20),
        nullable=False,
        default="MEDIUM",
        index=True,
    )

    # -------------------------------------------------
    # STATUS
    # -------------------------------------------------

    # Allowed values:
    #
    #     SCHEDULED
    #     COMPLETED
    #     CANCELLED
    #     MISSED
    #
    # -------------------------------------------------

    status = Column(
        String(30),
        nullable=False,
        default="SCHEDULED",
        index=True,
    )

    # -------------------------------------------------
    # SCHEDULE
    # -------------------------------------------------

    scheduled_at = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    # -------------------------------------------------
    # CLINICAL PURPOSE
    # -------------------------------------------------

    reason = Column(
        String(2000),
        nullable=False,
    )

    clinical_summary = Column(
        String(5000),
        nullable=True,
    )

    instructions = Column(
        String(3000),
        nullable=True,
    )

    notes = Column(
        String(3000),
        nullable=True,
    )

    # -------------------------------------------------
    # COMPLETION
    # -------------------------------------------------

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # -------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # -------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------

    patient = relationship(
        "Patient",
        foreign_keys=[patient_id],
    )

    encounter = relationship(
        "ClinicalEncounter",
        foreign_keys=[encounter_id],
    )

    discharge = relationship(
        "Discharge",
        foreign_keys=[discharge_id],
    )

    doctor = relationship(
        "User",
        foreign_keys=[doctor_id],
    )

    # -------------------------------------------------
    # DISPLAY PROPERTIES
    # -------------------------------------------------

    @property
    def patient_name(self):
        if self.patient is None:
            return None

        return self.patient.name

    @property
    def doctor_name(self):
        if self.doctor is None:
            return None

        return self.doctor.full_name