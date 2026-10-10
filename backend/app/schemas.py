from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    EmailStr,
    ConfigDict,
    Field,
    model_validator,
    field_validator,
)


# =====================================================
# ATTENDANCE CONSTANTS
# =====================================================

ATTENDANCE_STATUSES = {
    "Present",
    "Absent",
    "Late",
    "Leave",
}


# =====================================================
# PATIENT
# =====================================================


class PatientBase(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    age: int = Field(
        ...,
        ge=0,
        le=120,
    )

    gender: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

    village: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    disease: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    mobile: str = Field(
        ...,
        min_length=10,
        max_length=15,
    )


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientResponse(PatientBase):

    id: int

    model_config = ConfigDict(
        from_attributes=True
    )

# =====================================================
# PATIENT ASSIGNMENT
# =====================================================


PATIENT_ASSIGNMENT_STATUSES = {
    "Active",
    "Released",
    "Transferred",
    "Cancelled",
}


PATIENT_ASSIGNMENT_TYPES = {
    "Patient Allocation",
    "Doctor Assignment",
    "Nurse Assignment",
    "Ward Assignment",
    "Bed Assignment",
}


class PatientAssignmentBase(BaseModel):
    """
    Represents the operational allocation of a patient.

    A single assignment may contain:
        - Department
        - Doctor
        - Nurse
        - Ward
        - Bed

    All assignment targets are optional because a patient
    can initially be allocated only to a department or
    doctor and later receive a ward / bed / nurse.
    """

    patient_id: int = Field(
        ...,
        gt=0,
    )

    department_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    doctor_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    nurse_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    ward_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    bed_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    assignment_type: str = Field(
        default="Patient Allocation",
        min_length=2,
        max_length=50,
    )

    status: str = Field(
        default="Active",
        min_length=2,
        max_length=30,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    @field_validator("assignment_type")
    @classmethod
    def validate_assignment_type(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if value not in PATIENT_ASSIGNMENT_TYPES:
            raise ValueError(
                "Invalid patient assignment type."
            )

        return value

    @field_validator("status")
    @classmethod
    def validate_assignment_status(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if value not in PATIENT_ASSIGNMENT_STATUSES:
            raise ValueError(
                "Invalid patient assignment status."
            )

        return value


class PatientAssignmentCreate(
    PatientAssignmentBase
):
    """
    Data required to create a patient assignment.

    assigned_by is intentionally NOT accepted from the
    frontend. It will be determined from the authenticated
    user on the backend.
    """

    pass


class PatientAssignmentUpdate(BaseModel):
    """
    Controlled update data for an existing patient
    assignment.

    Assignment history remains preserved in the database.
    """

    department_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    doctor_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    nurse_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    ward_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    bed_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    assignment_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=500,
    )

    @field_validator("assignment_type")
    @classmethod
    def validate_update_assignment_type(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in PATIENT_ASSIGNMENT_TYPES:
            raise ValueError(
                "Invalid patient assignment type."
            )

        return value

    @field_validator("status")
    @classmethod
    def validate_update_assignment_status(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in PATIENT_ASSIGNMENT_STATUSES:
            raise ValueError(
                "Invalid patient assignment status."
            )

        return value


class PatientAssignmentResponse(
    PatientAssignmentBase
):

    id: int

    assigned_by: Optional[int] = None

    assigned_at: Optional[datetime] = None

    released_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )

# =====================================================
# SETTINGS
# =====================================================


class SettingsBase(BaseModel):

    hospital_name: str = Field(
        default="HospitaX Hospital",
        min_length=1,
        max_length=150,
    )

    hospital_address: str = Field(
        default="",
        max_length=255,
    )

    hospital_phone: str = Field(
        default="",
        max_length=20,
    )

    hospital_email: str = Field(
        default="",
        max_length=100,
    )

    admin_name: str = Field(
        default="Admin",
        min_length=1,
        max_length=100,
    )

    admin_email: EmailStr = Field(
        default="admin@hospitax.com",
    )

    admin_phone: str = Field(
        default="",
        max_length=20,
    )

    admin_role: str = Field(
        default="Administrator",
        min_length=1,
        max_length=50,
    )


class SettingsCreate(SettingsBase):
    pass


class SettingsUpdate(SettingsBase):
    pass


class SettingsResponse(SettingsBase):

    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# USERS / STAFF
# ====================================================


class UserBase(BaseModel):

    employee_id: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: Optional[EmailStr] = None

    mobile: Optional[str] = Field(
        default=None,
        min_length=10,
        max_length=15,
    )

    role: str = Field(
        default="Receptionist",
        min_length=2,
        max_length=50,
    )

    shift: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )


# =====================================================
# CREATE USER
# =====================================================


class UserCreate(UserBase):

    password: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=128,
    )

    pin: str = Field(
        ...,
        min_length=4,
        max_length=6,
        pattern=r"^\d{4,6}$",
    )

    @model_validator(mode="after")
    def validate_create_credentials(self):

        # -------------------------------------------------
        # PASSWORD
        # -------------------------------------------------
    

        if self.password is not None:

            password = self.password.strip()

            if not password:
                self.password = None

            else:

                if len(password) < 8:
                    raise ValueError(
                        "Password must contain at least 8 characters."
                    )

                if not any(
                    char.isupper()
                    for char in password
                ):
                    raise ValueError(
                        "Password must contain at least one uppercase letter."
                    )

                if not any(
                    char.islower()
                    for char in password
                ):
                    raise ValueError(
                        "Password must contain at least one lowercase letter."
                    )

                if not any(
                    char.isdigit()
                    for char in password
                ):
                    raise ValueError(
                        "Password must contain at least one number."
                    )

                self.password = password

        # -------------------------------------------------
        # PIN
        # -------------------------------------------------

        if not self.pin:
            raise ValueError(
                "PIN is required."
            )

        if not self.pin.isdigit():
            raise ValueError(
                "PIN must contain only digits."
            )

        if not 4 <= len(self.pin) <= 6:
            raise ValueError(
                "PIN must contain 4 to 6 digits."
            )

        return self


# =====================================================
# LOGIN
# =====================================================


class UserLogin(BaseModel):

    identifier: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    password: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
    )

    pin: Optional[str] = Field(
        default=None,
        min_length=4,
        max_length=6,
        pattern=r"^\d{4,6}$",
    )

    @model_validator(mode="after")
    def validate_credentials(self):

        if not self.password and not self.pin:
            raise ValueError(
                "Password or PIN is required."
            )

        return self


# =====================================================
# USER RESPONSE
# =====================================================

class UserResponse(UserBase):

    id: int

    is_active: str

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# TOKEN
# =====================================================


class Token(BaseModel):

    access_token: str

    token_type: str


class TokenData(BaseModel):

    email: Optional[str] = None


# =====================================================
# LOGIN RESPONSE
# =====================================================


class LoginResponse(BaseModel):

    access_token: str

    token_type: str

    user: UserResponse


# =====================================================
# USER UPDATE
# =====================================================


class UserUpdate(BaseModel):

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: Optional[EmailStr] = None


# =====================================================
# USER STATUS
# =====================================================


class UserStatusUpdate(BaseModel):

    is_active: str = Field(
        ...,
        pattern=r"^(true|false)$",
    )


# =====================================================
# PROFILE
# =====================================================


class ProfileUpdate(BaseModel):

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: Optional[EmailStr] = None


class ProfileResponse(BaseModel):

    id: int

    employee_id: Optional[str] = None

    full_name: str

    email: Optional[EmailStr] = None

    mobile: Optional[str] = None

    role: str

    shift: Optional[str] = None

    is_active: str

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# CHANGE PASSWORD
# =====================================================


class ChangePasswordRequest(BaseModel):

    current_password: str = Field(
        ...,
        min_length=1,
        max_length=128,
    )

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    confirm_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    @model_validator(mode="after")
    def validate_passwords(self):

        if (
            self.new_password
            != self.confirm_password
        ):
            raise ValueError(
                "New password and confirmation password do not match."
            )

        return self


# =====================================================
# DEPARTMENT
# =====================================================


class DepartmentBase(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    code: str = Field(
        ...,
        min_length=2,
        max_length=20,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    code: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=20,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):

    id: int

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# FLOOR
# =====================================================


class FloorBase(BaseModel):

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    floor_number: int = Field(
        ...,
        ge=0,
        le=200,
    )

    department_id: int = Field(
        ...,
        gt=0,
    )

    is_active: bool = True


class FloorCreate(FloorBase):
    pass


class FloorUpdate(BaseModel):

    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    floor_number: Optional[int] = Field(
        default=None,
        ge=0,
        le=200,
    )

    department_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    is_active: Optional[bool] = None


class FloorResponse(FloorBase):

    id: int

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# WARD
# =====================================================


class WardBase(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    ward_type: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )

    floor_id: int = Field(
        ...,
        gt=0,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    is_active: bool = True


class WardCreate(WardBase):
    pass


class WardUpdate(BaseModel):

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    ward_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    floor_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    is_active: Optional[bool] = None


class WardResponse(WardBase):

    id: int

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# ROOM
# =====================================================


class RoomBase(BaseModel):

    room_number: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

    room_type: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )

    capacity: int = Field(
        ...,
        ge=1,
        le=100,
    )

    status: str = Field(
        default="Available",
        min_length=2,
        max_length=30,
    )

    ward_id: int = Field(
        ...,
        gt=0,
    )

    is_active: bool = True


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):

    room_number: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

    room_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    capacity: Optional[int] = Field(
        default=None,
        ge=1,
        le=100,
    )

    status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )
    
    

    ward_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    is_active: Optional[bool] = None


