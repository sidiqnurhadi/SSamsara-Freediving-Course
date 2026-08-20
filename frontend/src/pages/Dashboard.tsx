import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Timer, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState, StatTile } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import PerformanceChart from "@/components/PerformanceChart";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { FEELINGS, formatDate, formatUnitValue, formatValue, hhmm, trainingTypeLabel } from "@/lib/fd";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardData>("/dashboard"),
    retry: false,
  });

  const activeGoals = (data?.goals ?? []).filter((g) => g.status === "active");

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="animate-rise">
          <p className="text-xs tracking-[0.24em] text-primary uppercase">{greeting()}</p>
          <h2 className="heading mt-2 text-3xl font-semibold" data-testid="dashboard-greeting">
            {data?.user.name ?? "Diver"}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" data-testid="dashboard-certification-badge">
              {data?.profile.certification_summary ?? "Freediver"}
            </Badge>
            {data?.profile.preferred_discipline ? (
              <Badge variant="outline">Prefers {data.profile.preferred_discipline}</Badge>
            ) : null}
            {data?.profile.home_training_location ? (
              <span>{data.profile.home_training_location}</span>
            ) : null}
          </div>
        </header>

        {isLoading ? <LoadingVeil label="Loading your dashboard" /> : null}
        {isError ? (
          <ErrorState
            testid="dashboard-error"
            message="Your logbook data could not be loaded. Check your connection and try again."
          />
        ) : null}

        {data ? (
          <>
            <section
              className="grid grid-cols-2 gap-3 lg:grid-cols-5"
              data-testid="dashboard-stats"
            >
              {data.stats.map((stat) => (
                <StatTile
                  key={stat.label}
                  label={stat.label}
                  sub={stat.discipline}
                  value={stat.display}
                  testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
                />
              ))}
            </section>

            {activeGoals.length > 0 ? (
              <section className="space-y-3" data-testid="dashboard-goals">
                <div className="flex items-center justify-between">
                  <h3 className="heading text-sm tracking-[0.18em] uppercase">Current goal</h3>
                  <Link to="/app/goals" className="text-xs text-primary">
                    All goals
                  </Link>
                </div>
                {activeGoals.slice(0, 1).map((goal) => (
                  <div key={goal.id} className="glass rounded-2xl px-5 py-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                          {goal.discipline}
                        </p>
                        <p className="stat-num mt-1 text-2xl">
                          {formatUnitValue(goal.unit, goal.current_value)} /{" "}
                          {formatUnitValue(goal.unit, goal.target_value)}
                        </p>
                      </div>
                      <p className="stat-num text-2xl text-primary">{goal.progress_percent}%</p>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-700"
                        style={{ width: `${goal.progress_percent}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {formatUnitValue(goal.unit, goal.remaining)} to go
                    </p>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="glass rounded-2xl px-4 py-5 sm:px-5">
              <div className="flex items-center justify-between">
                <h3 className="heading text-sm tracking-[0.18em] uppercase">
                  Depth progress {data.depth_discipline ? `· ${data.depth_discipline}` : ""}
                </h3>
                <Link to="/app/progress" className="text-xs text-primary">
                  Details
                </Link>
              </div>
              {data.depth_series.length > 1 ? (
                <PerformanceChart
                  series={data.depth_series}
                  unit="m"
                  testid="dashboard-depth-chart"
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Log two or more depth dives to see your progression curve.
                </p>
              )}
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="heading text-sm tracking-[0.18em] uppercase">Recent dives</h3>
                  <Link to="/app/dives" className="text-xs text-primary">
                    Dive log
                  </Link>
                </div>
                {data.recent_dives.length === 0 ? (
                  <EmptyState
                    testid="dashboard-recent-dives-empty"
                    title="No dives recorded yet."
                    description="Start your journey by adding your first dive."
                    action={
                      <Link
                        to="/app/dives/new"
                        className={buttonVariants({ size: "sm" })}
                        data-testid="dashboard-add-first-dive"
                      >
                        + Add Dive
                      </Link>
                    }
                  />
                ) : (
                  <ul className="space-y-2" data-testid="dashboard-recent-dives">
                    {data.recent_dives.map((dive) => (
                      <li key={dive.id}>
                        <Link
                          to={`/app/dives/${dive.id}/edit`}
                          className="flex items-center justify-between rounded-xl border border-white/6 bg-card px-4 py-3 transition-colors duration-200 hover:border-primary/30"
                          data-testid={`recent-dive-${dive.id}`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs tracking-[0.16em] text-primary uppercase">
                                {dive.discipline}
                              </span>
                              {dive.is_pb ? (
                                <Trophy className="size-3.5 text-[#f0b45f]" />
                              ) : null}
                            </div>
                            <p className="stat-num mt-1 text-xl">
                              {formatValue(dive.discipline, dive.value)}
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>{formatDate(dive.date)}</p>
                            {dive.location ? <p className="mt-1">{dive.location}</p> : null}
                            {dive.feeling ? (
                              <p className="mt-1 text-base">
                                {FEELINGS.find((f) => f.score === dive.feeling)?.emoji}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="heading text-sm tracking-[0.18em] uppercase">This week</h3>
                  <Link to="/app/training" className="text-xs text-primary">
                    Training
                  </Link>
                </div>
                <div className="glass rounded-2xl px-5 py-5">
                  <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                    Total training time
                  </p>
                  <p className="stat-num mt-1 text-3xl">{hhmm(data.week_total_seconds)}</p>
                  {data.week_training.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No sessions logged this week yet.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-2 text-sm">
                      {data.week_training.map((bucket) => (
                        <li
                          key={bucket.label}
                          className="flex items-center justify-between text-muted-foreground"
                        >
                          <span>{trainingTypeLabel(bucket.label)}</span>
                          <span className="stat-num text-foreground">
                            {bucket.sessions} {bucket.sessions === 1 ? "session" : "sessions"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    to="/app/training"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-5 w-full")}
                    data-testid="dashboard-start-training-link"
                  >
                    <Timer className="size-4" /> Run a table
                    <ArrowRight className="size-4" />
                  </Link>
                </div>

                <div className="glass rounded-2xl px-5 py-5" data-testid="dashboard-learning-card">
                  <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                    Learning
                  </p>
                  <p className="stat-num mt-1 text-2xl" data-testid="dashboard-learning-level">
                    {data.learning.unrestricted
                      ? "Full access"
                      : (data.learning.level ?? "Not certified yet")}
                  </p>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Available resources</dt>
                      <dd className="stat-num" data-testid="dashboard-learning-available">
                        {data.learning.available_count}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Locked</dt>
                      <dd className="stat-num">{data.learning.locked_count}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Next level</dt>
                      <dd>{data.learning.next_level ?? "Highest level reached"}</dd>
                    </div>
                  </dl>
                  <Link
                    to="/app/learning"
                    className={cn(buttonVariants({ size: "sm" }), "mt-5 w-full")}
                    data-testid="dashboard-continue-learning-link"
                  >
                    <BookOpen className="size-4" /> Continue learning
                  </Link>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
