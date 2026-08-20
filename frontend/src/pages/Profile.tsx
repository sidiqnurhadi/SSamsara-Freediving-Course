import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPut } from "@/lib/api";
import { formatUnitValue } from "@/lib/fd";
import { endSession } from "@/lib/session";
import type { DiverProfile, PersonalBest } from "@/lib/types";

export default function Profile() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    freediving_since: "",
    certification_summary: "",
    preferred_discipline: "",
    nationality: "",
    home_training_location: "",
    school: "",
    instructor_name: "",
    bio: "",
  });

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<DiverProfile>("/profile"),
    retry: false,
  });

  const { data: pbs } = useQuery({
    queryKey: ["personal-bests"],
    queryFn: () => apiGet<PersonalBest[]>("/personal-bests"),
    retry: false,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      freediving_since: profile.freediving_since ? String(profile.freediving_since) : "",
      certification_summary: profile.certification_summary ?? "",
      preferred_discipline: profile.preferred_discipline ?? "",
      nationality: profile.nationality ?? "",
      home_training_location: profile.home_training_location ?? "",
      school: profile.school ?? "",
      instructor_name: profile.instructor_name ?? "",
      bio: profile.bio ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPut<DiverProfile>("/profile", body),
    onSuccess: async () => {
      toast.success("Profile updated.");
      await qc.invalidateQueries();
    },
    onError: () => toast.error("Could not save your profile."),
  });

  const logout = useMutation({
    mutationFn: () => endSession(qc),
    onSuccess: () => navigate("/", { replace: true }),
  });

  const depthPb = (pbs ?? [])
    .filter((pb) => pb.group === "depth")
    .sort((a, b) => b.value - a.value)[0];
  const dynPb = (pbs ?? [])
    .filter((pb) => pb.group === "dynamic")
    .sort((a, b) => b.value - a.value)[0];
  const staPb = (pbs ?? []).find((pb) => pb.discipline === "STA");

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-2xl space-y-6">
        {isLoading ? <LoadingVeil label="Loading profile" /> : null}
        {isError ? <ErrorState testid="profile-error" /> : null}

        <section className="glass rounded-2xl px-5 py-6">
          <p className="text-xs tracking-[0.24em] text-primary uppercase">Diver</p>
          <h2 className="heading mt-2 text-2xl font-semibold" data-testid="profile-name">
            {profile?.name || "Diver"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{profile?.email}</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Tile
              label="PB Depth"
              value={depthPb ? formatUnitValue(depthPb.unit, depthPb.value) : "—"}
              testid="profile-pb-depth"
            />
            <Tile
              label="PB Dynamic"
              value={dynPb ? formatUnitValue(dynPb.unit, dynPb.value) : "—"}
              testid="profile-pb-dynamic"
            />
            <Tile
              label="PB Static"
              value={staPb ? formatUnitValue("s", staPb.value) : "—"}
              testid="profile-pb-static"
            />
          </div>
        </section>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (form.name.trim().length < 2) return toast.error("Please enter your name.");
            const since = form.freediving_since ? Number(form.freediving_since) : null;
            if (since !== null && (Number.isNaN(since) || since < 1900 || since > 2100)) {
              return toast.error("Enter a valid year for 'freediving since'.");
            }
            save.mutate({
              name: form.name.trim(),
              freediving_since: since,
              certification_summary: form.certification_summary || null,
              preferred_discipline: form.preferred_discipline || null,
              nationality: form.nationality || null,
              home_training_location: form.home_training_location || null,
              school: form.school || null,
              instructor_name: form.instructor_name || null,
              bio: form.bio || null,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="profile-name-input" label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="profile-name-input" />
            <Field id="profile-since" label="Freediving since" value={form.freediving_since} onChange={(v) => setForm({ ...form, freediving_since: v })} testid="profile-since-input" />
            <Field id="profile-cert" label="Certification" value={form.certification_summary} onChange={(v) => setForm({ ...form, certification_summary: v })} testid="profile-certification-input" />
            <Field id="profile-discipline" label="Preferred discipline" value={form.preferred_discipline} onChange={(v) => setForm({ ...form, preferred_discipline: v })} testid="profile-discipline-input" />
            <Field id="profile-nationality" label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} testid="profile-nationality-input" />
            <Field id="profile-location" label="Home training location" value={form.home_training_location} onChange={(v) => setForm({ ...form, home_training_location: v })} testid="profile-location-input" />
            <Field id="profile-school" label="School" value={form.school} onChange={(v) => setForm({ ...form, school: v })} testid="profile-school-input" />
            <Field id="profile-instructor" label="Instructor" value={form.instructor_name} onChange={(v) => setForm({ ...form, instructor_name: v })} testid="profile-instructor-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bio">Short bio</Label>
            <Textarea
              id="profile-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              data-testid="profile-bio-input"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={save.isPending}
            data-testid="profile-save-button"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Your dive logs, training history and certifications are private. Only you, your assigned
          instructor and the school admin can see them.
        </p>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => logout.mutate()}
          data-testid="profile-logout-button"
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </AppShell>
  );
}

function Tile({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-3 py-3" data-testid={testid}>
      <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="stat-num mt-1 text-lg">{value}</p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  testid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  testid: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} />
    </div>
  );
}
