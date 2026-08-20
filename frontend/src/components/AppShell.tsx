import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  BookOpen,
  Home,
  ListOrdered,
  LogOut,
  Plus,
  Target,
  Timer,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { BRAND_NAME, Brand, BrandMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { endSession, useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Dashboard", icon: Home, testid: "nav-dashboard" },
  { to: "/app/dives", label: "Dive Log", icon: ListOrdered, testid: "nav-dive-log" },
  { to: "/app/training", label: "Training", icon: Timer, testid: "nav-training" },
  { to: "/app/personal-bests", label: "Personal Best", icon: Trophy, testid: "nav-personal-bests" },
  { to: "/app/progress", label: "Progress", icon: BarChart3, testid: "nav-progress" },
  { to: "/app/goals", label: "Goals", icon: Target, testid: "nav-goals" },
  { to: "/app/learning", label: "Learning", icon: BookOpen, testid: "nav-learning" },
  { to: "/app/certifications", label: "Certifications", icon: Award, testid: "nav-certifications" },
  { to: "/app/profile", label: "Profile", icon: UserIcon, testid: "nav-profile" },
];

const MOBILE_NAV = [
  { to: "/app", label: "Home", icon: Home, testid: "mobile-nav-home" },
  { to: "/app/dives", label: "Logs", icon: ListOrdered, testid: "mobile-nav-logs" },
  { to: "/app/personal-bests", label: "PB", icon: Trophy, testid: "mobile-nav-pb" },
  { to: "/app/profile", label: "Profile", icon: UserIcon, testid: "mobile-nav-profile" },
];

export default function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const logout = useMutation({
    mutationFn: () => endSession(qc),
    onSuccess: () => navigate("/", { replace: true }),
  });

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed top-0 left-0 z-30 hidden h-dvh w-64 flex-col border-r border-white/5 bg-sidebar px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 flex items-center px-1" data-testid="sidebar-logo">
          <Brand logoClassName="size-9" wordClassName="text-[13px] tracking-[0.14em]" />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              data-testid={item.testid}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200",
                  isActive
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-white/5 pt-4">
          {me ? (
            <div className="px-2">
              <p className="truncate text-sm font-medium">{me.name}</p>
              <p className="truncate text-xs text-muted-foreground">{me.email}</p>
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={() => logout.mutate()}
            data-testid="sidebar-logout-button"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-background/85 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark className="size-7" />
            <span className="heading text-xs font-semibold tracking-[0.14em] uppercase">
              {BRAND_NAME}
            </span>
          </div>
          <h1 className="heading hidden text-lg font-semibold lg:block" data-testid="page-title">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/app/dives/new"
              className="hidden lg:inline-flex"
              data-testid="header-add-dive-link"
            >
              <Button size="sm">
                <Plus className="size-4" /> Add Dive
              </Button>
            </Link>
            <Link
              to="/app/profile"
              className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-secondary text-xs font-semibold"
              data-testid="header-profile-link"
            >
              {(me?.name ?? "?").slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>

        <main className="px-4 pt-4 pb-28 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <nav
        className="fixed bottom-0 left-0 z-30 flex w-full items-end justify-around border-t border-white/5 bg-background/95 px-2 pt-2 pb-3 backdrop-blur-lg lg:hidden"
        data-testid="mobile-bottom-nav"
      >
        {MOBILE_NAV.slice(0, 2).map((item) => (
          <MobileLink key={item.to} {...item} />
        ))}
        <Link
          to="/app/dives/new"
          data-testid="mobile-nav-add-dive"
          className="-mt-7 flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_var(--color-aqua)] transition-transform duration-200 active:scale-95"
          aria-label="Add dive"
        >
          <Plus className="size-7" />
        </Link>
        {MOBILE_NAV.slice(2).map((item) => (
          <MobileLink key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

function MobileLink({
  to,
  label,
  icon: Icon,
  testid,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  testid: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/app"}
      data-testid={testid}
      className={({ isActive }) =>
        cn(
          "flex min-w-16 flex-col items-center gap-1 py-1 text-[11px] transition-colors duration-200",
          isActive ? "text-primary" : "text-muted-foreground",
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  );
}
