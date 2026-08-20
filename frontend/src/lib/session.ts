import { useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { OkResult, User } from "@/lib/types";

export const ME_KEY = ["auth", "me"] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => apiGet<User | null>("/auth/me"),
    retry: false,
    staleTime: 15_000,
  });
}

/** Called after a successful login/signup — drops every cached query of the previous visitor. */
export async function beginSession(qc: QueryClient) {
  qc.clear();
  await qc.invalidateQueries({ queryKey: ME_KEY });
}

/** The only sign-out path: clears the server session AND the react-query cache. */
export async function endSession(qc: QueryClient) {
  try {
    await apiPost<OkResult>("/auth/logout");
  } finally {
    qc.clear();
  }
}

export function homeForRole(role: User["role"]): string {
  if (role === "admin" || role === "super_admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/app";
}
