import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { formatDate, formatUnitValue } from "@/lib/fd";
import type { PersonalBest } from "@/lib/types";

export default function PersonalBests() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["personal-bests"],
    queryFn: () => apiGet<PersonalBest[]>("/personal-bests"),
    retry: false,
  });

  const depth = (data ?? []).filter((pb) => pb.group === "depth");
  const pool = (data ?? []).filter((pb) => pb.group !== "depth");

  return (
    <AppShell title="Personal Best">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h2 className="heading text-2xl font-semibold" data-testid="personal-bests-title">
            Personal bests
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Updated automatically from your dive log — no duplicate entry needed.
          </p>
        </div>

        {isLoading ? <LoadingVeil label="Loading personal bests" /> : null}
        {isError ? <ErrorState testid="personal-bests-error" /> : null}

        {data && data.length === 0 ? (
          <EmptyState
            testid="personal-bests-empty"
            title="No personal bests yet."
            description="Log a dive and your first PB will appear here automatically."
            action={
              <Link to="/app/dives/new" className={buttonVariants({ size: "sm" })}>
                + Add Dive
              </Link>
            }
          />
        ) : null}

        {depth.length > 0 ? <Section title="Depth PB" items={depth} testid="pb-depth-section" /> : null}
        {pool.length > 0 ? <Section title="Pool PB" items={pool} testid="pb-pool-section" /> : null}
      </div>
    </AppShell>
  );
}

function Section({
  title,
  items,
  testid,
}: {
  title: string;
  items: PersonalBest[];
  testid: string;
}) {
  return (
    <section data-testid={testid}>
      <h3 className="heading text-sm tracking-[0.2em] text-muted-foreground uppercase">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((pb) => (
          <div
            key={pb.id}
            className="glass relative overflow-hidden rounded-2xl px-5 py-5"
            data-testid={`pb-card-${pb.discipline}`}
          >
            <div className="flex items-start justify-between">
              <p className="text-xs tracking-[0.2em] text-primary uppercase">{pb.discipline}</p>
              <Trophy className="size-4 text-[#f0b45f]" />
            </div>
            <p className="stat-num mt-3 text-4xl">{formatUnitValue(pb.unit, pb.value)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDate(pb.date)}</p>
            <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-xs">
              <span className="text-muted-foreground">
                Previous{" "}
                {pb.previous_value !== null ? formatUnitValue(pb.unit, pb.previous_value) : "—"}
              </span>
              {pb.improvement_percent !== null ? (
                <span className="text-primary">+{pb.improvement_percent}%</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
