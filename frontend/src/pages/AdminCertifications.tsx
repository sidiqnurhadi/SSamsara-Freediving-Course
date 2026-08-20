import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Link2, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CertificatePdf, StatusBadge, VerificationLink } from "@/components/CertificateBits";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatDate, todayIso } from "@/lib/fd";
import { uploadFile } from "@/lib/files";
import type { CertStatus, Certification, User } from "@/lib/types";

export const AIDA_LEVELS = ["AIDA 1", "AIDA 2", "AIDA 3", "AIDA 4"];
const AGENCIES = ["AIDA", "Molchanovs", "SSI"];
const STATUSES: CertStatus[] = ["pending", "verified", "expired", "rejected"];

interface CertDraft {
  id: string | null;
  user_id: string;
  agency: string;
  certification: string;
  status: CertStatus;
  certification_date: string;
  instructor: string;
  certificate_number: string;
  verification_url: string;
}

const BLANK: CertDraft = {
  id: null,
  user_id: "",
  agency: "AIDA",
  certification: "AIDA 2",
  status: "verified",
  certification_date: todayIso(),
  instructor: "",
  certificate_number: "",
  verification_url: "",
};

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      const first = body.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg.replace("Value error, ", "");
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default function CertificationsPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<CertDraft | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [agency, setAgency] = useState("all");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");

  const certs = useQuery({
    queryKey: ["admin-certifications"],
    queryFn: () => apiGet<Certification[]>("/admin/certifications"),
    retry: false,
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<User[]>("/admin/users"),
    retry: false,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-certifications"] });
    await qc.invalidateQueries({ queryKey: ["certifications"] });
    await qc.invalidateQueries({ queryKey: ["certification-level"] });
    await qc.invalidateQueries({ queryKey: ["learning-resources"] });
    await qc.invalidateQueries({ queryKey: ["learning-summary"] });
  };

  const save = useMutation({
    mutationFn: async (body: CertDraft) => {
      const payload = {
        user_id: body.user_id,
        agency: body.agency,
        certification: body.certification,
        status: body.status,
        certification_date: body.certification_date || null,
        instructor: body.instructor || null,
        certificate_number: body.certificate_number || null,
        verification_url: body.verification_url || null,
      };
      const saved = body.id
        ? await apiPatch<Certification>(`/admin/certifications/${body.id}`, payload)
        : await apiPost<Certification>("/admin/certifications", payload);
      if (pendingFile) {
        return uploadFile<Certification>(
          `/admin/certifications/${saved.id}/file`,
          pendingFile,
        );
      }
      return saved;
    },
    onSuccess: async () => {
      setDraft(null);
      setPendingFile(null);
      toast.success("Certification saved. Learning access updated immediately.");
      await invalidate();
    },
    onError: (err) => toast.error(errorText(err, "Could not save this certification.")),
  });

  const upload = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadFile<Certification>(`/admin/certifications/${id}/file`, file),
    onSuccess: async () => {
      toast.success("Certificate PDF uploaded.");
      await invalidate();
    },
    onError: (err) => toast.error(errorText(err, "Could not upload the PDF.")),
  });

  const removeFile = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/certifications/${id}/file`),
    onSuccess: async () => {
      toast.success("Certificate PDF removed.");
      await invalidate();
    },
    onError: () => toast.error("Could not remove the PDF."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/certifications/${id}`),
    onSuccess: async () => {
      toast.success("Certification removed.");
      await invalidate();
    },
    onError: () => toast.error("Could not remove this certification."),
  });

  if (certs.isLoading) return <LoadingVeil label="Loading certifications" />;
  if (certs.isError) return <ErrorState testid="admin-certifications-error" />;

  const term = search.trim().toLowerCase();
  const rows = (certs.data ?? []).filter((cert) => {
    if (agency !== "all" && cert.agency !== agency) return false;
    if (level !== "all" && cert.certification !== level) return false;
    if (status !== "all" && cert.status !== status) return false;
    if (fromDate && (cert.certification_date ?? "") < fromDate) return false;
    if (!term) return true;
    return [cert.user_name, cert.agency, cert.certification, cert.certificate_number, cert.instructor]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-2">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Student, agency, level, certificate number or instructor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              data-testid="admin-cert-search"
            />
          </div>
        </div>
        <FilterSelect
          label="Agency"
          value={agency}
          options={AGENCIES}
          onChange={setAgency}
          testid="admin-cert-filter-agency"
        />
        <FilterSelect
          label="Level"
          value={level}
          options={AIDA_LEVELS}
          onChange={setLevel}
          testid="admin-cert-filter-level"
        />
        <FilterSelect
          label="Status"
          value={status}
          options={STATUSES}
          onChange={setStatus}
          testid="admin-cert-filter-status"
        />
        <div className="space-y-2">
          <Label className="text-xs">Certified from</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            data-testid="admin-cert-filter-date"
          />
        </div>
        <Button onClick={() => setDraft(BLANK)} data-testid="admin-cert-new-button">
          <Plus className="size-4" /> Add certification
        </Button>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="admin-cert-count">
        {rows.length} of {(certs.data ?? []).length} certification records
      </p>

      {rows.length === 0 ? (
        <EmptyState
          testid="admin-cert-empty"
          title="No certification records match these filters."
        />
      ) : null}

      <div className="space-y-2" data-testid="admin-certifications-list">
        {rows.map((cert) => (
          <article
            key={cert.id}
            className="rounded-xl border border-white/6 bg-card px-4 py-4"
            data-testid={`admin-cert-row-${cert.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{cert.user_name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {cert.agency} · {cert.certification} · rank {cert.rank} ·{" "}
                  {cert.certification_date ? formatDate(cert.certification_date) : "no date"}
                  {cert.certificate_number ? ` · ${cert.certificate_number}` : ""}
                  {cert.instructor ? ` · ${cert.instructor}` : ""}
                </p>
                {cert.verified_by ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Verified by {cert.verified_by}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={cert.status} testid={`admin-cert-status-badge-${cert.id}`} />
                <span
                  className="flex items-center gap-1 text-[11px] text-muted-foreground"
                  data-testid={`admin-cert-flags-${cert.id}`}
                >
                  <Link2
                    className={cert.verification_url ? "size-3.5 text-primary" : "size-3.5 opacity-30"}
                  />
                  Link {cert.verification_url ? "✓" : "—"}
                  <FileText
                    className={cert.has_file ? "ml-2 size-3.5 text-primary" : "ml-2 size-3.5 opacity-30"}
                  />
                  PDF {cert.has_file ? "✓" : "—"}
                </span>
                <Select
                  value={cert.status}
                  onValueChange={(value: string) =>
                    apiPatch<Certification>(`/admin/certifications/${cert.id}`, { status: value })
                      .then(async () => {
                        toast.success("Status updated. Learning access recalculated.");
                        await invalidate();
                      })
                      .catch(() => toast.error("Could not update the status."))
                  }
                >
                  <SelectTrigger className="min-w-32" data-testid={`admin-cert-status-${cert.id}`}>
                    <SelectValue>{(v) => String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setDraft({
                      id: cert.id,
                      user_id: cert.user_id,
                      agency: cert.agency,
                      certification: cert.certification,
                      status: cert.status,
                      certification_date: cert.certification_date ?? "",
                      instructor: cert.instructor ?? "",
                      certificate_number: cert.certificate_number ?? "",
                      verification_url: cert.verification_url ?? "",
                    })
                  }
                  data-testid={`admin-cert-edit-${cert.id}`}
                  aria-label="Edit certification"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove.mutate(cert.id)}
                  data-testid={`admin-cert-delete-${cert.id}`}
                  aria-label="Delete certification"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/6 pt-3">
              <VerificationLink cert={cert} testid={`admin-cert-verify-${cert.id}`} />
              <CertificatePdf cert={cert} testid={`admin-cert-pdf-${cert.id}`} />
              <label
                className="cursor-pointer text-xs text-primary"
                data-testid={`admin-cert-upload-label-${cert.id}`}
              >
                <span className="inline-flex items-center gap-1">
                  <Upload className="size-3.5" /> {cert.has_file ? "Replace PDF" : "Upload PDF"}
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload.mutate({ id: cert.id, file });
                    event.target.value = "";
                  }}
                  data-testid={`admin-cert-upload-${cert.id}`}
                />
              </label>
              {cert.has_file ? (
                <button
                  type="button"
                  className="text-xs text-destructive"
                  onClick={() => removeFile.mutate(cert.id)}
                  data-testid={`admin-cert-remove-file-${cert.id}`}
                >
                  Remove PDF
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="admin-cert-dialog">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit certification" : "Add certification"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Student *</Label>
                <Select
                  value={draft.user_id}
                  onValueChange={(value: string) => setDraft({ ...draft, user_id: value })}
                >
                  <SelectTrigger data-testid="admin-cert-user-select">
                    <SelectValue>
                      {(v) =>
                        (users.data ?? []).find((u) => u.id === v)?.name ?? "Select a student"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(users.data ?? []).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} · {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Certification agency</Label>
                <Select
                  value={draft.agency}
                  onValueChange={(value: string) => setDraft({ ...draft, agency: value })}
                >
                  <SelectTrigger data-testid="admin-cert-dialog-agency">
                    <SelectValue>{(v) => String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AGENCIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Certification level</Label>
                <Select
                  value={draft.certification}
                  onValueChange={(value: string) => setDraft({ ...draft, certification: value })}
                >
                  <SelectTrigger data-testid="admin-cert-dialog-level">
                    <SelectValue>{(v) => String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AIDA_LEVELS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Certification status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value: string) =>
                    setDraft({ ...draft, status: value as CertStatus })
                  }
                >
                  <SelectTrigger data-testid="admin-cert-dialog-status">
                    <SelectValue>{(v) => String(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Certification date</Label>
                <Input
                  type="date"
                  value={draft.certification_date}
                  onChange={(e) => setDraft({ ...draft, certification_date: e.target.value })}
                  data-testid="admin-cert-dialog-date"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Instructor</Label>
                <Input
                  value={draft.instructor}
                  onChange={(e) => setDraft({ ...draft, instructor: e.target.value })}
                  data-testid="admin-cert-dialog-instructor"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Certificate number</Label>
                <Input
                  value={draft.certificate_number}
                  onChange={(e) => setDraft({ ...draft, certificate_number: e.target.value })}
                  data-testid="admin-cert-dialog-number"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Certification Verification URL</Label>
                <Input
                  placeholder="https://www.aidainternational.org/..."
                  value={draft.verification_url}
                  onChange={(e) => setDraft({ ...draft, verification_url: e.target.value })}
                  data-testid="admin-cert-dialog-verification-url"
                />
                <p className="text-[11px] text-muted-foreground">
                  Official certification or verification link from the certification agency. Must
                  be a valid https:// URL.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Upload Certificate PDF</Label>
                <Input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setPendingFile(event.target.files?.[0] ?? null)}
                  data-testid="admin-cert-dialog-file"
                />
                <p className="text-[11px] text-muted-foreground">
                  PDF only, up to 10 MB. Certificates are stored privately and served only to
                  authorized users.
                  {pendingFile ? ` Selected: ${pendingFile.name}` : ""}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDraft(null);
                setPendingFile(null);
              }}
              data-testid="admin-cert-dialog-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!draft) return;
                if (!draft.user_id) {
                  toast.error("Select a student first.");
                  return;
                }
                if (draft.verification_url && !draft.verification_url.startsWith("https://")) {
                  toast.error("The verification link must be a valid https:// URL.");
                  return;
                }
                save.mutate(draft);
              }}
              disabled={save.isPending}
              data-testid="admin-cert-dialog-save"
            >
              Save certification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  testid,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  testid: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-w-32" data-testid={testid}>
          <SelectValue>{(v) => (v === "all" ? `All ${label.toLowerCase()}` : String(v))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
          {options.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
