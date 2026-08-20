"""Pydantic v2 models. Each has a hand-written TS mirror in frontend/src/lib/types.ts."""

import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


def new_id() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


Role = Literal["student", "instructor", "admin", "super_admin"]
CertStatus = Literal["pending", "verified", "expired", "rejected"]
AccessType = Literal["certification_level", "course_enrollment", "admin_only", "public"]


# ---------- users / auth ----------
class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    profile_photo: Optional[str] = None


class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=128)


class ForgotPasswordResult(BaseModel):
    reset_token: Optional[str] = None
    message: str


class OkResult(BaseModel):
    ok: bool = True


# ---------- diver profile ----------
class DiverProfile(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    name: str = ""
    email: str = ""
    freediving_since: Optional[int] = None
    certification_summary: Optional[str] = None
    preferred_discipline: Optional[str] = None
    nationality: Optional[str] = None
    home_training_location: Optional[str] = None
    school: Optional[str] = None
    instructor_name: Optional[str] = None
    bio: Optional[str] = None
    profile_photo: Optional[str] = None
    current_certification_agency: Optional[str] = None
    current_certification_level: Optional[str] = None
    certification_rank: int = 0


class DiverProfileUpdate(BaseModel):
    name: Optional[str] = None
    freediving_since: Optional[int] = None
    certification_summary: Optional[str] = None
    preferred_discipline: Optional[str] = None
    nationality: Optional[str] = None
    home_training_location: Optional[str] = None
    school: Optional[str] = None
    instructor_name: Optional[str] = None
    bio: Optional[str] = None
    profile_photo: Optional[str] = None


# ---------- courses ----------
class CourseStructureItem(BaseModel):
    label: str
    value: str


class Course(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    slug: str
    level: str
    tagline: str = ""
    short_description: str = ""
    description: str = ""
    price: float = 0
    currency: str = "IDR"
    duration: str = ""
    max_depth: Optional[str] = None
    learn_topics: list[str] = []
    structure: list[CourseStructureItem] = []
    requirements: list[str] = []
    certification_agency: Optional[str] = None
    certification_level: Optional[str] = None
    certification_requirements: list[str] = []
    schedule: Optional[str] = None
    image_url: str = ""
    status: Literal["active", "inactive"] = "active"


class CourseInput(BaseModel):
    title: str = Field(min_length=2)
    slug: Optional[str] = None
    level: str = "Beginner"
    tagline: str = ""
    short_description: str = ""
    description: str = ""
    price: float = Field(default=0, ge=0)
    currency: str = "IDR"
    duration: str = ""
    max_depth: Optional[str] = None
    learn_topics: list[str] = []
    structure: list[CourseStructureItem] = []
    requirements: list[str] = []
    certification_agency: Optional[str] = None
    certification_level: Optional[str] = None
    certification_requirements: list[str] = []
    schedule: Optional[str] = None
    image_url: str = ""
    status: Literal["active", "inactive"] = "active"


# ---------- dive logs ----------
class DiveLogInput(BaseModel):
    date: str
    discipline: str
    value: float = Field(gt=0)
    location: Optional[str] = None
    dive_type: Optional[str] = None
    duration_seconds: Optional[int] = Field(default=None, ge=0, le=86400)
    max_heart_rate: Optional[int] = Field(default=None, ge=20, le=260)
    min_heart_rate: Optional[int] = Field(default=None, ge=20, le=260)
    water_temperature: Optional[float] = Field(default=None, ge=-5, le=45)
    weight_used: Optional[float] = Field(default=None, ge=0, le=50)
    wetsuit_thickness: Optional[float] = Field(default=None, ge=0, le=15)
    equalization: Optional[str] = None
    buddy: Optional[str] = None
    feeling: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None

    @field_validator("discipline")
    @classmethod
    def known_discipline(cls, v: str) -> str:
        from lib.disciplines import ALL_DISCIPLINES

        if v not in ALL_DISCIPLINES:
            raise ValueError("unknown discipline")
        return v


class DiveLog(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    date: str
    discipline: str
    value: float
    unit: str = "m"
    group: str = "depth"
    location: Optional[str] = None
    dive_type: Optional[str] = None
    duration_seconds: Optional[int] = None
    max_heart_rate: Optional[int] = None
    min_heart_rate: Optional[int] = None
    water_temperature: Optional[float] = None
    weight_used: Optional[float] = None
    wetsuit_thickness: Optional[float] = None
    equalization: Optional[str] = None
    buddy: Optional[str] = None
    feeling: Optional[int] = None
    notes: Optional[str] = None
    is_pb: bool = False
    created_at: datetime = Field(default_factory=now_utc)


class PersonalBest(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    discipline: str
    group: str
    unit: str
    value: float
    date: str
    dive_log_id: str
    previous_value: Optional[float] = None
    improvement_percent: Optional[float] = None


class DiveSaveResult(BaseModel):
    dive: DiveLog
    new_pb: Optional[PersonalBest] = None


# ---------- goals ----------
class GoalInput(BaseModel):
    discipline: str
    target_value: float = Field(gt=0)
    target_date: Optional[str] = None
    status: Literal["active", "achieved", "archived"] = "active"


class Goal(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    discipline: str
    unit: str = "m"
    target_value: float
    target_date: Optional[str] = None
    status: Literal["active", "achieved", "archived"] = "active"
    current_value: float = 0
    progress_percent: float = 0
    remaining: float = 0


# ---------- training tables ----------
StepType = Literal[
    "breathe", "hold", "recovery", "relax", "stretch", "preparation", "main_attempt", "custom"
]


class TableStep(BaseModel):
    step_order: int
    step_type: StepType
    duration_seconds: int = Field(ge=0, le=3600)
    instruction: Optional[str] = None
    label: Optional[str] = None


class TrainingTableInput(BaseModel):
    name: str = Field(min_length=1)
    category: Literal["co2", "o2", "warmup", "custom"] = "custom"
    description: Optional[str] = None
    steps: list[TableStep] = []


class TrainingTable(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: Optional[str] = None
    name: str
    category: str
    description: Optional[str] = None
    is_template: bool = False
    steps: list[TableStep] = []
    total_seconds: int = 0


class TrainingSessionInput(BaseModel):
    table_id: Optional[str] = None
    table_name: str = ""
    training_type: str = "co2"
    total_duration: int = Field(ge=0)
    completed_steps: int = Field(ge=0)
    total_steps: int = Field(ge=0)
    longest_hold_seconds: int = Field(default=0, ge=0)
    difficulty: Optional[int] = Field(default=None, ge=1, le=10)
    notes: Optional[str] = None


class TrainingLogInput(BaseModel):
    date: str
    training_type: str
    duration_seconds: int = Field(ge=0, le=86400)
    result: Optional[str] = None
    difficulty: Optional[int] = Field(default=None, ge=1, le=10)
    notes: Optional[str] = None


class TrainingEntry(BaseModel):
    """Unified training-history row (timer sessions + manual logs)."""

    id: str = Field(default_factory=new_id)
    user_id: str
    source: Literal["session", "manual"] = "manual"
    date: str
    training_type: str
    table_name: str = ""
    duration_seconds: int = 0
    completed_steps: Optional[int] = None
    total_steps: Optional[int] = None
    longest_hold_seconds: Optional[int] = None
    result: Optional[str] = None
    difficulty: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=now_utc)


# ---------- learning / certifications ----------
class LearningResourceInput(BaseModel):
    title: str = Field(min_length=1)
    organization: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    category: str = "School Materials"
    resource_type: Literal["manual", "pdf", "link", "video"] = "link"
    resource_url: str
    is_active: bool = True
    access_agency: str = "AIDA"
    minimum_access_level: Optional[str] = None
    resource_access_type: AccessType = "certification_level"


class LearningResource(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    organization: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    category: str = "School Materials"
    resource_type: str = "link"
    # Blanked out for locked resources — a locked URL is never sent to the client.
    resource_url: str
    is_active: bool = True
    access_agency: str = "AIDA"
    minimum_access_level: Optional[str] = None
    minimum_level_rank: int = 0
    resource_access_type: str = "certification_level"
    locked: bool = False
    required_level: Optional[str] = None


class ResourceUrl(BaseModel):
    resource_url: str
    resource_type: str
    title: str


class LearningSummary(BaseModel):
    agency: str
    level: Optional[str] = None
    rank: int = 0
    next_level: Optional[str] = None
    available_count: int = 0
    locked_count: int = 0
    total_count: int = 0
    accessible_levels: list[str] = []
    unrestricted: bool = False
    preview: bool = False


class CertificationInput(BaseModel):
    agency: str = Field(min_length=1)
    certification: str = Field(min_length=1)
    instructor: Optional[str] = None
    certification_date: Optional[str] = None
    expiration_date: Optional[str] = None
    certificate_number: Optional[str] = None
    certificate_file_url: Optional[str] = None
    verification_url: Optional[str] = None

    @field_validator("verification_url")
    @classmethod
    def https_only(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        url = v.strip()
        if not url.startswith("https://"):
            raise ValueError("The verification link must be a valid https:// URL")
        return url


class Certification(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    user_name: str = ""
    agency: str
    certification: str
    instructor: Optional[str] = None
    certification_date: Optional[str] = None
    expiration_date: Optional[str] = None
    certificate_number: Optional[str] = None
    certificate_file_url: Optional[str] = None
    verification_url: Optional[str] = None
    # file metadata — the storage key itself is never exposed to clients
    has_file: bool = False
    certificate_file_name: Optional[str] = None
    certificate_file_size: Optional[int] = None
    certificate_uploaded_at: Optional[datetime] = None
    certificate_uploaded_by: Optional[str] = None
    status: CertStatus = "pending"
    rank: int = 0
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None


class AdminCertificationInput(BaseModel):
    user_id: str
    agency: str = "AIDA"
    certification: str = Field(min_length=1)
    instructor: Optional[str] = None
    certification_date: Optional[str] = None
    expiration_date: Optional[str] = None
    certificate_number: Optional[str] = None
    verification_url: Optional[str] = None
    status: CertStatus = "verified"

    @field_validator("verification_url")
    @classmethod
    def https_only(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        url = v.strip()
        if not url.startswith("https://"):
            raise ValueError("The verification link must be a valid https:// URL")
        return url


class AdminCertificationUpdate(BaseModel):
    status: Optional[CertStatus] = None
    certification: Optional[str] = None
    agency: Optional[str] = None
    instructor: Optional[str] = None
    certification_date: Optional[str] = None
    expiration_date: Optional[str] = None
    certificate_number: Optional[str] = None
    verification_url: Optional[str] = None

    @field_validator("verification_url")
    @classmethod
    def https_only(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        url = v.strip()
        if not url.startswith("https://"):
            raise ValueError("The verification link must be a valid https:// URL")
        return url


# ---------- dashboards / analytics ----------
class DashboardStat(BaseModel):
    label: str
    discipline: Optional[str] = None
    value: Optional[float] = None
    unit: str = "m"
    display: str = "—"


class SeriesPoint(BaseModel):
    date: str
    value: float
    is_pb: bool = False


class DisciplineProgress(BaseModel):
    discipline: str
    unit: str
    current_pb: Optional[float] = None
    previous_pb: Optional[float] = None
    improvement_percent: Optional[float] = None
    total_sessions: int = 0
    last_session_date: Optional[str] = None
    series: list[SeriesPoint] = []


class WeeklyTraining(BaseModel):
    label: str
    sessions: int
    total_seconds: int


class DashboardData(BaseModel):
    user: UserPublic
    profile: DiverProfile
    stats: list[DashboardStat]
    total_dives: int
    total_training_sessions: int
    recent_dives: list[DiveLog]
    goals: list[Goal]
    depth_series: list[SeriesPoint]
    depth_discipline: Optional[str] = None
    week_training: list[WeeklyTraining]
    week_total_seconds: int
    learning: LearningSummary


class StudentSummary(BaseModel):
    user: UserPublic
    certification: Optional[str] = None
    depth_pb: Optional[float] = None
    depth_discipline: Optional[str] = None
    target: Optional[float] = None
    last_training_date: Optional[str] = None


class InstructorNoteInput(BaseModel):
    student_id: str
    note: str = Field(min_length=1)


class InstructorNote(BaseModel):
    id: str = Field(default_factory=new_id)
    instructor_id: str
    instructor_name: str = ""
    student_id: str
    note: str
    created_at: datetime = Field(default_factory=now_utc)


class AdminOverview(BaseModel):
    total_users: int
    total_students: int
    total_instructors: int
    active_courses: int
    total_dive_logs: int
    total_training_sessions: int
    total_resources: int
    recent_registrations: list[UserPublic]


class AdminUserUpdate(BaseModel):
    role: Optional[Role] = None
    name: Optional[str] = None


def clean(doc: dict[str, Any]) -> dict[str, Any]:
    doc.pop("_id", None)
    return doc
