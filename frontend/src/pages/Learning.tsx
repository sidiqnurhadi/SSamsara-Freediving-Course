import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, FileText } from "lucide-react";
import AppShell from "@/components/AppShell";
import { EmptyState, ErrorState } from "@/components/Bits";
import { LoadingVeil } from "@/components/Guards";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LearningResource } from "@/lib/types";

export default function Learning() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["learning-resources"],
    queryFn: () => apiGet<LearningResource[]>("/learning-resources"),
    retry: false,
  });

  const categories = Array.from(new Set((data ?? []).map((item) => item.category)));

  return (
    <AppShell title="Learning">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h2 className="heading text-2xl font-semibold" data-testid="learning-title">
            Learning resources
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Links configured by the school to official or authorized material. Documents open in a
            new tab on the publisher's own site.
          </p>
        </div>

        {isLoading ? <LoadingVeil label="Loading resources" /> : null}
        {isError ? <ErrorState testid="learning-error" /> : null}
        {data && data.length === 0 ? (
          <EmptyState
            testid="learning-empty"
            title="No resources published yet."
            description="Your school has not configured any learning links yet."
          />
        ) : null}

        {categories.map((category) => (
          <section key={category} data-testid={`learning-category-${category.replace(/\s+/g, "-")}`}>
            <h3 className="heading text-sm tracking-[0.2em] text-muted-foreground uppercase">
              {category}
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(data ?? [])
                .filter((item) => item.category === category)
                .map((resource) => (
                  <article
                    key={resource.id}
                    className="glass flex flex-col rounded-2xl px-5 py-5"
                    data-testid={`learning-card-${resource.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs tracking-[0.18em] text-primary uppercase">
                          {resource.organization ?? "Resource"}
                        </p>
                        <h4 className="heading mt-2 text-base font-semibold">{resource.title}</h4>
                      </div>
                      {resource.level ? <Badge variant="secondary">{resource.level}</Badge> : null}
                    </div>
                    {resource.description ? (
                      <p className="mt-3 flex-1 text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                    ) : null}
                    <a
                      href={resource.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-5")}
                      data-testid={`learning-open-${resource.id}`}
                    >
                      {resource.resource_type === "pdf" ? (
                        <>
                          <FileText className="size-4" /> Open PDF
                        </>
                      ) : (
                        <>
                          <BookOpen className="size-4" /> Open Manual
                        </>
                      )}
                      <ExternalLink className="size-3.5" />
                    </a>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
