import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { SafetyNotice } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { STEP_LABELS, hhmm, mmss } from "@/lib/fd";
import type { TrainingEntry, TrainingTable } from "@/lib/types";

function cue() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(180);
    }
  } catch {
    // vibration is optional — the timer stays fully usable without it
  }
}

export default function TrainingTimer() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: table, isLoading } = useQuery({
    queryKey: ["training-table", id],
    queryFn: () => apiGet<TrainingTable>(`/training/tables/${id}`),
    retry: false,
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [difficulty, setDifficulty] = useState("5");
  const [notes, setNotes] = useState("");
  const startedRef = useRef(false);

  const steps = table?.steps ?? [];
  const current = steps[stepIndex];
  const next = steps[stepIndex + 1];

  useEffect(() => {
    if (!table || startedRef.current) return;
    startedRef.current = true;
    setRemaining(table.steps[0]?.duration_seconds ?? 0);
  }, [table]);

  const advance = useCallback(() => {
    setStepIndex((index) => {
      const upcoming = steps[index + 1];
      if (!upcoming) {
        setRunning(false);
        setFinished(true);
        return index;
      }
      setRemaining(upcoming.duration_seconds);
      cue();
      return index + 1;
    });
  }, [steps]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
      setRemaining((value) => {
        if (value <= 1) {
          advance();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, advance]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPost<TrainingEntry>("/training/sessions", body),
    onSuccess: async () => {
      toast.success("Training complete. Great session.");
      await qc.invalidateQueries();
      navigate("/app/training", { replace: true });
    },
    onError: () => toast.error("Could not save this session."),
  });

  function finishSession(completedSteps: number) {
    if (!table) return;
    const holds = table.steps
      .slice(0, completedSteps)
      .filter((step) => step.step_type === "hold")
      .map((step) => step.duration_seconds);
    save.mutate({
      table_id: table.id,
      table_name: table.name,
      training_type: table.category,
      total_duration: elapsed,
      completed_steps: completedSteps,
      total_steps: table.steps.length,
      longest_hold_seconds: holds.length > 0 ? Math.max(...holds) : 0,
      difficulty: Number(difficulty) || null,
      notes: notes || null,
    });
  }

  if (isLoading) {
    return (
      <AppShell title="Training timer">
        <LoadingVeil label="Loading table" />
      </AppShell>
    );
  }

  if (!table || steps.length === 0) {
    return (
      <AppShell title="Training timer">
        <p className="text-sm text-muted-foreground" data-testid="timer-missing-table">
          This table could not be loaded.
        </p>
      </AppShell>
    );
  }

  const isHold = current?.step_type === "hold";

  return (
    <AppShell title="Training timer">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 pt-2 text-center">
        <div>
          <p className="text-xs tracking-[0.24em] text-primary uppercase" data-testid="timer-table-name">
            {table.name}
          </p>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="timer-step-counter">
            Step {stepIndex + 1} / {steps.length}
          </p>
        </div>

        <div
          className={`relative flex w-full flex-col items-center justify-center rounded-3xl border px-6 py-12 transition-colors duration-500 ${
            isHold
              ? "border-primary/40 bg-primary/10"
              : "border-white/8 bg-card"
          }`}
          data-testid="timer-panel"
        >
          {running ? (
            <span
              className="absolute size-32 animate-ripple rounded-full bg-primary/20"
              aria-hidden
            />
          ) : null}
          <p
            className="heading relative text-2xl font-semibold tracking-[0.2em] uppercase"
            data-testid="timer-step-type"
          >
            {STEP_LABELS[current.step_type]}
          </p>
          <p
            className="stat-num relative mt-4 text-7xl leading-none sm:text-8xl"
            data-testid="timer-remaining"
          >
            {mmss(remaining)}
          </p>
          {current.instruction ? (
            <p className="relative mt-4 text-sm text-muted-foreground">{current.instruction}</p>
          ) : null}
        </div>

        <div className="w-full rounded-2xl border border-white/6 bg-card px-5 py-4 text-left">
          <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Next</p>
          <p className="stat-num mt-1 text-lg" data-testid="timer-next-step">
            {next ? `${STEP_LABELS[next.step_type]} ${mmss(next.duration_seconds)}` : "Finish"}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button
            size="lg"
            className="h-14 flex-1 text-base"
            onClick={() => setRunning((value) => !value)}
            data-testid="timer-toggle-button"
          >
            {running ? (
              <>
                <Pause className="size-5" /> Pause
              </>
            ) : (
              <>
                <Play className="size-5" /> {elapsed === 0 ? "Start" : "Resume"}
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 flex-1 text-base"
            onClick={() => {
              setRunning(false);
              setFinished(true);
            }}
            data-testid="timer-stop-button"
          >
            <Square className="size-5" /> Stop
          </Button>
        </div>

        <p className="stat-num text-xs text-muted-foreground" data-testid="timer-elapsed">
          Elapsed {hhmm(elapsed)}
        </p>

        <SafetyNotice className="text-left" />
      </div>

      <Dialog open={finished} onOpenChange={(open) => !open && setFinished(false)}>
        <DialogContent data-testid="timer-complete-dialog">
          <DialogHeader>
            <DialogTitle>Session complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary/60 px-4 py-3">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="stat-num mt-1 text-lg">
                  {stepIndex + 1} / {steps.length}
                </p>
              </div>
              <div className="rounded-xl bg-secondary/60 px-4 py-3">
                <p className="text-xs text-muted-foreground">Total session</p>
                <p className="stat-num mt-1 text-lg">{mmss(elapsed)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timer-difficulty">Difficulty (1–10)</Label>
              <Input
                id="timer-difficulty"
                inputMode="numeric"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                data-testid="timer-difficulty-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timer-notes">Notes</Label>
              <Textarea
                id="timer-notes"
                rows={3}
                placeholder="Contractions started at round 6."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="timer-notes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFinished(false)}
              data-testid="timer-resume-button"
            >
              Keep going
            </Button>
            <Button
              onClick={() => finishSession(stepIndex + 1)}
              disabled={save.isPending}
              data-testid="timer-save-session-button"
            >
              Save session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
