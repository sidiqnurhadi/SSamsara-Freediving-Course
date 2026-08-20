import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { SafetyNotice } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { STEP_LABELS, STEP_TYPES, mmss, parseDuration } from "@/lib/fd";
import type { StepType, TableStep, TrainingTable } from "@/lib/types";

interface DraftStep {
  step_type: StepType;
  duration: string;
  instruction: string;
}

const CATEGORIES: { value: TrainingTable["category"]; label: string }[] = [
  { value: "co2", label: "CO2 Table" },
  { value: "o2", label: "O2 Table" },
  { value: "warmup", label: "Warm-up Table" },
  { value: "custom", label: "Custom Table" },
];

const DEFAULT_STEPS: DraftStep[] = [
  { step_type: "breathe", duration: "02:00", instruction: "Slow relaxed breathing" },
  { step_type: "hold", duration: "01:30", instruction: "Stay relaxed" },
];

export default function TableEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("custom");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>(DEFAULT_STEPS);

  const { data: existing } = useQuery({
    queryKey: ["training-table", id],
    queryFn: () => apiGet<TrainingTable>(`/training/tables/${id}`),
    enabled: isEdit,
    retry: false,
  });

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setCategory(existing.category);
    setDescription(existing.description ?? "");
    setSteps(
      existing.steps.map((step) => ({
        step_type: step.step_type,
        duration: mmss(step.duration_seconds),
        instruction: step.instruction ?? "",
      })),
    );
  }, [existing]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEdit
        ? apiPut<TrainingTable>(`/training/tables/${id}`, body)
        : apiPost<TrainingTable>("/training/tables", body),
    onSuccess: async () => {
      toast.success(isEdit ? "Table updated." : "Table saved.");
      await qc.invalidateQueries({ queryKey: ["training-tables"] });
      navigate("/app/training", { replace: true });
    },
    onError: () => toast.error("Could not save this table."),
  });

  function move(index: number, direction: -1 | 1) {
    const next = [...steps];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
  }

  const totalSeconds = steps.reduce((sum, step) => sum + (parseDuration(step.duration) ?? 0), 0);

  return (
    <AppShell title={isEdit ? "Edit table" : "New table"}>
      <form
        className="mx-auto max-w-2xl space-y-5 pb-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim().length < 1) return toast.error("Give the table a name.");
          if (steps.length === 0) return toast.error("Add at least one step.");
          const parsed: TableStep[] = [];
          for (let i = 0; i < steps.length; i += 1) {
            const seconds = parseDuration(steps[i].duration);
            if (seconds === null || seconds < 0) {
              return toast.error(`Step ${i + 1} duration must be mm:ss.`);
            }
            parsed.push({
              step_order: i,
              step_type: steps[i].step_type,
              duration_seconds: seconds,
              instruction: steps[i].instruction || null,
              label: null,
            });
          }
          save.mutate({ name: name.trim(), category, description: description || null, steps: parsed });
        }}
      >
        <div>
          <h2 className="heading text-2xl font-semibold" data-testid="table-editor-title">
            {isEdit ? "Edit table" : "New training table"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Any number of ordered steps — breathe, hold, recovery, relax, stretch, preparation or a
            main attempt.
          </p>
        </div>

        <SafetyNotice />

        <div className="space-y-2">
          <Label htmlFor="table-name">Table name *</Label>
          <Input
            id="table-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My CO2 Table"
            data-testid="table-editor-name-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="table-category">Category</Label>
          <Select value={category} onValueChange={(value: string) => setCategory(value)}>
            <SelectTrigger id="table-category" data-testid="table-editor-category-select">
              <SelectValue>
                {(v) => CATEGORIES.find((c) => c.value === v)?.label ?? "Custom Table"}
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="table-description">Description</Label>
          <Textarea
            id="table-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="table-editor-description-input"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Steps</Label>
            <span className="stat-num text-xs text-muted-foreground">
              Total {mmss(totalSeconds)}
            </span>
          </div>

          {steps.map((step, index) => (
            <div
              key={`${index}-${step.step_type}`}
              className="rounded-xl border border-white/8 bg-card px-4 py-4"
              data-testid={`table-editor-step-${index}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-[0.16em] text-primary uppercase">
                  Step {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, -1)}
                    data-testid={`table-editor-step-up-${index}`}
                    aria-label="Move step up"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    data-testid={`table-editor-step-down-${index}`}
                    aria-label="Move step down"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                    data-testid={`table-editor-step-remove-${index}`}
                    aria-label="Remove step"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={step.step_type}
                    onValueChange={(value: string) => {
                      const next = [...steps];
                      next[index] = { ...next[index], step_type: value as StepType };
                      setSteps(next);
                    }}
                  >
                    <SelectTrigger data-testid={`table-editor-step-type-${index}`}>
                      <SelectValue>{(v) => STEP_LABELS[v as StepType]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {STEP_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Duration (mm:ss)</Label>
                  <Input
                    value={step.duration}
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = { ...next[index], duration: e.target.value };
                      setSteps(next);
                    }}
                    data-testid={`table-editor-step-duration-${index}`}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Label className="text-xs">Instruction</Label>
                <Input
                  value={step.instruction}
                  onChange={(e) => {
                    const next = [...steps];
                    next[index] = { ...next[index], instruction: e.target.value };
                    setSteps(next);
                  }}
                  data-testid={`table-editor-step-instruction-${index}`}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() =>
              setSteps([...steps, { step_type: "hold", duration: "01:30", instruction: "" }])
            }
            data-testid="table-editor-add-step-button"
          >
            <Plus className="size-4" /> Add Step
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={save.isPending}
            data-testid="table-editor-save-button"
          >
            {save.isPending ? "Saving…" : "Save table"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate("/app/training")}
            data-testid="table-editor-cancel-button"
          >
            Cancel
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
