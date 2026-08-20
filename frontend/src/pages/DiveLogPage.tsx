import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiDelete, apiGet } from "@/lib/api";
import { ALL_DISCIPLINES, FEELINGS, formatDate, formatValue } from "@/lib/fd";
import type { DiveLog } from "@/lib/types";

const GROUPS = [
  { value: "all", label: "All" },
  { value: "depth", label: "Depth" },
  { value: "dynamic", label: "Pool" },
  { value: "static", label: "Static" },
];

export default function DiveLogPage() {
  const [group, setGroup] = useState("all");
  const [discipline, setDiscipline] = useState("all");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DiveLog | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dives", group, discipline, search],
    queryFn: () =>
      apiGet<DiveLog[]>(
        `/dives?group=${group}&discipline=${discipline}&search=${encodeURIComponent(search)}`,
      ),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/dives/${id}`),
    onSuccess: async () => {
      setPendingDelete(null);
      toast.success("Dive deleted. Personal bests recalculated.");
      await qc.invalidateQueries();
    },
    onError: () => toast.error("Could not delete this dive."),
  });

  return (
    <AppShell title="Dive Log">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="heading text-2xl font-semibold" data-testid="dive-log-title">
              Dive history
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data ? `${data.length} ${data.length === 1 ? "dive" : "dives"}` : "Loading…"}
            </p>
          </div>
          <Link
            to="/app/dives/new"
            className={buttonVariants({ size: "sm" })}
            data-testid="dive-log-add-button"
          >
            + Add Dive
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search location, buddy or notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="dive-log-search-input"
            />
          </div>
          <Select value={group} onValueChange={(value: string) => setGroup(value)}>
            <SelectTrigger className="min-w-32" data-testid="dive-log-group-filter">
              <SelectValue>{(v) => GROUPS.find((g) => g.value === v)?.label ?? "All"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GROUPS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={discipline} onValueChange={(value: string) => setDiscipline(value)}>
            <SelectTrigger className="min-w-36" data-testid="dive-log-discipline-filter">
              <SelectValue>{(v) => (v === "all" ? "All disciplines" : String(v))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All disciplines</SelectItem>
              {ALL_DISCIPLINES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <LoadingVeil label="Loading dives" /> : null}
        {isError ? <ErrorState testid="dive-log-error" /> : null}

        {data && data.length === 0 ? (
          <EmptyState
            testid="dive-log-empty"
            title="No dives recorded yet."
            description="Start your journey by adding your first dive."
            action={
              <Link
                to="/app/dives/new"
                className={buttonVariants({ size: "sm" })}
                data-testid="dive-log-empty-add-button"
              >
                + Add Dive
              </Link>
            }
          />
        ) : null}

        <ul className="space-y-2" data-testid="dive-log-list">
          {(data ?? []).map((dive) => (
            <li
              key={dive.id}
              className="rounded-xl border border-white/6 bg-card px-4 py-3"
              data-testid={`dive-row-${dive.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs tracking-[0.16em] text-primary uppercase">
                      {dive.discipline}
                    </span>
                    {dive.is_pb ? (
                      <span
                        className="flex items-center gap-1 text-[10px] tracking-wider text-[#f0b45f] uppercase"
                        data-testid={`dive-pb-badge-${dive.id}`}
                      >
                        <Trophy className="size-3" /> PB
                      </span>
                    ) : null}
                  </div>
                  <p className="stat-num mt-1 text-2xl">
                    {formatValue(dive.discipline, dive.value)}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {formatDate(dive.date)}
                    {dive.location ? ` · ${dive.location}` : ""}
                    {dive.buddy ? ` · buddy ${dive.buddy}` : ""}
                  </p>
                  {dive.notes ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/80">
                      {dive.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {dive.feeling ? (
                    <span className="mr-1 text-lg">
                      {FEELINGS.find((f) => f.score === dive.feeling)?.emoji}
                    </span>
                  ) : null}
                  <Link
                    to={`/app/dives/${dive.id}/edit`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                    data-testid={`dive-edit-${dive.id}`}
                    aria-label="Edit dive"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPendingDelete(dive)}
                    data-testid={`dive-delete-${dive.id}`}
                    aria-label="Delete dive"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent data-testid="dive-delete-dialog">
          <DialogHeader>
            <DialogTitle>Delete this dive?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `${pendingDelete.discipline} · ${formatValue(pendingDelete.discipline, pendingDelete.value)} · ${formatDate(pendingDelete.date)}. Personal bests will be recalculated.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" data-testid="dive-delete-cancel" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
              disabled={remove.isPending}
              data-testid="dive-delete-confirm"
            >
              Delete dive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
