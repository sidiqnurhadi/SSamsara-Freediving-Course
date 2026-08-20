import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BrandMark } from "@/components/Brand";
import { EmptyState, ErrorState, StatTile } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import PerformanceChart from "@/components/PerformanceChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { formatDate, formatUnitValue, formatValue, hhmm, trainingTypeLabel } from "@/lib/fd";
import { endSession, useMe } from "@/lib/session";
import type {
  DiveLog,
  DisciplineProgress,
  Goal,
  InstructorNote,
  PersonalBest,
  StudentSummary,
  TrainingEntry,
} from "@/lib/types";

function StaffFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const logout = useMutation({
    mutationFn: () => endSession(qc),
    onSuccess: () => navigate("/", { replace: true }),
  });

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark className="size-8" />
            <span className="heading text-xs font-semibold tracking-[0.2em] uppercase">
              {title}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {me ? <span className="hidden text-xs text-muted-foreground sm:block">{me.email}</span> : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              data-testid="staff-logout-button"
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}

export function InstructorDashboard() {
  const [params, setParams] = useSearchParams();
  const studentId = params.get("student");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["instructor-students"],
    queryFn: () => apiGet<StudentSummary[]>("/instructor/students"),
    retry: false,
  });

  if (studentId) {
    return (
      <StaffFrame title="Instructor">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setParams({})}
          data-testid="instructor-back-button"
        >
          Back to students
        </Button>
        <StudentDetail studentId={studentId} />
      </StaffFrame>
    );
  }

  return (
    <StaffFrame title="Instructor">
      <h1 className="heading text-2xl font-semibold" data-testid="instructor-title">
        My students
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You can only see divers assigned to you.
      </p>

      {isLoading ? <LoadingVeil label="Loading students" /> : null}
      {isError ? <ErrorState testid="instructor-error" /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          testid="instructor-empty"
          title="No students assigned yet."
          description="Ask the school admin to assign divers to you."
        />
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="instructor-students-list">
        {(data ?? []).map((student) => (
          <div
            key={student.user.id}
            className="glass rounded-2xl px-5 py-5"
            data-testid={`student-card-${student.user.id}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="heading text-base font-semibold">{student.user.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{student.user.email}</p>
              </div>
              {student.certification ? (
                <Badge variant="secondary">{student.certification}</Badge>
              ) : null}
            </div>
            <dl className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Depth PB</dt>
                <dd className="stat-num">
                  {student.depth_pb !== null
                    ? `${student.depth_pb} m${student.depth_discipline ? ` · ${student.depth_discipline}` : ""}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Target</dt>
                <dd className="stat-num">{student.target !== null ? `${student.target} m` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last training</dt>
                <dd>{student.last_training_date ? formatDate(student.last_training_date) : "—"}</dd>
              </div>
            </dl>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setParams({ student: student.user.id })}
              data-testid={`student-view-progress-${student.user.id}`}
            >
              View progress
            </Button>
          </div>
        ))}
      </div>
    </StaffFrame>
  );
}

function StudentDetail({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const dives = useQuery({
    queryKey: ["student-dives", studentId],
    queryFn: () => apiGet<DiveLog[]>(`/dives?user_id=${studentId}`),
    retry: false,
  });
  const pbs = useQuery({
    queryKey: ["student-pbs", studentId],
    queryFn: () => apiGet<PersonalBest[]>(`/personal-bests?user_id=${studentId}`),
    retry: false,
  });
  const goals = useQuery({
    queryKey: ["student-goals", studentId],
    queryFn: () => apiGet<Goal[]>(`/goals?user_id=${studentId}`),
    retry: false,
  });
  const training = useQuery({
    queryKey: ["student-training", studentId],
    queryFn: () => apiGet<TrainingEntry[]>(`/training/history?user_id=${studentId}`),
    retry: false,
  });
  const progress = useQuery({
    queryKey: ["student-progress", studentId],
    queryFn: () => apiGet<DisciplineProgress[]>(`/progress?group=depth&user_id=${studentId}`),
    retry: false,
  });
  const notes = useQuery({
    queryKey: ["student-notes", studentId],
    queryFn: () => apiGet<InstructorNote[]>(`/instructor/notes?student_id=${studentId}`),
    retry: false,
  });

  const addNote = useMutation({
    mutationFn: () => apiPost<InstructorNote>("/instructor/notes", { student_id: studentId, note }),
    onSuccess: async () => {
      setNote("");
      toast.success("Note added.");
      await qc.invalidateQueries({ queryKey: ["student-notes", studentId] });
    },
    onError: () => toast.error("Could not add the note."),
  });

  const chart = (progress.data ?? []).find((item) => item.series.length > 1);

  return (
    <div className="mt-6 space-y-7">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="student-pb-tiles">
        {(pbs.data ?? []).slice(0, 4).map((pb) => (
          <StatTile
            key={pb.id}
            label={pb.discipline}
            value={formatUnitValue(pb.unit, pb.value)}
            sub={formatDate(pb.date)}
            testid={`student-pb-${pb.discipline}`}
          />
        ))}
      </section>

      {chart ? (
        <section className="glass rounded-2xl px-4 py-5">
          <h3 className="heading text-sm tracking-[0.18em] uppercase">
            Depth progress · {chart.discipline}
          </h3>
          <PerformanceChart series={chart.series} unit={chart.unit} testid="student-depth-chart" />
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="heading text-sm tracking-[0.18em] uppercase">Dive history</h3>
          <ul className="mt-3 space-y-2" data-testid="student-dive-history">
            {(dives.data ?? []).slice(0, 8).map((dive) => (
              <li
                key={dive.id}
                className="flex items-center justify-between rounded-xl border border-white/6 bg-card px-4 py-3 text-sm"
              >
                <span className="text-primary">{dive.discipline}</span>
                <span className="stat-num">{formatValue(dive.discipline, dive.value)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(dive.date)}</span>
              </li>
            ))}
            {(dives.data ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">No dives logged.</li>
            ) : null}
          </ul>
        </div>
        <div>
          <h3 className="heading text-sm tracking-[0.18em] uppercase">Training history</h3>
          <ul className="mt-3 space-y-2" data-testid="student-training-history">
            {(training.data ?? []).slice(0, 8).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-white/6 bg-card px-4 py-3 text-sm"
              >
                <span className="text-primary">{trainingTypeLabel(entry.training_type)}</span>
                <span className="stat-num">{hhmm(entry.duration_seconds)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
              </li>
            ))}
            {(training.data ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">No training logged.</li>
            ) : null}
          </ul>
        </div>
      </section>

      <section>
        <h3 className="heading text-sm tracking-[0.18em] uppercase">Active goals</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3" data-testid="student-goals">
          {(goals.data ?? [])
            .filter((goal) => goal.status === "active")
            .map((goal) => (
              <div key={goal.id} className="rounded-xl border border-white/6 bg-card px-4 py-3">
                <p className="text-xs text-primary">{goal.discipline}</p>
                <p className="stat-num mt-1 text-lg">
                  {formatUnitValue(goal.unit, goal.current_value)} /{" "}
                  {formatUnitValue(goal.unit, goal.target_value)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{goal.progress_percent}%</p>
              </div>
            ))}
          {(goals.data ?? []).filter((g) => g.status === "active").length === 0 ? (
            <p className="text-sm text-muted-foreground">No active goals.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="heading text-sm tracking-[0.18em] uppercase">Instructor notes</h3>
        <div className="mt-3 space-y-3">
          <Textarea
            rows={3}
            placeholder="Focus next session: relaxation, mouthfill transition, freefall posture."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            data-testid="instructor-note-input"
          />
          <Button
            size="sm"
            onClick={() => {
              if (note.trim().length === 0) {
                toast.error("Write a note first.");
                return;
              }
              addNote.mutate();
            }}
            disabled={addNote.isPending}
            data-testid="instructor-note-save-button"
          >
            Add note
          </Button>
          <ul className="space-y-2" data-testid="instructor-notes-list">
            {(notes.data ?? []).map((item) => (
              <li key={item.id} className="rounded-xl border border-white/6 bg-card px-4 py-3">
                <p className="text-sm">{item.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">— {item.instructor_name}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export { StaffFrame };
