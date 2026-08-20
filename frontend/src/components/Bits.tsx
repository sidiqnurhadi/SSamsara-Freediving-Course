import { ShieldAlert } from "lucide-react";

export function SafetyNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 ${className}`}
      data-testid="safety-notice"
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Safety reminder. </span>
        Breath-hold training should be performed responsibly. Never practice breath holding in
        water alone. Always use appropriate supervision and follow recognized freediving safety
        procedures.
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  testid,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  testid: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center"
      data-testid={testid}
    >
      <h3 className="heading text-base font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({ message, testid }: { message?: string; testid: string }) {
  return (
    <div
      className="rounded-2xl border border-destructive/25 bg-destructive/5 px-5 py-6 text-sm text-muted-foreground"
      data-testid={testid}
    >
      {message ?? "We could not load this data right now. Please try again."}
    </div>
  );
}

export function StatTile({
  label,
  sub,
  value,
  testid,
}: {
  label: string;
  sub?: string | null;
  value: string;
  testid: string;
}) {
  return (
    <div className="glass rounded-2xl px-4 py-4" data-testid={testid}>
      <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <p className="stat-num mt-2 text-3xl text-foreground lg:text-4xl">{value}</p>
      {sub ? <p className="mt-1 text-xs text-primary/80">{sub}</p> : null}
    </div>
  );
}
