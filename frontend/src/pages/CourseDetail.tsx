import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import PublicLayout from "@/components/PublicLayout";
import { ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { apiGet } from "@/lib/api";
import { formatPrice } from "@/lib/fd";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/types";

export default function CourseDetail() {
  const { slug = "" } = useParams();
  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => apiGet<Course>(`/courses/${slug}`),
    retry: false,
  });

  return (
    <PublicLayout>
      {isLoading ? <LoadingVeil label="Loading course" /> : null}
      {isError ? (
        <div className="mx-auto max-w-3xl px-5 py-20">
          <ErrorState testid="course-detail-error" message="This course could not be found." />
          <Link to="/courses" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
            <ChevronLeft className="size-4" /> Back to courses
          </Link>
        </div>
      ) : null}

      {course ? (
        <>
          <section className="relative flex min-h-[52vh] items-end overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${course.image_url})` }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,18,26,0.5),rgba(4,24,32,0.97))]"
              aria-hidden
            />
            <div className="relative mx-auto w-full max-w-5xl px-5 pt-24 pb-12">
              <Badge variant="outline" className="text-primary">
                {course.level}
              </Badge>
              <h1
                className="heading mt-4 text-4xl font-semibold sm:text-5xl"
                data-testid="course-detail-title"
              >
                {course.title}
              </h1>
              <p className="mt-3 max-w-xl text-foreground/75">{course.tagline}</p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  to="/register"
                  className={buttonVariants({ size: "lg" })}
                  data-testid="course-register-button-hero"
                >
                  Register Course
                </Link>
                <span className="stat-num text-lg text-primary">
                  {formatPrice(course.price, course.currency)}
                </span>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-5 py-14">
            <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-12">
                <div>
                  <h2 className="heading text-xl font-semibold">Overview</h2>
                  <p className="mt-3 text-muted-foreground">{course.description}</p>
                </div>

                {course.learn_topics.length > 0 ? (
                  <div>
                    <h2 className="heading text-xl font-semibold">What you will learn</h2>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {course.learn_topics.map((topic) => (
                        <li
                          key={topic}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="size-4 text-primary" /> {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {course.structure.length > 0 ? (
                  <div>
                    <h2 className="heading text-xl font-semibold">Course structure</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {course.structure.map((item) => (
                        <div key={item.label} className="glass rounded-xl px-4 py-4">
                          <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                            {item.label}
                          </p>
                          <p className="stat-num mt-1 text-lg">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {course.requirements.length > 0 ? (
                  <div>
                    <h2 className="heading text-xl font-semibold">Requirements</h2>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {course.requirements.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <aside className="space-y-5">
                <div className="glass rounded-2xl px-5 py-5">
                  <h3 className="heading text-sm font-semibold tracking-wider uppercase">
                    Certification
                  </h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <Row label="Agency" value={course.certification_agency ?? "—"} />
                    <Row label="Level" value={course.certification_level ?? "—"} />
                    <Row label="Max training depth" value={course.max_depth ?? "—"} />
                    <Row label="Duration" value={course.duration} />
                    <Row label="Schedule" value={course.schedule ?? "On request"} />
                  </dl>
                  {course.certification_requirements.length > 0 ? (
                    <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                      {course.certification_requirements.map((req) => (
                        <li key={req}>• {req}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="glass rounded-2xl px-5 py-5">
                  <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                    Price
                  </p>
                  <p className="stat-num mt-2 text-3xl text-primary">
                    {formatPrice(course.price, course.currency)}
                  </p>
                  <Link
                    to="/register"
                    className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}
                    data-testid="course-register-button"
                  >
                    Register Course
                  </Link>
                </div>
              </aside>
            </div>
          </section>
        </>
      ) : null}
    </PublicLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
