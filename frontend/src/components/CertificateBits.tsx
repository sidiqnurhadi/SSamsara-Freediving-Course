import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchFileUrl, formatBytes } from "@/lib/files";
import { cn } from "@/lib/utils";
import type { Certification } from "@/lib/types";

/** Badge colours per certification status. */
export function statusClasses(status: Certification["status"]): string {
  if (status === "verified") return "bg-primary/15 text-primary border-primary/30";
  if (status === "rejected") return "bg-destructive/15 text-destructive border-destructive/30";
  if (status === "expired") return "bg-muted text-muted-foreground border-white/10";
  return "bg-[#f0b45f]/15 text-[#f0b45f] border-[#f0b45f]/30";
}

export function StatusBadge({ status, testid }: { status: Certification["status"]; testid?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] tracking-wider uppercase",
        statusClasses(status),
      )}
      data-testid={testid}
    >
      {status === "verified" ? "✓ " : ""}
      {status}
    </span>
  );
}

/** External verification link — new tab, noopener, https validated on the backend. */
export function VerificationLink({
  cert,
  testid,
}: {
  cert: Certification;
  testid: string;
}) {
  if (!cert.verification_url) {
    return <span className="text-xs text-muted-foreground">No verification link</span>;
  }
  return (
    <a
      href={cert.verification_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={buttonVariants({ size: "sm", variant: "outline" })}
      data-testid={testid}
    >
      View Official Certification
      <ExternalLink className="size-3.5" />
    </a>
  );
}

/** Authenticated PDF preview + download. Files are streamed through /api, never a public URL. */
export function CertificatePdf({
  cert,
  testid,
}: {
  cert: Certification;
  testid: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let revoke: string | null = null;
    fetchFileUrl(`/certifications/${cert.id}/file`)
      .then((objectUrl) => {
        revoke = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => toast.error("This certificate could not be loaded."));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
      setUrl(null);
    };
  }, [open, cert.id]);

  async function download() {
    try {
      const objectUrl = await fetchFileUrl(`/certifications/${cert.id}/file`);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = cert.certificate_file_name ?? "certificate.pdf";
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("This certificate could not be downloaded.");
    }
  }

  if (!cert.has_file) {
    return <span className="text-xs text-muted-foreground">No certificate PDF</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileText className="size-3.5 text-primary" />
        <span className="max-w-44 truncate" data-testid={`${testid}-name`}>
          {cert.certificate_file_name}
        </span>
        <span>({formatBytes(cert.certificate_file_size)})</span>
      </span>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} data-testid={`${testid}-view`}>
        View PDF
      </Button>
      <Button size="sm" variant="ghost" onClick={download} data-testid={`${testid}-download`}>
        <Download className="size-4" /> Download
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl" data-testid={`${testid}-dialog`}>
          <DialogHeader>
            <DialogTitle>
              {cert.agency} {cert.certification} certificate
            </DialogTitle>
          </DialogHeader>
          {url ? (
            <iframe
              src={url}
              title="Certificate preview"
              className="h-[60vh] w-full rounded-xl border border-white/10 bg-white"
              data-testid={`${testid}-frame`}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading certificate…</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid={`${testid}-close`}>
              Close
            </Button>
            {url ? (
              <Button
                variant="outline"
                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                data-testid={`${testid}-fullscreen`}
              >
                <Maximize2 className="size-4" /> Open full screen
              </Button>
            ) : null}
            <Button onClick={download} data-testid={`${testid}-dialog-download`}>
              <Download className="size-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
