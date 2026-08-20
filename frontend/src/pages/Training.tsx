import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState, SafetyNotice } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import {
  TRAINING_TYPES,
  formatDate,
  hhmm,
  mmss,
  parseDuration,
  todayIso,
  trainingTypeLabel,
} from "@/lib/fd";
import { cn } from "@/lib/utils";
import type { TrainingEntry, TrainingTable } from "@/lib/types";

const CATEGORIES = [
  { value: "all", label: "All tables" },
  { value: "co2", label: "CO2 Tables" },
  { value: "o2", label: "O2 Tables" },
  { value: "warmup", label: "Warm-up Tables" },
  { value: "custom", label: "Custom Tables" },
];

export default function Training() {
  return (
    <AppShell title="Training">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="heading text-2xl font-semibold" data-testid="training-title">
            Training
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One table engine for CO2, O2, warm-up and fully custom sequences.
          </p>
        </div>

        <SafetyNotice />

        <Tabs defaultValue="tables">
          <TabsList variant="line" data-testid="training-tabs">
            <TabsTrigger value="tables" data-testid="training-tab-tables">
              Tables
            </TabsTrigger>
            <TabsTrigger value="log" data-testid="training-tab-log">
              Log training
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="training-tab-history">
              History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tables" className="pt-5">
            <TablesPanel />
          </TabsContent>
          <TabsContent value="log" className="pt-5">
            <ManualLogPanel />
          </TabsContent>
          <TabsContent value="history" className="pt-5">
            <HistoryPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function TablesPanel() {
  const [category, setCategory] = useState("all");
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["training-tables", category],
    queryFn: () => apiGet<TrainingTable[]>(`/training/tables?category=${category}`),
    retry: false,
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => apiPost<TrainingTable>(`/training/tables/${id}/duplicate`),
    onSuccess: async () => {
      toast.success("Table duplicated to your library.");
      await qc.invalidateQueries({ queryKey: ["training-tables"] });
    },
    onError: () => toast.error("Could not duplicate this table."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/training/tables/${id}`),
    onSuccess: async () => {
      toast.success("Table deleted.");
      await qc.invalidateQueries({ queryKey: ["training-tables"] });
    },
    onError: () => toast.error("Templates cannot be deleted — duplicate them instead."),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={category} onValueChange={(value: string) => setCategory(value)}>
          <SelectTrigger className="min-w-44" data-testid="training-category-filter">
            <SelectValue>
              {(v) => CATEGORIES.find((c) => c.value === v)?.label ?? "All tables"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link
          to="/app/training/tables/new"
          className={buttonVariants({ size: "sm" })}
          data-testid="training-new-table-button"
        >
          <Plus className="size-4" /> New table
        </Link>
      </div>

      {isLoading ? <LoadingVeil label="Loading tables" /> : null}
      {isError ? <ErrorState testid="training-tables-error" /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          testid="training-tables-empty"
          title="No tables in this category."
          description="Create your own sequence of breathe, hold and recovery steps."
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2" data-testid="training-tables-list">
        {(data ?? []).map((table) => (
          <div
            key={table.id}
            className="glass flex flex-col rounded-2xl px-5 py-5"
            data-testid={`table-card-${table.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge variant="outline" className="text-primary uppercase">
                  {table.category}
                </Badge>
                <h3 className="heading mt-2 text-base font-semibold">{table.name}</h3>
              </div>
              {table.is_template ? <Badge variant="secondary">Template</Badge> : null}
            </div>
            {table.description ? (
              <p className="mt-2 text-xs text-muted-foreground">{table.description}</p>
            ) : null}
            <p className="stat-num mt-3 text-sm text-muted-foreground">
              {table.steps.length} steps · {mmss(table.total_seconds)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/app/training/run/${table.id}`}
                className={buttonVariants({ size: "sm" })}
                data-testid={`table-run-${table.id}`}
              >
                <Play className="size-4" /> Run
              </Link>
              {!table.is_template ? (
                <Link
                  to={`/app/training/tables/${table.id}`}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  data-testid={`table-edit-${table.id}`}
                >
                  <Pencil className="size-4" /> Edit
                </Link>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => duplicate.mutate(table.id)}
                data-testid={`table-duplicate-${table.id}`}
              >
                <Copy className="size-4" /> Duplicate
              </Button>
              {!table.is_template ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove.mutate(table.id)}
                  data-testid={`table-delete-${table.id}`}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualLogPanel() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState("dry");
  const [duration, setDuration] = useState("");
  const [result, setResult] = useState("");
  const [difficulty, setDifficulty] = useState("5");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<TrainingEntry>("/training/logs", body),
    onSuccess: async () => {
      toast.success("Training logged.");
      setDuration("");
      setResult("");
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["training-history"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not save this training log."),
  });

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const seconds = parseDuration(duration);
        if (!date) return toast.error("Date is required.");
        if (seconds === null || seconds <= 0) {
          return toast.error("Enter the duration as mm:ss.");
        }
        create.mutate({
          date,
          training_type: type,
          duration_seconds: seconds,
          result: result || null,
          difficulty: Number(difficulty),
          notes: notes || null,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="training-date">Date *</Label>
          <Input
            id="training-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            data-testid="training-log-date-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="training-duration">Duration (mm:ss) *</Label>
          <Input
            id="training-duration"
            placeholder="24:30"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            data-testid="training-log-duration-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="training-type">Training type *</Label>
        <Select value={type} onValueChange={(value: string) => setType(value)}>
          <SelectTrigger id="training-type" data-testid="training-log-type-select">
            <SelectValue>{(v) => trainingTypeLabel(v as string)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TRAINING_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="training-result">Result</Label>
        <Input
          id="training-result"
          placeholder="Longest hold 02:40"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          data-testid="training-log-result-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="training-difficulty">Difficulty (1–10)</Label>
        <Input
          id="training-difficulty"
          inputMode="numeric"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          data-testid="training-log-difficulty-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="training-notes">Notes</Label>
        <Textarea
          id="training-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          data-testid="training-log-notes-input"
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={create.isPending}
        data-testid="training-log-save-button"
      >
        Save training log
      </Button>
    </form>
  );
}

function HistoryPanel() {
  const [filter, setFilter] = useState("all");
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["training-history", filter],
    queryFn: () => apiGet<TrainingEntry[]>(`/training/history?training_type=${filter}`),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/training/history/${id}`),
    onSuccess: async () => {
      toast.success("Entry removed.");
      await qc.invalidateQueries({ queryKey: ["training-history"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not remove this entry."),
  });

  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={(value: string) => setFilter(value)}>
        <SelectTrigger className="min-w-44" data-testid="training-history-filter">
          <SelectValue>
            {(v) => (v === "all" ? "All training" : trainingTypeLabel(v as string))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All training</SelectItem>
          {TRAINING_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? <LoadingVeil label="Loading history" /> : null}
      {isError ? <ErrorState testid="training-history-error" /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          testid="training-history-empty"
          title="No training recorded yet."
          description="Run a table or add a manual training log to build your history."
        />
      ) : null}

      <ul className="space-y-2" data-testid="training-history-list">
        {(data ?? []).map((entry) => (
          <li
            key={entry.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-white/6 bg-card px-4 py-3"
            data-testid={`training-entry-${entry.id}`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs tracking-[0.16em] text-primary uppercase">
                  {trainingTypeLabel(entry.training_type)}
                </span>
                {entry.table_name ? (
                  <span className="text-xs text-muted-foreground">{entry.table_name}</span>
                ) : null}
                {entry.completed_steps !== null && entry.total_steps ? (
                  <Badge variant="secondary">
                    {entry.completed_steps}/{entry.total_steps}
                  </Badge>
                ) : null}
              </div>
              <p className="stat-num mt-1 text-lg">{hhmm(entry.duration_seconds)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(entry.date)}
                {entry.longest_hold_seconds
                  ? ` · longest hold ${mmss(entry.longest_hold_seconds)}`
                  : ""}
                {entry.difficulty ? ` · difficulty ${entry.difficulty}/10` : ""}
              </p>
              {entry.result ? (
                <p className="mt-1 text-xs text-muted-foreground">{entry.result}</p>
              ) : null}
              {entry.notes ? (
                <p className="mt-1 text-xs text-muted-foreground/80">{entry.notes}</p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("shrink-0")}
              onClick={() => remove.mutate(entry.id)}
              data-testid={`training-entry-delete-${entry.id}`}
              aria-label="Delete entry"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
