import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { BRAND_NAME, Brand, BrandMark } from "@/components/Brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMe } from "@/lib/session";
import { homeForRole } from "@/lib/session";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Home", testid: "public-nav-home" },
  { to: "/courses", label: "Courses", testid: "public-nav-courses" },
  { to: "/about", label: "About", testid: "public-nav-about" },
  { to: "/instructors", label: "Instructors", testid: "public-nav-instructors" },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { data: me } = useMe();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" data-testid="public-logo">
            <Brand logoClassName="size-9" />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                data-testid={link.testid}
                className={({ isActive }) =>
                  cn(
                    "text-sm transition-colors duration-200 hover:text-primary",
                    isActive ? "text-primary" : "text-foreground/70",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to={me ? homeForRole(me.role) : "/login"}
              className={cn(buttonVariants({ size: "sm" }), "hidden md:inline-flex")}
              data-testid="public-diver-login-link"
            >
              {me ? "My Dashboard" : "Diver Login"}
            </Link>
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="md:hidden"
                    data-testid="public-menu-button"
                    aria-label="Open menu"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="heading">{BRAND_NAME}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 px-4">
                  {LINKS.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-secondary"
                      data-testid={`${link.testid}-mobile`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    to={me ? homeForRole(me.role) : "/login"}
                    className={cn(buttonVariants({ size: "sm" }), "mt-3")}
                    data-testid="public-diver-login-link-mobile"
                  >
                    {me ? "My Dashboard" : "Diver Login"}
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/5 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-7" />
            <span>{BRAND_NAME}</span>
          </div>
          <p>Learn freediving safely, progressively, and confidently.</p>
        </div>
      </footer>
    </div>
  );
}
