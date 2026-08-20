import type { Goal, StepType } from "@/lib/types";

export const DEPTH_DISCIPLINES = ["CWT", "CWTB", "CNF", "FIM", "VWT", "NLT"];
export const DYNAMIC_DISCIPLINES = ["DYN", "DYNB", "DNF"];
export const STATIC_DISCIPLINES = ["STA"];
export const ALL_DISCIPLINES = [
  ...DEPTH_DISCIPLINES,
  ...DYNAMIC_DISCIPLINES,
  ...STATIC_DISCIPLINES,
];

export const DISCIPLINE_LABELS: Record<string, string> = {
  CWT: "CWT — Constant Weight",
  CWTB: "CWTB — Constant Weight Bifins",
  CNF: "CNF — Constant Weight No Fins",
  FIM: "FIM — Free Immersion",
  VWT: "VWT — Variable Weight",
  NLT: "NLT — No Limits",
  DYN: "DYN — Dynamic With Fins",
  DYNB: "DYNB — Dynamic Bifins",
  DNF: "DNF — Dynamic No Fins",
  STA: "STA — Static Apnea",
};

export function groupOf(discipline: string): "depth" | "dynamic" | "static" {
  if (DEPTH_DISCIPLINES.includes(discipline)) return "depth";
  if (DYNAMIC_DISCIPLINES.includes(discipline)) return "dynamic";
  return "static";
}

export function unitOf(discipline: string): "m" | "s" {
  return discipline === "STA" ? "s" : "m";
}

export function metricLabel(discipline: string): string {
  const group = groupOf(discipline);
  if (group === "depth") return "Depth";
  if (group === "dynamic") return "Distance";
  return "Duration";
}

export function mmss(totalSeconds: number): string {
  const secs = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function hhmm(totalSeconds: number): string {
  const secs = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":");
    const mins = Number(m);
    const secs = Number(s);
    if (Number.isNaN(mins) || Number.isNaN(secs) || secs >= 60) return null;
    return mins * 60 + secs;
  }
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : Math.round(n);
}

export function formatValue(discipline: string, value: number): string {
  return unitOf(discipline) === "s" ? mmss(value) : `${Number(value.toFixed(1))} m`;
}

export function formatUnitValue(unit: string, value: number): string {
  return unit === "s" ? mmss(value) : `${Number(value.toFixed(1))} m`;
}

export const FEELINGS: { score: number; emoji: string; label: string }[] = [
  { score: 1, emoji: "😣", label: "Hard" },
  { score: 2, emoji: "😐", label: "Okay" },
  { score: 3, emoji: "🙂", label: "Good" },
  { score: 4, emoji: "😌", label: "Relaxed" },
  { score: 5, emoji: "🔥", label: "Best" },
];

export const STEP_LABELS: Record<StepType, string> = {
  breathe: "Breathe",
  hold: "Hold",
  recovery: "Recovery",
  relax: "Relax",
  stretch: "Stretch",
  preparation: "Preparation",
  main_attempt: "Main Attempt",
  custom: "Custom",
};

export const STEP_TYPES = Object.keys(STEP_LABELS) as StepType[];

export const TRAINING_TYPES = [
  { value: "dry", label: "Dry Training" },
  { value: "static", label: "Static" },
  { value: "dynamic", label: "Dynamic" },
  { value: "depth", label: "Depth" },
  { value: "equalization", label: "Equalization" },
  { value: "co2", label: "CO2 Table" },
  { value: "o2", label: "O2 Table" },
  { value: "warmup", label: "Warm-up" },
  { value: "stretching", label: "Stretching" },
  { value: "cardio", label: "Cardio" },
  { value: "custom", label: "Custom" },
];

export function trainingTypeLabel(value: string): string {
  return TRAINING_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function formatPrice(amount: number, currency: string): string {
  if (currency === "IDR") {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return iso;
  return new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function goalHeadline(goal: Goal): string {
  return `${formatUnitValue(goal.unit, goal.current_value)} / ${formatUnitValue(goal.unit, goal.target_value)}`;
}
