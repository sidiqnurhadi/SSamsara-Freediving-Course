/** Binary/multipart helpers. JSON goes through lib/api.ts; these need Blob + FormData. */

const BASE = "/api";

/** Fetches an authenticated file and returns an object URL for preview/download. */
export async function fetchFileUrl(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`file request failed with ${res.status}`);
  }
  return URL.createObjectURL(await res.blob());
}

export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(
      typeof errBody?.detail === "string" ? errBody.detail : `upload failed with ${res.status}`,
    );
  }
  return (await res.json()) as T;
}

export function formatBytes(size: number | null): string {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
