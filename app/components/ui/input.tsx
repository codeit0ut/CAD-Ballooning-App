import { cn } from "~/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Input({
  className,
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const inputId = id ?? props.name;
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium leading-none">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}
