from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# --- Auth ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class AdminCreateEmployee(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=255)


class AdminCreateEmployeeResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    department: str
    employee_record_id: int
    employee_code: str
    temporary_password: str = Field(..., description="Shown only once; store securely.")


class AdminUserRow(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class MeResponse(UserPublic):
    employee: Optional["EmployeeResponse"] = None


# --- Employee ---
class EmployeeBase(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=255)


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    employee_id: Optional[str] = Field(None, min_length=1, max_length=50)
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    department: Optional[str] = Field(None, min_length=1, max_length=255)


class EmployeeResponse(EmployeeBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


# --- Attendance ---
class AttendanceBase(BaseModel):
    date: date
    status: str = Field(..., pattern="^(Present|Absent)$")
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None


class AttendanceCreate(AttendanceBase):
    employee_id: int
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


class AttendanceGeofenceConfig(BaseModel):
    """Whether employee attendance is restricted to within radius_meters of the configured admin location."""

    enabled: bool
    radius_meters: int


class AttendanceUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(Present|Absent)$")
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    date: date
    status: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Leave ---
class LeaveCreate(BaseModel):
    from_date: date
    to_date: date
    reason: str = Field(..., min_length=1, max_length=2000)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.to_date < self.from_date:
            raise ValueError("to_date must be on or after from_date")
        return self


class LeaveStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Approved|Rejected)$")


class LeaveResponse(BaseModel):
    id: int
    employee_id: int
    from_date: date
    to_date: date
    reason: str
    status: str

    class Config:
        from_attributes = True


class LeaveWithEmployee(LeaveResponse):
    employee_employee_id: Optional[str] = None
    employee_full_name: Optional[str] = None
    employee_department: Optional[str] = None


# --- Analytics ---
class AnalyticsSummary(BaseModel):
    total_employees: int
    present_count: int
    absent_count: int
    monthly_attendance: list[dict]
    department_stats: list[dict]


class AnalyticsMe(BaseModel):
    employee_id: int
    full_name: str
    department: str
    present_days: int
    absent_days: int
    pending_leaves: int
    approved_leaves: int


MeResponse.model_rebuild()
