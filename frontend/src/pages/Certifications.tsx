import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/fd";
import type { Certification } from "@/lib/types";

const BLANK = {
  agency: "AIDA",
  certification: "",
  instructor: "",
  certification_date: "",
  expiration_date: "",
  certificate_number: "",
};

export default function Certifications() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["certifications"],
    queryFn: () => apiGet<Certification[]>("/certifications"),
    retry: false,
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<Certification>("/certifications", body),
    onSuccess: async () => {
      setOpen(false);
      setForm(BLANK);
      toast.success("Certification added.");
      await qc.invalidateQueries({ queryKey: ["certifications"] });
    },
    onError: () => toast.error("Could not add this certification."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/certifications/${id}`),
    onSuccess: async () => {
      toast.success("Certification removed.");
      await qc.invalidateQueries({ queryKey: ["certifications"] });
    },
    onError: () => toast.error("Could not remove this certification."),
  });

  return (
    <AppShell title="Certifications">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="heading text-2xl font-semibold" data-testid="certifications-title">
              Certifications
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your freediving qualifications, private to your account.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" data-testid="certifications-add-button" />}>
              <Plus className="size-4" /> Add
            </DialogTrigger>
            <DialogContent data-testid="certification-dialog">
              <DialogHeader>
                <DialogTitle>Add certification</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="cert-agency"
                  label="Agency *"
                  value={form.agency}
                  onChange={(v) => setForm({ ...form, agency: v })}
                  testid="certification-agency-input"
                />
                <Field
                  id="cert-level"
                  label="Certification *"
                  value={form.certification}
                  onChange={(v) => setForm({ ...form, certification: v })}
                  testid="certification-level-input"
                />
                <Field
                  id="cert-instructor"
                  label="Instructor"
                  value={form.instructor}
                  onChange={(v) => setForm({ ...form, instructor: v })}
                  testid="certification-instructor-input"
                />
                <Field
                  id="cert-number"
                  label="Certificate number"
                  value={form.certificate_number}
                  onChange={(v) => setForm({ ...form, certificate_number: v })}
                  testid="certification-number-input"
                />
                <Field
                  id="cert-date"
                  label="Certification date"
                  type="date"
                  value={form.certification_date}
                  onChange={(v) => setForm({ ...form, certification_date: v })}
                  testid="certification-date-input"
                />
                <Field
                  id="cert-expiry"
                  label="Expiration date"
                  type="date"
                  value={form.expiration_date}
                  onChange={(v) => setForm({ ...form, expiration_date: v })}
                  testid="certification-expiry-input"
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" data-testid="certification-cancel-button" />}>
                  Cancel
                </DialogClose>
                <Button
                  onClick={() => {
                    if (!form.agency.trim() || !form.certification.trim()) {
                      toast.error("Agency and certification are required.");
                      return;
                    }
                    create.mutate({
                      agency: form.agency.trim(),
                      certification: form.certification.trim(),
                      instructor: form.instructor || null,
                      certification_date: form.certification_date || null,
                      expiration_date: form.expiration_date || null,
                      certificate_number: form.certificate_number || null,
                      certificate_file_url: null,
                    });
                  }}
                  disabled={create.isPending}
                  data-testid="certification-save-button"
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <LoadingVeil label="Loading certifications" /> : null}
        {isError ? <ErrorState testid="certifications-error" /> : null}
        {data && data.length === 0 ? (
          <EmptyState
            testid="certifications-empty"
            title="No certifications recorded."
            description="Add your AIDA or other agency certifications to keep them in one place."
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2" data-testid="certifications-list">
          {(data ?? []).map((cert) => (
            <div
              key={cert.id}
              className="glass rounded-2xl px-5 py-5"
              data-testid={`certification-card-${cert.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs tracking-[0.2em] text-primary uppercase">{cert.agency}</p>
                  <p className="heading mt-2 text-xl font-semibold">{cert.certification}</p>
                </div>
                <div className="flex items-start gap-1">
                  <Award className="mt-1 size-4 text-[#f0b45f]" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove.mutate(cert.id)}
                    data-testid={`certification-delete-${cert.id}`}
                    aria-label="Delete certification"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <dl className="mt-4 space-y-1.5 text-xs">
                <Row label="Certified" value={cert.certification_date ? formatDate(cert.certification_date) : "—"} />
                <Row label="Instructor" value={cert.instructor ?? "—"} />
                <Row label="Number" value={cert.certificate_number ?? "—"} />
                {cert.expiration_date ? (
                  <Row label="Expires" value={formatDate(cert.expiration_date)} />
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  testid,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  testid: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
      />
    </div>
  );
}
