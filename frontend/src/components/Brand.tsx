import { cn } from "@/lib/utils";

export const BRAND_NAME = "Ssamsara Freedive";
export const BRAND_LOGO =
  "https://customer-assets-39nsmqrw.emergentagent.net/job_depth-logbook/artifacts/fg5gat2f_image.png";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={BRAND_LOGO}
      alt={`${BRAND_NAME} logo`}
      className={cn("size-8 rounded-full object-cover ring-1 ring-white/15", className)}
      data-testid="brand-logo"
    />
  );
}

export function Brand({
  className,
  logoClassName,
  wordClassName,
}: {
  className?: string;
  logoClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={logoClassName} />
      <span
        className={cn(
          "heading text-sm font-semibold tracking-[0.16em] uppercase",
          wordClassName,
        )}
      >
        {BRAND_NAME}
      </span>
    </span>
  );
}