class RoomResponse(RoomBase):

    id: int

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# BED
# =====================================================


class BedBase(BaseModel):

    bed_number: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

    bed_type: str = Field(
        default="Standard",
        min_length=2,
        max_length=50,
    )

    status: str = Field(
        default="Available",
        min_length=2,
        max_length=30,
    )

    room_id: int = Field(
        ...,
        gt=0,
    )

    is_active: bool = True


class BedCreate(BedBase):
    pass


class BedUpdate(BaseModel):

    bed_number: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

    bed_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    room_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    is_active: Optional[bool] = None


class BedResponse(BedBase):

    id: int

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# ROOM HOUSEKEEPER ASSIGNMENT
# =====================================================
#
# housekeeper_id refers to:
#
#       users.id
#
# The referenced User must have:
#
#       role = "Housekeeper"
#
# There is NO separate authentication schema for
# Housekeepers.
# =====================================================


class RoomHousekeeperAssignmentBase(BaseModel):

    housekeeper_id: int = Field(
        ...,
        gt=0,
    )

    room_id: int = Field(
        ...,
        gt=0,
    )

    assignment_status: str = Field(
        default="Active",
        min_length=2,
        max_length=30,
    )

    responsibilities: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=500,
    )


class RoomHousekeeperAssignmentCreate(
    RoomHousekeeperAssignmentBase
):
    pass


class RoomHousekeeperAssignmentUpdate(BaseModel):

    housekeeper_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    room_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    assignment_status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    responsibilities: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=500,
    )


class RoomHousekeeperAssignmentResponse(
    RoomHousekeeperAssignmentBase
):

    id: int

    assigned_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# STAFF ATTENDANCE
# =====================================================


ATTENDANCE_STATUSES = {
    "Present",
    "Absent",
    "Late",
    "Leave",
}

class AttendanceBase(BaseModel):

    user_id: int = Field(
        ...,
        gt=0,
    )

    attendance_date: datetime

    shift: str = Field(
        ...,
        min_length=2,
        max_length=30,
    )

    check_in: Optional[datetime] = None

    check_out: Optional[datetime] = None

    status: str = Field(
        default="Absent",
        min_length=2,
        max_length=30,
    )
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip()

        if value not in ATTENDANCE_STATUSES:
            raise ValueError(
                "Invalid attendance status."
            )

        return value

    work_duration_minutes: Optional[int] = Field(
        default=None,
        ge=0,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=500,
    )


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):

    shift: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    check_in: Optional[datetime] = None

    check_out: Optional[datetime] = None

    status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        value = value.strip()

        if value not in ATTENDANCE_STATUSES:
            raise ValueError(
                "Invalid attendance status."
            )

        return value

    work_duration_minutes: Optional[int] = Field(
        default=None,
        ge=0,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=500,
    )


class AttendanceResponse(AttendanceBase):

    id: int

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# STAFF CHECK-IN
# =====================================================


class AttendanceCheckIn(BaseModel):

    user_id: int = Field(
        ...,
        gt=0,
    )

    attendance_date: datetime

    shift: str = Field(
        ...,
        min_length=2,
        max_length=30,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=500,
    )


# =====================================================
# STAFF CHECK-OUT
# =====================================================


class AttendanceCheckOut(BaseModel):

    user_id: int = Field(
        ...,
        gt=0,
    )

    attendance_date: datetime

    notes: Optional[str] = Field(
        default=None,
        max_length=500,
    )
    
# =====================================================
# WORK MANAGEMENT
# =====================================================


# -----------------------------------------------------
# WORK TASK CONSTANTS
# -----------------------------------------------------

WORK_TASK_ROLES = {
    "Doctor",
    "Nurse",
    "Receptionist",
    "Housekeeper",
}


WORK_TASK_PRIORITIES = {
    "Low",
    "Medium",
    "High",
    "Urgent",
}


WORK_TASK_STATUSES = {
    "Pending",
    "In Progress",
    "Completed",
    "Cancelled",
    "Overdue",
}


# -----------------------------------------------------
# WORK TASK CREATE
# -----------------------------------------------------

class WorkTaskCreate(BaseModel):
    """
    Data required by Administrator to create
    and assign an operational work task.
    """

    title: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    assigned_to_id: int = Field(
        ...,
        gt=0,
    )

    priority: str = Field(
        default="Medium",
        min_length=2,
        max_length=20,
    )

    due_at: Optional[datetime] = None

    location: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    instructions: Optional[str] = Field(
        default=None,
        max_length=1500,
    )


