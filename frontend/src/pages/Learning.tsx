import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, FileText, Lock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { LearningResource, LearningSummary, ResourceUrl } from "@/lib/types";

const FILTERS = [
  { value: "available", label: "All Available" },
  { value: "my-level", label: "My Level" },
  { value: "locked", label: "Locked" },
  { value: "AIDA Manuals", label: "Manuals" },
  { value: "Freediving Safety", label: "Safety" },
  { value: "Equalization", label: "Equalization" },
  { value: "Training", label: "Training" },
  { value: "all", label: "Everything" },
];

const PREVIEW = [
  { value: "off", label: "Preview: off (full access)" },
  { value: "1", label: "Preview as AIDA 1" },
  { value: "2", label: "Preview as AIDA 2" },
  { value: "3", label: "Preview as AIDA 3" },
  { value: "4", label: "Preview as AIDA 4" },
];

/** Course slug to send a diver to when a resource is above their level. */
const COURSE_FOR_LEVEL: Record<string, string> = {
  "AIDA 1": "beginner-freediver",
  "AIDA 2": "beginner-freediver",
  "AIDA 3": "intermediate-freediver",
  "AIDA 4": "advanced-freediver",
};

export default function Learning() {
  const { data: me } = useMe();
  const [filter, setFilter] = useState("available");
  const [preview, setPreview] = useState("off");
  const isSuper = me?.role === "super_admin";
  const query = isSuper && preview !== "off" ? `?preview_rank=${preview}` : "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["learning-resources", query],
    queryFn: () => apiGet<LearningResource[]>(`/learning-resources${query}`),
    retry: false,
  });

  const { data: summary } = useQuery({
    queryKey: ["learning-summary", query],
    queryFn: () => apiGet<LearningSummary>(`/learning-resources/summary${query}`),
    retry: false,
  });

  async function open(resource: LearningResource) {
    try {
      const res = await apiGet<ResourceUrl>(
        `/learning-resources/${resource.id}/open${query}`,
      );
      window.open(res.resource_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const detail =
        err instanceof ApiError && typeof (err.body as { detail?: string })?.detail === "string"
          ? (err.body as { detail: string }).detail
          : "This resource is not available for your certification level.";
      toast.error(detail);
    }
  }

  const items = (data ?? []).filter((item) => {
    if (filter === "all") return true;
    if (filter === "available") return !item.locked;
    if (filter === "locked") return item.locked;
    if (filter === "my-level") {
      return !item.locked && item.minimum_level_rank === (summary?.rank ?? 0);
    }
    return item.category === filter;
  });

  return (
    <AppShell title="Learning">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="heading text-2xl font-semibold" data-testid="learning-title">
            Learning resources
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Links configured by the school to official or authorized material. Access follows your
            verified certification level — you can read your level and everything below it.
          </p>
        </div>

        {summary ? (
          <div
            className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
            data-testid="learning-level-banner"
          >
            <div>
              <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                Your learning level
              </p>
              <p className="stat-num mt-1 text-2xl" data-testid="learning-level-value">
                {summary.unrestricted
                  ? "Full access"
                  : (summary.level ?? "Not certified yet")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Accessible: {summary.accessible_levels.join(" · ") || "public resources only"}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="text-muted-foreground">
                Available{" "}
                <span className="stat-num text-foreground" data-testid="learning-available-count">
                  {summary.available_count}
                </span>{" "}
                · Locked{" "}
                <span className="stat-num text-foreground" data-testid="learning-locked-count">
                  {summary.locked_count}
                </span>
              </p>
              {summary.next_level && !summary.unrestricted ? (
                <Link
                  to={`/courses/${COURSE_FOR_LEVEL[summary.next_level] ?? "courses"}`}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-2")}
                  data-testid="learning-next-level-link"
                >
                  Explore {summary.next_level} course
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={(value: string) => setFilter(value)}>
            <SelectTrigger className="min-w-44" data-testid="learning-filter">
              <SelectValue>
                {(v) => FILTERS.find((f) => f.value === v)?.label ?? "All Available"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isSuper ? (
            <Select value={preview} onValueChange={(value: string) => setPreview(value)}>
              <SelectTrigger className="min-w-52" data-testid="learning-preview-select">
                <SelectValue>
                  {(v) => PREVIEW.find((p) => p.value === v)?.label ?? "Preview: off"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PREVIEW.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {isLoading ? <LoadingVeil label="Loading resources" /> : null}
        {isError ? <ErrorState testid="learning-error" /> : null}
        {data && items.length === 0 ? (
          <EmptyState
            testid="learning-empty"
            title="Nothing to show for this filter."
            description="Try 'Everything' to see the whole catalogue, including locked material."
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2" data-testid="learning-list">
          {items.map((resource) => (
            <article
              key={resource.id}
              className={cn(
                "glass flex flex-col rounded-2xl px-5 py-5 transition-opacity duration-300",
                resource.locked && "opacity-80",
              )}
              data-testid={`learning-card-${resource.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs tracking-[0.18em] text-primary uppercase">
                    {resource.organization ?? "Resource"}
                  </p>
                  <h4 className="heading mt-2 text-base font-semibold">{resource.title}</h4>
                </div>
                {resource.locked ? (
                  <Badge variant="outline" data-testid={`learning-locked-badge-${resource.id}`}>
                    <Lock className="size-3" /> Locked
                  </Badge>
                ) : (
                  <Badge variant="secondary">Available</Badge>
                )}
              </div>

              {resource.description ? (
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{resource.description}</p>
              ) : (
                <div className="flex-1" />
              )}

              {resource.locked ? (
                <>
                  <p
                    className="mt-4 text-xs text-muted-foreground"
                    data-testid={`learning-requirement-${resource.id}`}
                  >
                    Requires {resource.required_level} certification
                  </p>
                  <Link
                    to={`/courses/${COURSE_FOR_LEVEL[resource.required_level ?? ""] ?? "advanced-freediver"}`}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}
                    data-testid={`learning-view-course-${resource.id}`}
                  >
                    View Course
                  </Link>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-5"
                  onClick={() => open(resource)}
                  data-testid={`learning-open-${resource.id}`}
                >
                  {resource.resource_type === "pdf" ? (
                    <>
                      <FileText className="size-4" /> Open PDF
                    </>
                  ) : (
                    <>
                      <BookOpen className="size-4" /> Open Manual
                    </>
                  )}
                  <ExternalLink className="size-3.5" />
                </Button>
              )}
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
