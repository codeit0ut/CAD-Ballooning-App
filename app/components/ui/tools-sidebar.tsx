import { cn } from "~/lib/cn";
import type { ReactNode } from "react";
import { LuX } from "react-icons/lu";

export type ToolsSidebarProps = {
  open: boolean;
  /** Primary heading (e.g. current tool mode name). */
  title: ReactNode;
  /** Native tooltip when hovering the heading area (usage help). */
  headingTooltip?: string;
  /** Optional subtext under the title. */
  description?: ReactNode;
  onClose?: () => void;
  /** Native tooltip on the close control (defaults to a short usage hint). */
  closeButtonTitle?: string;
  /** Tailwind width classes for the column; parent should use flex row + flex-1 min-w-0 on main. */
  widthClassName?: string;
  className?: string;
  children: ReactNode;
  /** Sticky bottom area (actions, secondary controls). */
  footer?: ReactNode;
};

/**
 * Right-hand tools column. Renders nothing when `open` is false so the main
 * editor expands full width. Swap `children` (and title/description/footer)
 * for different tool modes while keeping the same shell.
 */
export function ToolsSidebar({
  open,
  title,
  headingTooltip,
  description,
  onClose,
  closeButtonTitle = "Hide this panel. Select a balloon on the drawing to open it again.",
  widthClassName = "w-80 min-w-[18rem] max-w-[22rem]",
  className,
  children,
  footer
}: ToolsSidebarProps) {
  if (!open) return null;

  return (
    <aside
      role="complementary"
      className={cn(
        "flex min-h-0 shrink-0 flex-col border-l border-border bg-card shadow-sm",
        widthClassName,
        className
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0 flex-1" title={headingTooltip}>
          <h2 className="text-sm font-semibold leading-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <div className="mt-1 text-xs leading-snug text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close tools panel"
            title={closeButtonTitle}
            onClick={onClose}
          >
            <LuX className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-border bg-muted/20 p-3">
          {footer}
        </div>
      ) : null}
    </aside>
  );
}