# -----------------------------------------------------
# WORK TASK UPDATE
# -----------------------------------------------------

class WorkTaskUpdate(BaseModel):
    """
    Administrator-only task modification data.

    Status lifecycle changes performed by staff will
    use dedicated business operations rather than
    allowing arbitrary status updates.
    """

    title: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    assigned_to_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    priority: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=20,
    )

    due_at: Optional[datetime] = None

    location: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    instructions: Optional[str] = Field(
        default=None,
        max_length=1500,
    )


# -----------------------------------------------------
# WORK TASK RESPONSE
# -----------------------------------------------------

class WorkTaskResponse(BaseModel):
    """
    Standard WorkTask API response.
    """

    id: int

    title: str

    description: Optional[str] = None

    assigned_to_id: int

    created_by_id: int

    priority: str

    status: str

    due_at: Optional[datetime] = None

    location: Optional[str] = None

    instructions: Optional[str] = None

    started_at: Optional[datetime] = None

    completed_at: Optional[datetime] = None

    cancelled_at: Optional[datetime] = None

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# -----------------------------------------------------
# WORK TASK STATUS RESPONSE
# -----------------------------------------------------

class WorkTaskStatusUpdate(BaseModel):
    """
    Used only for controlled task lifecycle actions.

    The actual transition rules are enforced in CRUD /
    business logic and are NOT trusted from the client.
    """

    status: str = Field(
        ...,
        min_length=2,
        max_length=30,
    )
    
# =====================================================
# CLINICAL ENCOUNTER SCHEMAS
# =====================================================

class ClinicalEncounterBase(BaseModel):
    status: str = "Draft"

    chief_complaint: Optional[str] = None
    symptoms: Optional[str] = None
    clinical_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    prescription: Optional[str] = None

    follow_up_date: Optional[datetime] = None


class ClinicalEncounterCreate(ClinicalEncounterBase):
    patient_id: int


class ClinicalEncounterUpdate(BaseModel):
    status: Optional[str] = None

    chief_complaint: Optional[str] = None
    symptoms: Optional[str] = None
    clinical_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    prescription: Optional[str] = None

    follow_up_date: Optional[datetime] = None


class ClinicalEncounterResponse(ClinicalEncounterBase):
    id: int
    patient_id: int
    doctor_id: int

    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
        
        
# =====================================================
# PRESCRIPTION SCHEMAS
# =====================================================

PRESCRIPTION_STATUSES = {
    "DRAFT",
    "ACTIVE",
    "COMPLETED",
    "DISCONTINUED",
    "CANCELLED",
}

PRESCRIPTION_DURATION_UNITS = {
    "Days",
    "Weeks",
    "Months",
}

PRESCRIPTION_DOSAGE_FORMS = {
    "Tablet",
    "Capsule",
    "Syrup",
    "Injection",
    "Cream",
    "Ointment",
    "Drops",
    "Inhaler",
    "Powder",
    "Suspension",
    "Other",
}

PRESCRIPTION_ROUTES = {
    "Oral",
    "IV",
    "IM",
    "SC",
    "Topical",
    "Ophthalmic",
    "Otic",
    "Nasal",
    "Inhalation",
    "Other",
}


# =====================================================
# PRESCRIPTION ITEM
# =====================================================


