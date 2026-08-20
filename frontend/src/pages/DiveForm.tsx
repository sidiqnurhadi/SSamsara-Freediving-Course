import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
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
import { ApiError, apiGet, apiPost, apiPut } from "@/lib/api";
import {
  ALL_DISCIPLINES,
  DISCIPLINE_LABELS,
  FEELINGS,
  formatUnitValue,
  groupOf,
  metricLabel,
  mmss,
  parseDuration,
  todayIso,
  unitOf,
} from "@/lib/fd";
import type { DiveLog, DiveSaveResult } from "@/lib/types";

interface FormState {
  date: string;
  discipline: string;
  value: string;
  duration: string;
  location: string;
  dive_type: string;
  max_heart_rate: string;
  min_heart_rate: string;
  water_temperature: string;
  weight_used: string;
  wetsuit_thickness: string;
  equalization: string;
  buddy: string;
  feeling: number | null;
  notes: string;
}

const EMPTY: FormState = {
  date: todayIso(),
  discipline: "CWTB",
  value: "",
  duration: "",
  location: "",
  dive_type: "",
  max_heart_rate: "",
  min_heart_rate: "",
  water_temperature: "",
  weight_used: "",
  wetsuit_thickness: "",
  equalization: "",
  buddy: "",
  feeling: null,
  notes: "",
};

