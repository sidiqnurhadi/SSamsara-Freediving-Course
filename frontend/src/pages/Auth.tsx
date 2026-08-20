import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Waves } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api";
import { beginSession, homeForRole } from "@/lib/session";
import type { ForgotPasswordResult, User } from "@/lib/types";

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) return "Please check the highlighted fields.";
  }
  return fallback;
}

export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1503177847378-d2048487fa46?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600)",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,24,32,0.8),rgba(2,18,26,0.97))]" aria-hidden />
      <div className="glass relative w-full max-w-md rounded-3xl px-7 py-9">
        <Link to="/" className="flex items-center gap-2" data-testid="auth-logo-link">
          <Waves className="size-5 text-primary" />
          <span className="heading text-xs font-semibold tracking-[0.24em] uppercase">
            Depth School
          </span>
        </Link>
        <h1 className="heading mt-6 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-7 space-y-4">{children}</div>
        <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const login = useMutation({
    mutationFn: () => apiPost<User>("/auth/login", { email, password }),
    onSuccess: async (user) => {
      await beginSession(qc);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}.`);
      navigate(homeForRole(user.role), { replace: true });
    },
    onError: (err) => toast.error(errorText(err, "Could not sign in.")),
  });

  return (
    <AuthFrame
      title="Diver login"
      subtitle="Your dive log, tables and personal bests."
      footer={
        <>
          <p>
            No account yet?{" "}
            <Link to="/register" className="text-primary" data-testid="login-register-link">
              Create one
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/forgot-password" className="text-primary" data-testid="login-forgot-link">
              Forgot password?
            </Link>
          </p>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email || !password) {
            toast.error("Email and password are required.");
            return;
          }
          login.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password-input"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={login.isPending}
          data-testid="login-submit-button"
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="rounded-xl border border-white/8 px-4 py-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Demo accounts</p>
        <p className="mt-1">alex@freedive.school · diver123</p>
        <p>instructor@freedive.school · instructor123</p>
        <p>admin@freedive.school · admin123</p>
      </div>
    </AuthFrame>
  );
}

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const register = useMutation({
    mutationFn: () => apiPost<User>("/auth/register", { name, email, password }),
    onSuccess: async (user) => {
      await beginSession(qc);
      toast.success("Account created. Welcome aboard.");
      navigate(homeForRole(user.role), { replace: true });
    },
    onError: (err) => toast.error(errorText(err, "Could not create the account.")),
  });

  return (
    <AuthFrame
      title="Create diver account"
      subtitle="Start logging dives, tables and personal bests."
      footer={
        <p>
          Already registered?{" "}
          <Link to="/login" className="text-primary" data-testid="register-login-link">
            Sign in
          </Link>
        </p>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length < 2) return toast.error("Please enter your full name.");
          if (!email.includes("@")) return toast.error("Please enter a valid email address.");
          if (password.length < 6) return toast.error("Password must be at least 6 characters.");
          register.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="register-name">Full name</Label>
          <Input
            id="register-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="register-name-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="register-email-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="register-password-input"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={register.isPending}
          data-testid="register-submit-button"
        >
          {register.isPending ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const request = useMutation({
    mutationFn: () => apiPost<ForgotPasswordResult>("/auth/forgot-password", { email }),
    onSuccess: (res) => {
      if (res.reset_token) setToken(res.reset_token);
      toast.success(res.message);
    },
    onError: (err) => toast.error(errorText(err, "Could not start the reset.")),
  });

  const reset = useMutation({
    mutationFn: () => apiPost("/auth/reset-password", { token, password }),
    onSuccess: () => {
      toast.success("Password updated. You can sign in now.");
      navigate("/login", { replace: true });
    },
    onError: (err) => toast.error(errorText(err, "Could not reset the password.")),
  });

  return (
    <AuthFrame
      title="Reset password"
      subtitle="Request a reset token, then set a new password."
      footer={
        <Link to="/login" className="text-primary" data-testid="forgot-back-link">
          Back to sign in
        </Link>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.includes("@")) return toast.error("Please enter a valid email address.");
          request.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="forgot-email-input"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={request.isPending}
          data-testid="forgot-request-button"
        >
          Request reset token
        </Button>
      </form>

      <form
        className="space-y-4 border-t border-white/8 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!token) return toast.error("Request a reset token first.");
          if (password.length < 6) return toast.error("Password must be at least 6 characters.");
          reset.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="forgot-token">Reset token</Label>
          <Input
            id="forgot-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            data-testid="forgot-token-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="forgot-password">New password</Label>
          <Input
            id="forgot-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="forgot-password-input"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={reset.isPending}
          data-testid="forgot-reset-button"
        >
          Set new password
        </Button>
      </form>
    </AuthFrame>
  );
}
