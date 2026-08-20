// Hand-written mirrors of the Pydantic models in backend/models/schemas.py.
// When a model changes on the backend, change its interface here in the same edit.

export type Role = "student" | "instructor" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  profile_photo: string | null;
}

export interface DiverProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  freediving_since: number | null;
  certification_summary: string | null;
  preferred_discipline: string | null;
  nationality: string | null;
  home_training_location: string | null;
  school: string | null;
  instructor_name: string | null;
  bio: string | null;
  profile_photo: string | null;
}

export interface CourseStructureItem {
  label: string;
  value: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  level: string;
  tagline: string;
  short_description: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  max_depth: string | null;
  learn_topics: string[];
  structure: CourseStructureItem[];
  requirements: string[];
  certification_agency: string | null;
  certification_level: string | null;
  certification_requirements: string[];
  schedule: string | null;
  image_url: string;
  status: "active" | "inactive";
}

export interface DiveLog {
  id: string;
  user_id: string;
  date: string;
  discipline: string;
  value: number;
  unit: string;
  group: string;
  location: string | null;
  dive_type: string | null;
  duration_seconds: number | null;
  max_heart_rate: number | null;
  min_heart_rate: number | null;
  water_temperature: number | null;
  weight_used: number | null;
  wetsuit_thickness: number | null;
  equalization: string | null;
  buddy: string | null;
  feeling: number | null;
  notes: string | null;
  is_pb: boolean;
}

export interface DiveLogInput {
  date: string;
  discipline: string;
  value: number;
  location?: string | null;
  dive_type?: string | null;
  duration_seconds?: number | null;
  max_heart_rate?: number | null;
  min_heart_rate?: number | null;
  water_temperature?: number | null;
  weight_used?: number | null;
  wetsuit_thickness?: number | null;
  equalization?: string | null;
  buddy?: string | null;
  feeling?: number | null;
  notes?: string | null;
}

export interface PersonalBest {
  id: string;
  user_id: string;
  discipline: string;
  group: string;
  unit: string;
  value: number;
  date: string;
  dive_log_id: string;
  previous_value: number | null;
  improvement_percent: number | null;
}

export interface DiveSaveResult {
  dive: DiveLog;
  new_pb: PersonalBest | null;
}

export interface Goal {
  id: string;
  user_id: string;
  discipline: string;
  unit: string;
  target_value: number;
  target_date: string | null;
  status: "active" | "achieved" | "archived";
  current_value: number;
  progress_percent: number;
  remaining: number;
}

export type StepType =
  | "breathe"
  | "hold"
  | "recovery"
  | "relax"
  | "stretch"
  | "preparation"
  | "main_attempt"
  | "custom";

export interface TableStep {
  step_order: number;
  step_type: StepType;
  duration_seconds: number;
  instruction: string | null;
  label: string | null;
}

export interface TrainingTable {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  description: string | null;
  is_template: boolean;
  steps: TableStep[];
  total_seconds: number;
}

export interface TrainingEntry {
  id: string;
  user_id: string;
  source: "session" | "manual";
  date: string;
  training_type: string;
  table_name: string;
  duration_seconds: number;
  completed_steps: number | null;
  total_steps: number | null;
  longest_hold_seconds: number | null;
  result: string | null;
  difficulty: number | null;
  notes: string | null;
}

export interface LearningResource {
  id: string;
  title: string;
  organization: string | null;
  level: string | null;
  description: string | null;
  category: string;
  resource_type: string;
  resource_url: string;
  is_active: boolean;
}

export interface Certification {
  id: string;
  user_id: string;
  agency: string;
  certification: string;
  instructor: string | null;
  certification_date: string | null;
  expiration_date: string | null;
  certificate_number: string | null;
  certificate_file_url: string | null;
}

export interface DashboardStat {
  label: string;
  discipline: string | null;
  value: number | null;
  unit: string;
  display: string;
}

export interface SeriesPoint {
  date: string;
  value: number;
  is_pb: boolean;
}

export interface DisciplineProgress {
  discipline: string;
  unit: string;
  current_pb: number | null;
  previous_pb: number | null;
  improvement_percent: number | null;
  total_sessions: number;
  last_session_date: string | null;
  series: SeriesPoint[];
}

export interface WeeklyTraining {
  label: string;
  sessions: number;
  total_seconds: number;
}

export interface DashboardData {
  user: User;
  profile: DiverProfile;
  stats: DashboardStat[];
  total_dives: number;
  total_training_sessions: number;
  recent_dives: DiveLog[];
  goals: Goal[];
  depth_series: SeriesPoint[];
  depth_discipline: string | null;
  week_training: WeeklyTraining[];
  week_total_seconds: number;
}

export interface StudentSummary {
  user: User;
  certification: string | null;
  depth_pb: number | null;
  depth_discipline: string | null;
  target: number | null;
  last_training_date: string | null;
}

export interface InstructorNote {
  id: string;
  instructor_id: string;
  instructor_name: string;
  student_id: string;
  note: string;
}

export interface AdminOverview {
  total_users: number;
  total_students: number;
  total_instructors: number;
  active_courses: number;
  total_dive_logs: number;
  total_training_sessions: number;
  total_resources: number;
  recent_registrations: User[];
}

export interface OkResult {
  ok: boolean;
}

export interface ForgotPasswordResult {
  reset_token: string | null;
  message: string;
}