class PrescriptionItemBase(BaseModel):

    medication_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )

    generic_name: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    strength: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    dosage_form: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    route: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    dose: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    frequency: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    duration_value: Optional[int] = Field(
        default=None,
        gt=0,
    )

    duration_unit: Optional[str] = Field(
        default=None,
        max_length=30,
    )

    quantity: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    is_prn: bool = False

    instructions: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    @field_validator("medication_name")
    @classmethod
    def validate_medication_name(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if not value:
            raise ValueError(
                "Medication name is required."
            )

        return value

    @field_validator(
        "generic_name",
        "strength",
        "dosage_form",
        "route",
        "dose",
        "frequency",
        "duration_unit",
        "quantity",
        "instructions",
    )
    @classmethod
    def clean_optional_strings(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("duration_unit")
    @classmethod
    def validate_duration_unit(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        if value not in PRESCRIPTION_DURATION_UNITS:
            raise ValueError(
                "Invalid prescription duration unit."
            )

        return value

    @field_validator("dosage_form")
    @classmethod
    def validate_dosage_form(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        if value not in PRESCRIPTION_DOSAGE_FORMS:
            raise ValueError(
                "Invalid dosage form."
            )

        return value

    @field_validator("route")
    @classmethod
    def validate_route(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        if value not in PRESCRIPTION_ROUTES:
            raise ValueError(
                "Invalid medication route."
            )

        return value


class PrescriptionItemCreate(
    PrescriptionItemBase
):
    pass


class PrescriptionItemUpdate(BaseModel):

    medication_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    generic_name: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    strength: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    dosage_form: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    route: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    dose: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    frequency: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    duration_value: Optional[int] = Field(
        default=None,
        gt=0,
    )

    duration_unit: Optional[str] = Field(
        default=None,
        max_length=30,
    )

    quantity: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    is_prn: Optional[bool] = None

    instructions: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


class PrescriptionItemResponse(
    PrescriptionItemBase
):

    id: int

    prescription_id: int

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# PRESCRIPTION
# =====================================================


class PrescriptionCreate(BaseModel):

    patient_id: int = Field(
        ...,
        gt=0,
    )

    encounter_id: int = Field(
        ...,
        gt=0,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    items: list[
        PrescriptionItemCreate
    ] = Field(
        ...,
        min_length=1,
    )

    @field_validator("notes")
    @classmethod
    def clean_notes(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None


class PrescriptionUpdate(BaseModel):

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )


class PrescriptionStatusUpdate(BaseModel):

    status: str = Field(
        ...,
        min_length=3,
        max_length=30,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("status")
    @classmethod
    def validate_status(
        cls,
        value: str,
    ) -> str:

        value = value.strip().upper()

        if value not in PRESCRIPTION_STATUSES:
            raise ValueError(
                "Invalid prescription status."
            )

        return value

    @field_validator("notes")
    @classmethod
    def clean_status_notes(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None


class PrescriptionResponse(BaseModel):

    id: int

    patient_id: int

    patient_name: Optional[str] = None

    encounter_id: int

    prescribed_by_id: int

    doctor_name: Optional[str] = None

    status: str

    notes: Optional[str] = None

    prescribed_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    activated_at: Optional[datetime] = None

    completed_at: Optional[datetime] = None

    discontinued_at: Optional[datetime] = None

    cancelled_at: Optional[datetime] = None

    items: list[
        PrescriptionItemResponse
    ] = []

    model_config = ConfigDict(
        from_attributes=True
    )
    
# =====================================================
# REFERRAL SCHEMAS
# =====================================================

REFERRAL_STATUSES = {
    "PENDING",
    "ACCEPTED",
    "IN_PROGRESS",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
}

REFERRAL_PRIORITIES = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
}

REFERRAL_TYPES = {
    "SPECIALIST",
    "DEPARTMENT",
    "SECOND_OPINION",
    "FOLLOW_UP",
    "OTHER",
}


class ReferralCreate(BaseModel):
    patient_id: int = Field(..., gt=0)
    encounter_id: int = Field(..., gt=0)
    referred_to_id: Optional[int] = Field(default=None, gt=0)
    department_id: Optional[int] = Field(default=None, gt=0)
    specialty: Optional[str] = Field(default=None, max_length=100)
    referral_type: str = Field(default="SPECIALIST", min_length=2, max_length=30)
    reason: str = Field(..., min_length=2, max_length=2000)
    clinical_summary: Optional[str] = Field(default=None, max_length=5000)
    priority: str = Field(default="MEDIUM", min_length=3, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("specialty", "reason", "clinical_summary", "notes")
    @classmethod
    def clean_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("referral_type")
    @classmethod
    def validate_referral_type(cls, value: str) -> str:
        value = value.strip().upper()
        if value not in REFERRAL_TYPES:
            raise ValueError("Invalid referral type.")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        value = value.strip().upper()
        if value not in REFERRAL_PRIORITIES:
            raise ValueError("Invalid referral priority.")
        return value

    @model_validator(mode="after")
    def validate_target(self):
        if self.referred_to_id is None and self.department_id is None:
            raise ValueError("Referral must have a receiving Doctor or Department.")
        return self


class ReferralUpdate(BaseModel):
    specialty: Optional[str] = Field(default=None, max_length=100)
    referral_type: Optional[str] = Field(default=None, min_length=2, max_length=30)
    reason: Optional[str] = Field(default=None, min_length=2, max_length=2000)
    clinical_summary: Optional[str] = Field(default=None, max_length=5000)
    priority: Optional[str] = Field(default=None, min_length=3, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("specialty", "reason", "clinical_summary", "notes")
    @classmethod
    def clean_update_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("referral_type")
    @classmethod
    def validate_update_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip().upper()
        if value not in REFERRAL_TYPES:
            raise ValueError("Invalid referral type.")
        return value

    @field_validator("priority")
    @classmethod
    def validate_update_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip().upper()
        if value not in REFERRAL_PRIORITIES:
            raise ValueError("Invalid referral priority.")
        return value


class ReferralStatusUpdate(BaseModel):
    status: str = Field(..., min_length=3, max_length=30)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.strip().upper()
        if value not in REFERRAL_STATUSES:
            raise ValueError("Invalid referral status.")
        return value

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None


class ReferralResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    encounter_id: int
    referred_by_id: int
    referring_doctor_name: Optional[str] = None
    referred_to_id: Optional[int] = None
    receiving_doctor_name: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    specialty: Optional[str] = None
    referral_type: str
    reason: str
    clinical_summary: Optional[str] = None
    priority: str
    status: str
    notes: Optional[str] = None
    referred_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# =====================================================
# APPOINTMENT
# =====================================================
#
# Appointment represents a scheduled or walk-in patient
# visit before the clinical encounter.
#
# Flow:
#
#     Patient
#        ↓
#     Appointment / Walk-in
#        ↓
#     Queue
#        ↓
#     Doctor Assignment
#        ↓
#     Clinical Encounter
#
# Doctor assignment is optional at appointment creation
# because doctor assignment is handled separately.
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


class AppointmentBase(BaseModel):
    """
    Common appointment data used by create, update and
    response schemas.
    """

    patient_id: int = Field(
        ...,
        gt=0,
    )

    department_id: int = Field(
        ...,
        gt=0,
    )

    doctor_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    scheduled_at: datetime

    appointment_type: str = Field(
        default="Scheduled",
        min_length=2,
        max_length=30,
    )

    status: str = Field(
        default="Scheduled",
        min_length=2,
        max_length=30,
    )

    reason: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("appointment_type")
    @classmethod
    def validate_appointment_type(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if value not in APPOINTMENT_TYPES:
            raise ValueError(
                "Invalid appointment type."
            )

        return value

    @field_validator("status")
    @classmethod
    def validate_appointment_status(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if value not in APPOINTMENT_STATUSES:
            raise ValueError(
                "Invalid appointment status."
            )

        return value


class AppointmentCreate(BaseModel):
    """
    Data required to create an appointment.

    created_by is intentionally NOT accepted from the
    frontend. It is determined from the authenticated
    user on the backend.
    """

    patient_id: int = Field(
        ...,
        gt=0,
    )

    department_id: int = Field(
        ...,
        gt=0,
    )

    doctor_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    scheduled_at: datetime

    appointment_type: str = Field(
        default="Scheduled",
        min_length=2,
        max_length=30,
    )

    reason: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("appointment_type")
    @classmethod
    def validate_appointment_type(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if value not in APPOINTMENT_TYPES:
            raise ValueError(
                "Invalid appointment type."
            )

        return value


class AppointmentUpdate(BaseModel):
    """
    Controlled update data for an existing appointment.

    Lifecycle changes may be restricted by backend
    business rules even though status is represented here.
    """

    patient_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    department_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    doctor_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    scheduled_at: Optional[datetime] = None

    appointment_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    reason: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("appointment_type")
    @classmethod
    def validate_update_appointment_type(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None:
            return None

        value = value.strip()

        if value not in APPOINTMENT_TYPES:
            raise ValueError(
                "Invalid appointment type."
            )

        return value

    @field_validator("status")
    @classmethod
    def validate_update_appointment_status(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None:
            return None

        value = value.strip()

        if value not in APPOINTMENT_STATUSES:
            raise ValueError(
                "Invalid appointment status."
            )

        return value


class AppointmentResponse(AppointmentBase):
    """
    Standard Appointment API response.
    """

    id: int

    created_by: Optional[int] = None

    cancelled_at: Optional[datetime] = None

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# PATIENT QUEUE / TRIAGE SCHEMAS
# =====================================================
#
# PatientQueue represents the operational queue entry
# created after an appointment is checked in.
#
# Flow:
#
#     Appointment
#          ↓
#     Check-in
#          ↓
#     Patient Queue
#          ↓
#     Triage
#          ↓
#     Doctor Assignment
#          ↓
#     Clinical Encounter
#
# Queue numbers, timestamps and authenticated staff
# identity are controlled by the backend.
#
# =====================================================


# -----------------------------------------------------
# QUEUE CONSTANTS
# -----------------------------------------------------

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


# -----------------------------------------------------
# PATIENT QUEUE CREATE
# -----------------------------------------------------


class PatientQueueCreate(BaseModel):
    """
    Data required to create a queue entry.

    The backend determines:
        - patient_id
        - department_id
        - queue_number
        - queued_at
        - initial status

    from the referenced appointment.

    The frontend should provide only the appointment.
    """

    appointment_id: int = Field(
        ...,
        gt=0,
    )


# -----------------------------------------------------
# PATIENT QUEUE UPDATE
# -----------------------------------------------------


class PatientQueueUpdate(BaseModel):
    """
    Controlled queue / triage update.

    Queue lifecycle transitions should preferably be
    handled through dedicated backend operations.

    This schema is intended for controlled operational
    updates such as triage information.
    """

    status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    triage_priority: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    triage_status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    triage_notes: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    @field_validator("status")
    @classmethod
    def validate_queue_status(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in QUEUE_STATUSES:
            raise ValueError(
                "Invalid queue status."
            )

        return value

    @field_validator("triage_priority")
    @classmethod
    def validate_triage_priority(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in TRIAGE_PRIORITIES:
            raise ValueError(
                "Invalid triage priority."
            )

        return value

    @field_validator("triage_status")
    @classmethod
    def validate_triage_status(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in TRIAGE_STATUSES:
            raise ValueError(
                "Invalid triage status."
            )

        return value


# -----------------------------------------------------
# PATIENT QUEUE RESPONSE
# -----------------------------------------------------


class PatientQueueResponse(BaseModel):
    """
    Standard PatientQueue API response.
    """

    id: int

    appointment_id: int

    patient_id: int

    department_id: int

    queue_number: int

    status: str

    triage_priority: str

    triage_status: str

    triage_notes: Optional[str] = None

    triaged_by: Optional[int] = None

    triaged_at: Optional[datetime] = None

    queued_at: datetime

    called_at: Optional[datetime] = None

    completed_at: Optional[datetime] = None

    cancelled_at: Optional[datetime] = None

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )

# =====================================================
# NURSING OBSERVATION SCHEMAS
# =====================================================


class NursingObservationBase(BaseModel):
    blood_pressure: Optional[str] = None
    pulse: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    respiratory_rate: Optional[int] = None
    weight: Optional[float] = None
    nursing_notes: Optional[str] = None
    care_status: str = "Stable"


class NursingObservationCreate(NursingObservationBase):
    patient_id: int


class NursingObservationUpdate(BaseModel):
    blood_pressure: Optional[str] = None
    pulse: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    respiratory_rate: Optional[int] = None
    weight: Optional[float] = None
    nursing_notes: Optional[str] = None
    care_status: Optional[str] = None


class NursingObservationResponse(NursingObservationBase):
    id: int
    patient_id: int
    nurse_id: int
    recorded_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
        
# =====================================================
# LAB MANAGEMENT SCHEMAS
# =====================================================
#
# Lab workflow:
#
#     Clinical Encounter
#            ↓
#        Lab Order
#            ↓
#       Lab Order Items
#            ↓
#        Sample Pending
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
#          Finalized
#
# Core entities:
#
#     LabTest
#     LabOrder
#     LabOrderItem
#     LabSample
#     LabResult
#
# Business lifecycle validation is handled by the
# backend / CRUD layer. Schemas validate structure
# and basic input constraints only.
#
# =====================================================


# -----------------------------------------------------
# LAB CONSTANTS
# -----------------------------------------------------

LAB_TEST_RESULT_TYPES = {
    "Numeric",
    "Text",
    "Positive/Negative",
    "Qualitative",
}


LAB_ORDER_PRIORITIES = {
    "Routine",
    "Urgent",
    "STAT",
}


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


LAB_ORDER_ITEM_STATUSES = {
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


LAB_ABNORMAL_FLAGS = {
    "Normal",
    "Low",
    "High",
    "Critical",
    "Positive",
    "Negative",
}


# =====================================================
# LAB TEST CATALOG
# =====================================================


class LabTestBase(BaseModel):
    """
    Master definition of a laboratory test.

    Example:

        CBC
        Hemoglobin
        Blood Glucose
        Creatinine
        Urine Routine

    The catalog is independent from individual
    patient lab orders.
    """

    code: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )

    name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    category: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    specimen_type: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    result_type: str = Field(
        default="Numeric",
        min_length=2,
        max_length=30,
    )

    unit: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    reference_range_text: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    reference_min: Optional[float] = None

    reference_max: Optional[float] = None

    is_active: bool = True

    description: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    @field_validator("result_type")
    @classmethod
    def validate_result_type(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if value not in LAB_TEST_RESULT_TYPES:
            raise ValueError(
                "Invalid laboratory test result type."
            )

        return value


class LabTestCreate(LabTestBase):
    """
    Create a new test in the laboratory catalog.
    """

    pass


class LabTestUpdate(BaseModel):
    """
    Controlled update for the laboratory test catalog.

    Test identity and historical patient results should
    not be modified through an order/result operation.
    """

    code: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    category: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    specimen_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    result_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    unit: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    reference_range_text: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    reference_min: Optional[float] = None

    reference_max: Optional[float] = None

    is_active: Optional[bool] = None

    description: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    @field_validator("result_type")
    @classmethod
    def validate_update_result_type(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in LAB_TEST_RESULT_TYPES:
            raise ValueError(
                "Invalid laboratory test result type."
            )

        return value


class LabTestResponse(LabTestBase):

    id: int

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# LAB ORDER ITEM
# =====================================================


class LabOrderItemCreate(BaseModel):
    """
    Individual laboratory test requested inside a
    LabOrder.

    One LabOrder can contain multiple LabOrderItems.
    """

    lab_test_id: int = Field(
        ...,
        gt=0,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


class LabOrderItemUpdate(BaseModel):
    """
    Controlled update for an individual order item.

    Test selection itself should not be changed after
    the order enters the operational workflow.
    """

    notes: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


class LabOrderItemResponse(BaseModel):

    id: int

    lab_order_id: int

    lab_test_id: int

    status: str

    notes: Optional[str] = None

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# LAB ORDER
# =====================================================


class LabOrderCreate(BaseModel):
    """
    Doctor creates a laboratory order from a clinical
    encounter.

    ordered_by_id is NOT accepted from the frontend.

    The authenticated doctor is recorded by the backend.
    """

    patient_id: int = Field(
        ...,
        gt=0,
    )

    encounter_id: int = Field(
        ...,
        gt=0,
    )

    priority: str = Field(
        default="Routine",
        min_length=2,
        max_length=20,
    )

    clinical_indication: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    items: list[LabOrderItemCreate] = Field(
        ...,
        min_length=1,
    )

    @field_validator("priority")
    @classmethod
    def validate_priority(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if value not in LAB_ORDER_PRIORITIES:
            raise ValueError(
                "Invalid laboratory order priority."
            )

        return value

    @model_validator(mode="after")
    def validate_items(self):

        test_ids = [
            item.lab_test_id
            for item in self.items
        ]

        if len(test_ids) != len(set(test_ids)):
            raise ValueError(
                "Duplicate laboratory tests are not allowed "
                "within the same laboratory order."
            )

        return self


class LabOrderUpdate(BaseModel):
    """
    Controlled update of laboratory order metadata.

    Laboratory lifecycle status changes are handled by
    dedicated backend operations.
    """

    priority: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=20,
    )

    clinical_indication: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("priority")
    @classmethod
    def validate_update_priority(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in LAB_ORDER_PRIORITIES:
            raise ValueError(
                "Invalid laboratory order priority."
            )

        return value


class LabOrderResponse(BaseModel):

    id: int

    patient_id: int

    encounter_id: int

    ordered_by_id: int

    priority: str

    status: str

    clinical_indication: Optional[str] = None

    notes: Optional[str] = None

    ordered_at: datetime

    updated_at: Optional[datetime] = None

    cancelled_at: Optional[datetime] = None

    finalized_at: Optional[datetime] = None

    items: list[LabOrderItemResponse] = Field(
    default_factory=list,
)

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# LAB SAMPLE
# =====================================================


class LabSampleCreate(BaseModel):
    """
    Creates / registers a laboratory sample for an
    existing LabOrder.

    sample_code is generated by the backend when the
    sample is registered.
    """

    specimen_type: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


class LabSampleUpdate(BaseModel):
    """
    Controlled sample workflow update.

    Collection / receiving identity and timestamps are
    controlled by backend operations.
    """

    status: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    rejection_reason: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    @field_validator("status")
    @classmethod
    def validate_sample_status(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in LAB_SAMPLE_STATUSES:
            raise ValueError(
                "Invalid laboratory sample status."
            )

        return value


class LabSampleResponse(BaseModel):

    id: int

    lab_order_id: int

    sample_code: str

    specimen_type: str

    status: str

    collected_by_id: Optional[int] = None

    collected_at: Optional[datetime] = None

    received_at: Optional[datetime] = None

    rejection_reason: Optional[str] = None

    notes: Optional[str] = None

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# LAB RESULT
# =====================================================


class LabResultCreate(BaseModel):
    lab_order_item_id: int = Field(..., gt=0)
    """
    Result entry for one LabOrderItem.

    Depending on the test definition, the result may
    contain a numeric value, text value, or qualitative
    value.

    The backend validates compatibility with the
    selected LabTest.
    """

    numeric_value: Optional[float] = None

    text_value: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    unit: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    reference_range_text: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    reference_min: Optional[float] = None

    reference_max: Optional[float] = None

    abnormal_flag: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    is_critical: bool = False

    interpretation: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    result_notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("abnormal_flag")
    @classmethod
    def validate_abnormal_flag(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in LAB_ABNORMAL_FLAGS:
            raise ValueError(
                "Invalid laboratory abnormal flag."
            )

        return value


class LabResultUpdate(BaseModel):
    """
    Controlled update for an existing laboratory result.

    Result lifecycle transitions such as technical
    validation, doctor review and finalization should
    use dedicated backend operations.
    """

    numeric_value: Optional[float] = None

    text_value: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    unit: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    reference_range_text: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    reference_min: Optional[float] = None

    reference_max: Optional[float] = None

    abnormal_flag: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    is_critical: Optional[bool] = None

    interpretation: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    result_notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("abnormal_flag")
    @classmethod
    def validate_update_abnormal_flag(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        if value not in LAB_ABNORMAL_FLAGS:
            raise ValueError(
                "Invalid laboratory abnormal flag."
            )

        return value


class LabResultResponse(BaseModel):

    id: int

    lab_order_item_id: int

    status: str

    numeric_value: Optional[float] = None

    text_value: Optional[str] = None

    unit: Optional[str] = None

    reference_range_text: Optional[str] = None

    reference_min: Optional[float] = None

    reference_max: Optional[float] = None

    abnormal_flag: Optional[str] = None

    is_critical: bool

    interpretation: Optional[str] = None

    result_notes: Optional[str] = None

    entered_by_id: Optional[int] = None

    entered_at: Optional[datetime] = None

    validated_by_id: Optional[int] = None

    validated_at: Optional[datetime] = None

    validation_notes: Optional[str] = None

    reviewed_by_id: Optional[int] = None

    reviewed_at: Optional[datetime] = None

    review_notes: Optional[str] = None

    finalized_at: Optional[datetime] = None

    created_at: datetime

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# LAB RESULT VALIDATION
# =====================================================


class LabResultValidation(BaseModel):
    """
    Used by authorized laboratory personnel to
    technically validate a laboratory result.

    The authenticated user identity is determined
    by the backend.
    """

    validation_notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )


# =====================================================
# LAB DOCTOR REVIEW
# =====================================================


class LabResultDoctorReview(BaseModel):
    """
    Used by the responsible doctor to review a
    technically validated laboratory result.
    """

    review_notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )


# =====================================================
# LAB RESULT FINALIZATION
# =====================================================


class LabResultFinalize(BaseModel):
    """
    Used to finalize a laboratory result after the
    required technical validation and doctor review
    workflow has been completed.
    """

    review_notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )


# =====================================================
# LAB ORDER STATUS ACTION
# =====================================================


class LabOrderStatusUpdate(BaseModel):
    """
    Controlled laboratory order lifecycle action.

    The backend must validate whether the requested
    transition is allowed.

    Example:

        ORDERED
            ↓
        SAMPLE_PENDING
            ↓
        COLLECTED
            ↓
        PROCESSING
            ↓
        RESULT_ENTERED
            ↓
        TECHNICALLY_VALIDATED
            ↓
        DOCTOR_REVIEW
            ↓
        FINALIZED
    """

    status: str = Field(
        ...,
        min_length=2,
        max_length=40,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("status")
    @classmethod
    def validate_status(
        cls,
        value: str,
    ) -> str:

        value = value.strip()

        if value not in LAB_ORDER_STATUSES:
            raise ValueError(
                "Invalid laboratory order status."
            )

        return value


# =====================================================
# LAB SAMPLE COLLECTION
# =====================================================


class LabSampleCollection(BaseModel):
    """
    Records sample collection by authorized staff.

    collected_by_id and collected_at are determined
    by the backend.
    """

    notes: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


# =====================================================
# LAB SAMPLE RECEIVING
# =====================================================


class LabSampleReceive(BaseModel):
    """
    Records laboratory sample receipt.
    """

    notes: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


# =====================================================
# LAB SAMPLE REJECTION
# =====================================================


class LabSampleReject(BaseModel):
    """
    Records rejection of an unsuitable laboratory
    specimen.
    """

    rejection_reason: str = Field(
        ...,
        min_length=2,
        max_length=1000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


# =====================================================
# PATIENT TRANSFER
# =====================================================

TRANSFER_TYPES = {
    "WARD_TRANSFER",
    "DEPARTMENT_TRANSFER",
    "ROOM_TRANSFER",
    "BED_TRANSFER",
    "ICU_TRANSFER",
    "EMERGENCY_TRANSFER",
    "OTHER",
}

TRANSFER_PRIORITIES = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
}

TRANSFER_STATUSES = {
    "REQUESTED",
    "APPROVED",
    "IN_PROGRESS",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
}

TRANSFER_TRANSPORT_MODES = {
    "WALKING",
    "WHEELCHAIR",
    "STRETCHER",
    "BED",
    "AMBULANCE",
    "OTHER",
}


class TransferCreate(BaseModel):
    """
    Creates a patient transfer request.

    Source location is optional because the current patient
    assignment may not contain every location level.

    At least one destination target is required.
    """

    patient_id: int = Field(
        ...,
        gt=0,
    )

    encounter_id: int = Field(
        ...,
        gt=0,
    )

    transfer_type: str = Field(
        default="WARD_TRANSFER",
        min_length=2,
        max_length=50,
    )

    priority: str = Field(
        default="MEDIUM",
        min_length=2,
        max_length=20,
    )

    source_department_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    source_ward_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    source_room_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    source_bed_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    destination_department_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    destination_ward_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    destination_room_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    destination_bed_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    reason: str = Field(
        ...,
        min_length=2,
        max_length=2000,
    )

    clinical_summary: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    handover_notes: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    transport_mode: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator(
        "transfer_type",
        "priority",
        "transport_mode",
        "reason",
        "clinical_summary",
        "handover_notes",
        "notes",
    )
    @classmethod
    def normalize_transfer_strings(cls, value):
        if value is None:
            return None
        return value.strip()

    @field_validator("transfer_type")
    @classmethod
    def validate_transfer_type(cls, value: str) -> str:
        if value not in TRANSFER_TYPES:
            raise ValueError("Invalid transfer type.")
        return value

    @field_validator("priority")
    @classmethod
    def validate_transfer_priority(cls, value: str) -> str:
        if value not in TRANSFER_PRIORITIES:
            raise ValueError("Invalid transfer priority.")
        return value

    @field_validator("transport_mode")
    @classmethod
    def validate_transport_mode(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        if value not in TRANSFER_TRANSPORT_MODES:
            raise ValueError("Invalid transfer transport mode.")
        return value

    @model_validator(mode="after")
    def validate_destination(self):
        if not any(
            [
                self.destination_department_id,
                self.destination_ward_id,
                self.destination_room_id,
                self.destination_bed_id,
            ]
        ):
            raise ValueError(
                "At least one destination location is required."
            )

        return self


class TransferUpdate(BaseModel):
    """
    Updates a transfer while it is still in REQUESTED state.

    Patient and encounter ownership are controlled by the
    backend and are intentionally not editable here.
    """

    transfer_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    priority: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=20,
    )

    source_department_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    source_ward_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    source_room_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    source_bed_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    destination_department_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    destination_ward_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    destination_room_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    destination_bed_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    reason: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=2000,
    )

    clinical_summary: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    handover_notes: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    transport_mode: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator(
        "transfer_type",
        "priority",
        "transport_mode",
        "reason",
        "clinical_summary",
        "handover_notes",
        "notes",
    )
    @classmethod
    def normalize_transfer_update_strings(cls, value):
        if value is None:
            return None
        return value.strip()

    @field_validator("transfer_type")
    @classmethod
    def validate_transfer_update_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if value not in TRANSFER_TYPES:
            raise ValueError("Invalid transfer type.")
        return value

    @field_validator("priority")
    @classmethod
    def validate_transfer_update_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if value not in TRANSFER_PRIORITIES:
            raise ValueError("Invalid transfer priority.")
        return value

    @field_validator("transport_mode")
    @classmethod
    def validate_transfer_update_transport(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None or value == "":
            return None
        if value not in TRANSFER_TRANSPORT_MODES:
            raise ValueError("Invalid transfer transport mode.")
        return value


class TransferStatusUpdate(BaseModel):
    """
    Controlled transfer lifecycle action.
    """

    status: str = Field(
        ...,
        min_length=2,
        max_length=30,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    @field_validator("status")
    @classmethod
    def validate_transfer_status(cls, value: str) -> str:
        value = value.strip()

        if value not in TRANSFER_STATUSES:
            raise ValueError("Invalid transfer status.")

        return value

    @field_validator("notes")
    @classmethod
    def normalize_transfer_status_notes(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None:
            return None
        return value.strip()


class TransferResponse(BaseModel):
    id: int

    patient_id: int
    patient_name: Optional[str] = None

    encounter_id: int

    requested_by_id: int
    requesting_user_name: Optional[str] = None

    approved_by_id: Optional[int] = None
    approving_user_name: Optional[str] = None

    completed_by_id: Optional[int] = None
    completed_by_name: Optional[str] = None

    transfer_type: str
    priority: str
    status: str

    source_department_id: Optional[int] = None
    source_department_name: Optional[str] = None

    source_ward_id: Optional[int] = None
    source_ward_name: Optional[str] = None

    source_room_id: Optional[int] = None
    source_room_name: Optional[str] = None

    source_bed_id: Optional[int] = None
    source_bed_name: Optional[str] = None

    destination_department_id: Optional[int] = None
    destination_department_name: Optional[str] = None

    destination_ward_id: Optional[int] = None
    destination_ward_name: Optional[str] = None

    destination_room_id: Optional[int] = None
    destination_room_name: Optional[str] = None

    destination_bed_id: Optional[int] = None
    destination_bed_name: Optional[str] = None

    reason: str
    clinical_summary: Optional[str] = None
    handover_notes: Optional[str] = None
    transport_mode: Optional[str] = None
    notes: Optional[str] = None

    requested_at: datetime
    approved_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True
    )

# =====================================================
# DISCHARGE SCHEMAS
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
# DISCHARGE CREATE
# -----------------------------------------------------


class DischargeCreate(BaseModel):
    """
    Data required to create a patient discharge record.

    discharged_by_id is intentionally NOT accepted from
    the frontend.

    The authenticated Doctor/User will be determined by
    the backend.
    """

    patient_id: int = Field(
        ...,
        gt=0,
    )

    encounter_id: int = Field(
        ...,
        gt=0,
    )

    status: str = Field(
        default="PLANNED",
        min_length=3,
        max_length=30,
    )

    discharge_type: str = Field(
        default="ROUTINE",
        min_length=3,
        max_length=30,
    )

    final_diagnosis: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    clinical_summary: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    condition_at_discharge: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    treatment_summary: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    discharge_medications: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    discharge_instructions: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    diet_instructions: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    activity_restrictions: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    warning_signs: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    follow_up_required: bool = False

    follow_up_date: Optional[datetime] = None

    follow_up_instructions: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    @field_validator(
        "final_diagnosis",
        "clinical_summary",
        "condition_at_discharge",
        "treatment_summary",
        "discharge_medications",
        "discharge_instructions",
        "diet_instructions",
        "activity_restrictions",
        "warning_signs",
        "follow_up_instructions",
        "notes",
    )
    @classmethod
    def clean_optional_strings(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("status")
    @classmethod
    def validate_discharge_status(
        cls,
        value: str,
    ) -> str:

        value = value.strip().upper()

        if value not in DISCHARGE_STATUSES:
            raise ValueError(
                "Invalid discharge status."
            )

        return value

    @field_validator("discharge_type")
    @classmethod
    def validate_discharge_type(
        cls,
        value: str,
    ) -> str:

        value = value.strip().upper()

        if value not in DISCHARGE_TYPES:
            raise ValueError(
                "Invalid discharge type."
            )

        return value


# -----------------------------------------------------
# DISCHARGE UPDATE
# -----------------------------------------------------


class DischargeUpdate(BaseModel):
    """
    Controlled update data for an existing discharge.

    Lifecycle changes should preferably be handled through
    dedicated backend operations.
    """

    discharge_type: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=30,
    )

    final_diagnosis: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    clinical_summary: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    condition_at_discharge: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    treatment_summary: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    discharge_medications: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    discharge_instructions: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    diet_instructions: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    activity_restrictions: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    warning_signs: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    follow_up_required: Optional[bool] = None

    follow_up_date: Optional[datetime] = None

    follow_up_instructions: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    @field_validator("discharge_type")
    @classmethod
    def validate_update_discharge_type(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip().upper()

        if value not in DISCHARGE_TYPES:
            raise ValueError(
                "Invalid discharge type."
            )

        return value

    @field_validator(
        "final_diagnosis",
        "clinical_summary",
        "condition_at_discharge",
        "treatment_summary",
        "discharge_medications",
        "discharge_instructions",
        "diet_instructions",
        "activity_restrictions",
        "warning_signs",
        "follow_up_instructions",
        "notes",
    )
    @classmethod
    def clean_update_strings(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None


# -----------------------------------------------------
# DISCHARGE STATUS UPDATE
# -----------------------------------------------------


class DischargeStatusUpdate(BaseModel):
    """
    Used only for controlled discharge lifecycle actions.
    """

    status: str = Field(
        ...,
        min_length=3,
        max_length=30,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    @field_validator("status")
    @classmethod
    def validate_status(
        cls,
        value: str,
    ) -> str:

        value = value.strip().upper()

        if value not in DISCHARGE_STATUSES:
            raise ValueError(
                "Invalid discharge status."
            )

        return value

    @field_validator("notes")
    @classmethod
    def clean_notes(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None


# -----------------------------------------------------
# DISCHARGE RESPONSE
# -----------------------------------------------------


class DischargeResponse(BaseModel):

    id: int

    patient_id: int

    patient_name: Optional[str] = None

    encounter_id: int

    discharged_by_id: int

    doctor_name: Optional[str] = None

    status: str

    discharge_type: str

    final_diagnosis: Optional[str] = None

    clinical_summary: Optional[str] = None

    condition_at_discharge: Optional[str] = None

    treatment_summary: Optional[str] = None

    discharge_medications: Optional[str] = None

    discharge_instructions: Optional[str] = None

    diet_instructions: Optional[str] = None

    activity_restrictions: Optional[str] = None

    warning_signs: Optional[str] = None

    follow_up_required: bool

    follow_up_date: Optional[datetime] = None

    follow_up_instructions: Optional[str] = None

    notes: Optional[str] = None

    planned_at: Optional[datetime] = None

    ready_at: Optional[datetime] = None

    discharged_at: Optional[datetime] = None

    cancelled_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )


# =====================================================
# FOLLOW-UP SCHEMAS
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
# FOLLOW-UP CREATE
# -----------------------------------------------------


class FollowUpCreate(BaseModel):
    """
    Data required to schedule a patient follow-up.

    doctor_id is optional because the follow-up may be
    scheduled before a specific doctor is assigned.
    """

    patient_id: int = Field(
        ...,
        gt=0,
    )

    encounter_id: int = Field(
        ...,
        gt=0,
    )

    discharge_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    doctor_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    follow_up_type: str = Field(
        default="ROUTINE",
        min_length=2,
        max_length=50,
    )

    priority: str = Field(
        default="MEDIUM",
        min_length=3,
        max_length=20,
    )

    scheduled_at: datetime

    reason: str = Field(
        ...,
        min_length=2,
        max_length=2000,
    )

    clinical_summary: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    instructions: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    @field_validator(
        "reason",
        "clinical_summary",
        "instructions",
        "notes",
    )
    @classmethod
    def clean_strings(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None

    @field_validator("follow_up_type")
    @classmethod
    def validate_follow_up_type(
        cls,
        value: str,
    ) -> str:

        value = value.strip().upper()

        if value not in FOLLOW_UP_TYPES:
            raise ValueError(
                "Invalid follow-up type."
            )

        return value

    @field_validator("priority")
    @classmethod
    def validate_follow_up_priority(
        cls,
        value: str,
    ) -> str:

        value = value.strip().upper()

        if value not in FOLLOW_UP_PRIORITIES:
            raise ValueError(
                "Invalid follow-up priority."
            )

        return value


# -----------------------------------------------------
# FOLLOW-UP UPDATE
# -----------------------------------------------------


class FollowUpUpdate(BaseModel):

    doctor_id: Optional[int] = Field(
        default=None,
        gt=0,
    )

    follow_up_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    priority: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=20,
    )

    scheduled_at: Optional[datetime] = None

    reason: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=2000,
    )

    clinical_summary: Optional[str] = Field(
        default=None,
        max_length=5000,
    )

    instructions: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    @field_validator("follow_up_type")
    @classmethod
    def validate_update_follow_up_type(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip().upper()

        if value not in FOLLOW_UP_TYPES:
            raise ValueError(
                "Invalid follow-up type."
            )

        return value

    @field_validator("priority")
    @classmethod
    def validate_update_priority(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip().upper()

        if value not in FOLLOW_UP_PRIORITIES:
            raise ValueError(
                "Invalid follow-up priority."
            )

        return value

    @field_validator(
        "reason",
        "clinical_summary",
        "instructions",
        "notes",
    )
    @classmethod
    def clean_update_strings(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None


# -----------------------------------------------------
# FOLLOW-UP STATUS UPDATE
# -----------------------------------------------------


class FollowUpStatusUpdate(BaseModel):
    """
    Used only for controlled follow-up lifecycle actions.
    """

    status: str = Field(
        ...,
        min_length=3,
        max_length=30,
    )

    notes: Optional[str] = Field(
        default=None,
        max_length=3000,
    )

    @field_validator("status")
    @classmethod
    def validate_status(
        cls,
        value: str,
    ) -> str:

        value = value.strip().upper()

        if value not in FOLLOW_UP_STATUSES:
            raise ValueError(
                "Invalid follow-up status."
            )

        return value

    @field_validator("notes")
    @classmethod
    def clean_notes(
        cls,
        value: Optional[str],
    ) -> Optional[str]:

        if value is None:
            return None

        value = value.strip()

        return value or None


# -----------------------------------------------------
# FOLLOW-UP RESPONSE
# -----------------------------------------------------


class FollowUpResponse(BaseModel):

    id: int

    patient_id: int

    patient_name: Optional[str] = None

    encounter_id: int

    discharge_id: Optional[int] = None

    doctor_id: Optional[int] = None

    doctor_name: Optional[str] = None

    follow_up_type: str

    priority: str

    status: str

    scheduled_at: datetime

    reason: str

    clinical_summary: Optional[str] = None

    instructions: Optional[str] = None

    notes: Optional[str] = None

    completed_at: Optional[datetime] = None

    cancelled_at: Optional[datetime] = None

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
    )
    

# =====================================================
# NOTIFICATION SCHEMAS
# =====================================================

class NotificationResponse(BaseModel):
    """Standard response for a user notification."""

    id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class NotificationUnreadCount(BaseModel):
    """Unread notification count for the authenticated user."""

    unread_count: int
