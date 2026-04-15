import { cn } from "~/lib/cn";
import type { HTMLAttributes } from "react";

export function Heading({
  className,
  size = "h4",
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { size?: "h4" | "h3" }) {
  const sizes = { h3: "text-xl font-semibold", h4: "text-lg font-semibold" };
  return (
    <h2 className={cn(sizes[size], className)} {...props} />
  );
}
