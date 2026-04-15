import { cn } from "~/lib/cn";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  variant = "outline",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    />
  );
}
