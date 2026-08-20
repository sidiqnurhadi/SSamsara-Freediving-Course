import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Compass, Gauge, ShieldCheck, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import PublicLayout from "@/components/PublicLayout";
import { apiGet } from "@/lib/api";
import { formatPrice } from "@/lib/fd";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/types";

const HERO =
  "https://images.unsplash.com/photo-1602199926649-2e5e447bab97?crop=entropy&cs=srgb&fm=jpg&q=85&w=1800";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Safety first",
    body: "Every session runs with a dedicated safety diver, buddy rotation and a written emergency plan.",
  },
  {
    icon: Gauge,
    title: "Progressive depth",
    body: "We add metres only when your equalization and relaxation are ready for them — never before.",
  },
  {
    icon: Compass,
    title: "Measured progress",
    body: "Your dives, tables and personal bests live in one logbook so training decisions stay honest.",
  },
];

export default function Home() {
  const { data: courses } = useQuery({
    queryKey: ["courses", "public"],
    queryFn: () => apiGet<Course[]>("/courses"),
    retry: false,
  });

  const featured = (courses ?? []).slice(0, 3);

  return (
    <PublicLayout>
      <section className="relative flex min-h-[88vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 animate-drift bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,18,26,0.55)_0%,rgba(2,18,26,0.35)_35%,rgba(4,24,32,0.96)_100%)]"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-6xl px-5 pt-28 pb-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="text-xs tracking-[0.34em] text-primary uppercase"
          >
            Depth Freediving School
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
            className="heading mt-4 max-w-3xl text-5xl leading-[0.95] font-semibold sm:text-6xl lg:text-7xl"
            data-testid="hero-headline"
          >
            Explore your limits
            <span className="block text-primary/90">Discover the depth</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.35 }}
            className="mt-6 max-w-xl text-base text-foreground/75 sm:text-lg"
          >
            Courses, coached training and a digital logbook that follows every metre of your
            progression — from your first duck dive to your next personal best.
          </motion.p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/courses"
              className={cn(buttonVariants({ size: "lg" }), "group")}
              data-testid="hero-explore-courses-button"
            >
              Explore Courses
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className={buttonVariants({ size: "lg", variant: "outline" })}
              data-testid="hero-diver-login-button"
            >
              Diver Login
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20" id="about">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-xs tracking-[0.28em] text-primary uppercase">The school</p>
            <h2 className="heading mt-4 text-3xl font-semibold sm:text-4xl">
              Learn freediving safely, progressively, and confidently.
            </h2>
            <p className="mt-6 text-muted-foreground">
              We are an AIDA-affiliated school training in the Thousand Islands and Nusa Penida.
              Our approach is unhurried: breathing and relaxation before depth, technique before
              performance, and a logbook that tells you the truth about your progression.
            </p>
            <p className="mt-4 text-muted-foreground">
              Our instructors have guided divers from their first 10 m dive to competitive depth.
              Pool sessions run twice a week; depth sessions run every weekend.
            </p>
          </div>
          <div className="grid gap-4">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="glass rounded-2xl px-5 py-5">
                <pillar.icon className="size-5 text-primary" />
                <h3 className="heading mt-3 text-base font-semibold">{pillar.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-[#03151d] px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.28em] text-primary uppercase">Courses</p>
              <h2 className="heading mt-3 text-3xl font-semibold">Start where you are</h2>
            </div>
            <Link
              to="/courses"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              data-testid="home-all-courses-link"
            >
              All courses
            </Link>
          </div>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="home-courses-empty">
                Course catalogue is loading — check the Courses page for the full list.
              </p>
            ) : (
              featured.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="group overflow-hidden rounded-2xl border border-white/8 bg-card transition-transform duration-300 hover:-translate-y-1"
                  data-testid={`home-course-card-${course.slug}`}
                >
                  <div
                    className="h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${course.image_url})` }}
                  />
                  <div className="p-5">
                    <p className="text-[11px] tracking-[0.2em] text-primary uppercase">
                      {course.level}
                    </p>
                    <h3 className="heading mt-2 text-lg font-semibold">{course.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {course.short_description}
                    </p>
                    <p className="stat-num mt-4 text-sm text-primary">
                      {formatPrice(course.price, course.currency)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="glass flex flex-col items-start gap-6 rounded-3xl px-7 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <Waves className="size-6 text-primary" />
            <h2 className="heading mt-4 text-2xl font-semibold sm:text-3xl">
              Your logbook is waiting
            </h2>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">
              Track dives, run CO2 and O2 tables with a full-screen timer, and watch personal bests
              update themselves.
            </p>
          </div>
          <Link
            to="/register"
            className={buttonVariants({ size: "lg" })}
            data-testid="home-create-account-button"
          >
            Create diver account
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
