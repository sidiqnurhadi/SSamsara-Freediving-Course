import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { ALL_DISCIPLINES, formatDate, formatUnitValue, parseDuration, unitOf } from "@/lib/fd";
import type { Goal } from "@/lib/types";

export default function Goals() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [discipline, setDiscipline] = useState("CWTB");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["goals"],
    queryFn: () => apiGet<Goal[]>("/goals"),
    retry: false,
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<Goal>("/goals", body),
    onSuccess: async () => {
      setOpen(false);
      setTarget("");
      setTargetDate("");
      toast.success("Goal created.");
      await qc.invalidateQueries({ queryKey: ["goals"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not create this goal."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/goals/${id}`),
    onSuccess: async () => {
      toast.success("Goal removed.");
      await qc.invalidateQueries({ queryKey: ["goals"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not remove this goal."),
  });

  const isStatic = unitOf(discipline) === "s";

  return (
    <AppShell title="Goals">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="heading text-2xl font-semibold" data-testid="goals-title">
              Goals
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Progress is measured against your current personal best.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" data-testid="goals-add-button" />}>
              <Plus className="size-4" /> New goal
            </DialogTrigger>
            <DialogContent data-testid="goal-dialog">
              <DialogHeader>
                <DialogTitle>New goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-discipline">Discipline</Label>
                  <Select
                    value={discipline}
                    onValueChange={(value: string) => {
                      setDiscipline(value);
                      setTarget("");
                    }}
                  >
                    <SelectTrigger id="goal-discipline" data-testid="goal-discipline-select">
                      <SelectValue>{(v) => String(v)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_DISCIPLINES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-target">
                    Target {isStatic ? "(mm:ss)" : "(metres)"}
                  </Label>
                  <Input
                    id="goal-target"
                    inputMode={isStatic ? "text" : "decimal"}
                    placeholder={isStatic ? "04:00" : "30"}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    data-testid="goal-target-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-date">Target date (optional)</Label>
                  <Input
                    id="goal-date"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    data-testid="goal-date-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" data-testid="goal-cancel-button" />}>
                  Cancel
                </DialogClose>
                <Button
                  onClick={() => {
                    const value = isStatic ? parseDuration(target) : Number(target);
                    if (!value || Number.isNaN(value) || value <= 0) {
                      toast.error("Enter a valid target greater than zero.");
                      return;
                    }
                    create.mutate({
                      discipline,
                      target_value: value,
                      target_date: targetDate || null,
                      status: "active",
                    });
                  }}
                  disabled={create.isPending}
                  data-testid="goal-save-button"
                >
                  Create goal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <LoadingVeil label="Loading goals" /> : null}
        {isError ? <ErrorState testid="goals-error" /> : null}
        {data && data.length === 0 ? (
          <EmptyState
            testid="goals-empty"
            title="No goals yet."
            description="Set a target depth, distance or hold time to track how close you are."
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2" data-testid="goals-list">
          {(data ?? []).map((goal) => (
            <div
              key={goal.id}
              className="glass rounded-2xl px-5 py-5"
              data-testid={`goal-card-${goal.discipline}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs tracking-[0.2em] text-primary uppercase">
                    {goal.discipline}
                  </p>
                  <p className="stat-num mt-2 text-2xl">
                    {formatUnitValue(goal.unit, goal.current_value)} /{" "}
                    {formatUnitValue(goal.unit, goal.target_value)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={goal.status === "achieved" ? "default" : "secondary"}
                    data-testid={`goal-status-${goal.discipline}`}
                  >
                    {goal.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove.mutate(goal.id)}
                    data-testid={`goal-delete-${goal.discipline}`}
                    aria-label="Delete goal"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700"
                  style={{ width: `${goal.progress_percent}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{goal.progress_percent}%</span>
                <span>
                  {goal.remaining > 0
                    ? `${formatUnitValue(goal.unit, goal.remaining)} to go`
                    : "Target reached"}
                </span>
              </div>
              {goal.target_date ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Target date {formatDate(goal.target_date)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