function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function DiveForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showMore, setShowMore] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["dive", id],
    queryFn: () => apiGet<DiveLog>(`/dives/${id}`),
    enabled: isEdit,
    retry: false,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      date: existing.date,
      discipline: existing.discipline,
      value:
        unitOf(existing.discipline) === "s" ? mmss(existing.value) : String(existing.value),
      duration: existing.duration_seconds ? mmss(existing.duration_seconds) : "",
      location: existing.location ?? "",
      dive_type: existing.dive_type ?? "",
      max_heart_rate: existing.max_heart_rate ? String(existing.max_heart_rate) : "",
      min_heart_rate: existing.min_heart_rate ? String(existing.min_heart_rate) : "",
      water_temperature: existing.water_temperature ? String(existing.water_temperature) : "",
      weight_used: existing.weight_used ? String(existing.weight_used) : "",
      wetsuit_thickness: existing.wetsuit_thickness ? String(existing.wetsuit_thickness) : "",
      equalization: existing.equalization ?? "",
      buddy: existing.buddy ?? "",
      feeling: existing.feeling,
      notes: existing.notes ?? "",
    });
  }, [existing]);

  const isStatic = unitOf(form.discipline) === "s";

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEdit
        ? apiPut<DiveSaveResult>(`/dives/${id}`, body)
        : apiPost<DiveSaveResult>("/dives", body),
    onSuccess: async (result) => {
      await qc.invalidateQueries();
      if (result.new_pb) {
        const pb = result.new_pb;
        toast.success(
          `NEW PERSONAL BEST! ${pb.discipline} ${formatUnitValue(pb.unit, pb.value)}${
            pb.improvement_percent ? ` (+${pb.improvement_percent}%)` : ""
          }`,
          { icon: <Trophy className="size-4 text-[#f0b45f]" />, duration: 6000 },
        );
      } else {
        toast.success("Dive saved successfully.");
      }
      navigate("/app/dives", { replace: true });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        const body = err.body as { detail?: unknown } | null;
        if (typeof body?.detail === "string") return toast.error(body.detail);
      }
      toast.error("Could not save this dive. Please check the values.");
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const rawValue = isStatic ? parseDuration(form.value) : num(form.value);
    if (!form.date) return toast.error("Date is required.");
    if (rawValue === null) {
      return toast.error(
        isStatic ? "Enter the hold time as mm:ss." : "Enter the performance value in metres.",
      );
    }
    if (rawValue <= 0) return toast.error("Performance value must be greater than zero.");
    if (!isStatic && rawValue > 400) return toast.error("That performance value looks impossible.");

    const duration = parseDuration(form.duration);
    if (form.duration && duration === null) return toast.error("Duration must be mm:ss.");

    save.mutate({
      date: form.date,
      discipline: form.discipline,
      value: rawValue,
      duration_seconds: isStatic ? rawValue : duration,
      location: form.location || null,
      dive_type: form.dive_type || null,
      max_heart_rate: num(form.max_heart_rate),
      min_heart_rate: num(form.min_heart_rate),
      water_temperature: num(form.water_temperature),
      weight_used: num(form.weight_used),
      wetsuit_thickness: num(form.wetsuit_thickness),
      equalization: form.equalization || null,
      buddy: form.buddy || null,
      feeling: form.feeling,
      notes: form.notes || null,
    });
  }

  return (
    <AppShell title={isEdit ? "Edit dive" : "Log dive"}>
      <form className="mx-auto max-w-lg space-y-5 pb-8" onSubmit={submit}>
        <div>
          <h2 className="heading text-2xl font-semibold" data-testid="dive-form-title">
            {isEdit ? "Edit dive" : "Log dive"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Required: date, discipline and performance. Everything else is optional.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dive-discipline">Discipline *</Label>
          <Select
            value={form.discipline}
            onValueChange={(value: string) => setForm({ ...form, discipline: value, value: "" })}
          >
            <SelectTrigger id="dive-discipline" data-testid="dive-form-discipline-select">
              <SelectValue>{(v) => DISCIPLINE_LABELS[v as string] ?? String(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ALL_DISCIPLINES.map((d) => (
                <SelectItem key={d} value={d}>
                  {DISCIPLINE_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {groupOf(form.discipline) === "depth"
              ? "Depth discipline — performance is measured in metres of depth."
              : groupOf(form.discipline) === "dynamic"
                ? "Pool discipline — performance is measured in metres of distance."
                : "Static apnea — performance is the hold time."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="dive-value">{metricLabel(form.discipline)} *</Label>
            <Input
              id="dive-value"
              inputMode={isStatic ? "text" : "decimal"}
              placeholder={isStatic ? "03:20" : "24"}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              data-testid="dive-form-value-input"
            />
            <p className="text-[11px] text-muted-foreground">
              {isStatic ? "Format mm:ss" : "Metres"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dive-date">Date *</Label>
            <Input
              id="dive-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              data-testid="dive-form-date-input"
            />
          </div>
        </div>

        {!isStatic ? (
          <div className="space-y-2">
            <Label htmlFor="dive-duration">Duration</Label>
            <Input
              id="dive-duration"
              placeholder="01:22"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              data-testid="dive-form-duration-input"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="dive-location">Location</Label>
          <Input
            id="dive-location"
            placeholder="Pulau Pramuka"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            data-testid="dive-form-location-input"
          />
        </div>

        <div className="space-y-2">
          <Label>Feeling</Label>
          <div className="flex gap-2" data-testid="dive-form-feeling-group">
            {FEELINGS.map((feeling) => (
              <button
                key={feeling.score}
                type="button"
                onClick={() =>
                  setForm({ ...form, feeling: form.feeling === feeling.score ? null : feeling.score })
                }
                aria-label={feeling.label}
                data-testid={`dive-form-feeling-${feeling.score}`}
                className={`flex h-12 flex-1 items-center justify-center rounded-xl border text-xl transition-all duration-200 ${
                  form.feeling === feeling.score
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-white/8 bg-card"
                }`}
              >
                {feeling.emoji}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-card px-4 py-3 text-sm"
          data-testid="dive-form-more-details-toggle"
        >
          More Details
          <ChevronDown
            className={`size-4 transition-transform duration-300 ${showMore ? "rotate-180" : ""}`}
          />
        </button>

        {showMore ? (
          <div className="space-y-4 rounded-xl border border-white/8 bg-card/60 p-4" data-testid="dive-form-more-details">
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="dive-type"
                label="Dive type"
                value={form.dive_type}
                onChange={(v) => setForm({ ...form, dive_type: v })}
                testid="dive-form-dive-type-input"
              />
              <Field
                id="dive-buddy"
                label="Buddy"
                value={form.buddy}
                onChange={(v) => setForm({ ...form, buddy: v })}
                testid="dive-form-buddy-input"
              />
              <Field
                id="dive-max-hr"
                label="Max heart rate"
                value={form.max_heart_rate}
                onChange={(v) => setForm({ ...form, max_heart_rate: v })}
                testid="dive-form-max-hr-input"
                numeric
              />
              <Field
                id="dive-min-hr"
                label="Min heart rate"
                value={form.min_heart_rate}
                onChange={(v) => setForm({ ...form, min_heart_rate: v })}
                testid="dive-form-min-hr-input"
                numeric
              />
              <Field
                id="dive-water-temp"
                label="Water temp (°C)"
                value={form.water_temperature}
                onChange={(v) => setForm({ ...form, water_temperature: v })}
                testid="dive-form-water-temp-input"
                numeric
              />
              <Field
                id="dive-weight"
                label="Weight (kg)"
                value={form.weight_used}
                onChange={(v) => setForm({ ...form, weight_used: v })}
                testid="dive-form-weight-input"
                numeric
              />
              <Field
                id="dive-wetsuit"
                label="Wetsuit (mm)"
                value={form.wetsuit_thickness}
                onChange={(v) => setForm({ ...form, wetsuit_thickness: v })}
                testid="dive-form-wetsuit-input"
                numeric
              />
              <Field
                id="dive-equalization"
                label="Equalization"
                value={form.equalization}
                onChange={(v) => setForm({ ...form, equalization: v })}
                testid="dive-form-equalization-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dive-notes">Notes</Label>
              <Textarea
                id="dive-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                data-testid="dive-form-notes-input"
              />
            </div>
          </div>
        ) : null}

        <div className="sticky bottom-24 flex gap-3 lg:bottom-0">
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={save.isPending}
            data-testid="dive-form-save-button"
          >
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save Dive"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate("/app/dives")}
            data-testid="dive-form-cancel-button"
          >
            Cancel
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  testid,
  numeric = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  testid: string;
  numeric?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        inputMode={numeric ? "decimal" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
      />
    </div>
  );
}
