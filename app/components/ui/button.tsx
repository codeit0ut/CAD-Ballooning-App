import { cn } from "~/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-primary text-primary-foreground shadow hover:opacity-90 border border-transparent",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border border-border",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive: "text-destructive hover:bg-destructive/10"
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md";
  leftIcon?: ReactNode;
  isDisabled?: boolean;
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  leftIcon,
  isDisabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        size === "sm" ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm",
        className
      )}
      disabled={isDisabled ?? props.disabled}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
}
