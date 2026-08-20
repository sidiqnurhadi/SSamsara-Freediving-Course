import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import PerformanceChart from "@/components/PerformanceChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api";
import { formatDate, formatUnitValue } from "@/lib/fd";
import type { DisciplineProgress } from "@/lib/types";

const GROUPS = [
  { value: "depth", label: "Depth" },
  { value: "dynamic", label: "Dynamic" },
  { value: "static", label: "Static" },
];

export default function ProgressPage() {
  const [group, setGroup] = useState("depth");

  return (
    <AppShell title="Progress">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="heading text-2xl font-semibold" data-testid="progress-title">
            Progress analytics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance over time per discipline, with personal bests marked in amber.
          </p>
        </div>

        <Tabs value={group} onValueChange={(value: string) => setGroup(value)}>
          <TabsList variant="line" data-testid="progress-group-tabs">
            {GROUPS.map((g) => (
              <TabsTrigger key={g.value} value={g.value} data-testid={`progress-tab-${g.value}`}>
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GROUPS.map((g) => (
            <TabsContent key={g.value} value={g.value} className="pt-5">
              <GroupPanel group={g.value} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}

function GroupPanel({ group }: { group: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["progress", group],
    queryFn: () => apiGet<DisciplineProgress[]>(`/progress?group=${group}`),
    retry: false,
  });

  if (isLoading) return <LoadingVeil label="Loading progress" />;
  if (isError) return <ErrorState testid={`progress-error-${group}`} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        testid={`progress-empty-${group}`}
        title="Nothing logged in this group yet."
        description="Add a dive in one of these disciplines to build the chart."
      />
    );
  }

  return (
    <div className="space-y-6">
      {data.map((item) => (
        <section
          key={item.discipline}
          className="glass rounded-2xl px-4 py-5 sm:px-5"
          data-testid={`progress-card-${item.discipline}`}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.2em] text-primary uppercase">{item.discipline}</p>
              <p className="stat-num mt-1 text-3xl">
                {item.current_pb !== null ? formatUnitValue(item.unit, item.current_pb) : "—"}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
              <Metric
                label="Previous PB"
                value={
                  item.previous_pb !== null ? formatUnitValue(item.unit, item.previous_pb) : "—"
                }
              />
              <Metric
                label="Improvement"
                value={item.improvement_percent !== null ? `+${item.improvement_percent}%` : "—"}
              />
              <Metric label="Sessions" value={String(item.total_sessions)} />
              <Metric
                label="Last session"
                value={item.last_session_date ? formatDate(item.last_session_date) : "—"}
              />
            </dl>
          </div>
          {item.series.length > 1 ? (
            <PerformanceChart
              series={item.series}
              unit={item.unit}
              testid={`progress-chart-${item.discipline}`}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              One session logged — add another to draw the trend.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="stat-num mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}
