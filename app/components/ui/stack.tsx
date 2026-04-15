import { cn } from "~/lib/cn";
import type { HTMLAttributes } from "react";

const gapClass = (n: number) =>
  (
    ({
      0: "gap-0",
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      6: "gap-6"
    }) as Record<number, string>
  )[n] ?? "gap-4";

export function VStack({
  className,
  spacing = 4,
  ...props
}: HTMLAttributes<HTMLDivElement> & { spacing?: number }) {
  return (
    <div className={cn("flex flex-col", gapClass(spacing), className)} {...props} />
  );
}

export function HStack({
  className,
  spacing = 2,
  ...props
}: HTMLAttributes<HTMLDivElement> & { spacing?: number }) {
  return (
    <div
      className={cn("flex flex-row items-center", gapClass(spacing), className)}
      {...props}
    />
  );
}
