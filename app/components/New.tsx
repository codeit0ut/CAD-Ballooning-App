import { Link } from "react-router";
import { LuPlus } from "react-icons/lu";
import { cn } from "~/lib/cn";

export function New({
  label,
  to,
  className
}: {
  label: string;
  to: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90",
        className
      )}
    >
      <LuPlus className="h-4 w-4" />
      {label}
    </Link>
  );
}
