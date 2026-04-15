import { cn } from "~/lib/cn";
import type { ReactNode } from "react";

export function Drawer({
  open,
  onOpenChange,
  children
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg rounded-t-lg border bg-card shadow-lg sm:rounded-lg">
        {children}
      </div>
    </div>
  );
}

export function DrawerContent({ children }: { children: ReactNode }) {
  return <div className="flex max-h-[90dvh] flex-col">{children}</div>;
}

export function DrawerHeader({ children }: { children: ReactNode }) {
  return <div className="border-b px-4 py-3">{children}</div>;
}

export function DrawerTitle({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none", className)}>
      {children}
    </h2>
  );
}

export function DrawerBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-4">{children}</div>;
}

export function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2 border-t px-4 py-3">{children}</div>
  );
}
