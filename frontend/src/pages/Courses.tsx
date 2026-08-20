import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PublicLayout from "@/components/PublicLayout";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { apiGet } from "@/lib/api";
import { formatPrice } from "@/lib/fd";
import type { Course } from "@/lib/types";

export default function Courses() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["courses", "public"],
    queryFn: () => apiGet<Course[]>("/courses"),
    retry: false,
  });

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20">
        <p className="text-xs tracking-[0.28em] text-primary uppercase">Courses</p>
        <h1 className="heading mt-3 text-4xl font-semibold sm:text-5xl" data-testid="courses-title">
          Train with intention
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Certification courses, coached pool and depth sessions, and focused workshops. Every
          course is run by an AIDA-affiliated instructor with a dedicated safety diver.
        </p>

        <div className="mt-10">
          {isLoading ? <LoadingVeil label="Loading courses" /> : null}
          {isError ? <ErrorState testid="courses-error" /> : null}
          {data && data.length === 0 ? (
            <EmptyState
              testid="courses-empty"
              title="No courses published yet"
              description="The school is preparing its catalogue. Please check back soon."
            />
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((course) => (
              <article
                key={course.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-card"
                data-testid={`course-card-${course.slug}`}
              >
                <div
                  className="h-44 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${course.image_url})` }}
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-primary">
                      {course.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{course.duration}</span>
                  </div>
                  <h2 className="heading mt-3 text-lg font-semibold">{course.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">
                    {course.short_description}
                  </p>
                  {course.max_depth ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Recommended level ·{" "}
                      <span className="text-foreground">{course.max_depth}</span>
                    </p>
                  ) : null}
                  <div className="mt-5 flex items-center justify-between">
                    <span className="stat-num text-base text-primary">
                      {formatPrice(course.price, course.currency)}
                    </span>
                    <Link
                      to={`/courses/${course.slug}`}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                      data-testid={`course-view-${course.slug}`}
                    >
                      View Course
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
