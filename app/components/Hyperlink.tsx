import { cn } from "~/lib/cn";
import { Link } from "react-router";
import type { ComponentProps } from "react";

export function Hyperlink({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "font-medium text-primary underline-offset-4 hover:underline",
        className
      )}
      {...props}
    />
  );
}
