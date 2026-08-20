import { Waves } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useMe } from "@/lib/session";
import type { Role } from "@/lib/types";

export function LoadingVeil({ label = "Surfacing…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      data-testid="loading-veil"
    >
      <Waves className="size-7 animate-pulse text-primary" />
      <p className="text-sm tracking-wide uppercase">{label}</p>
    </div>
  );
}

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { data: me, isLoading, isError } = useMe();
  const location = useLocation();

  if (isLoading) return <LoadingVeil />;
  if (isError || !me) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(me.role)) {
    return (
      <div className="p-8 text-center" data-testid="forbidden-message">
        <h1 className="heading text-2xl font-semibold">Not available for your role</h1>
        <p className="mt-2 text-muted-foreground">
          This area is restricted. Signed in as {me.role}.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
