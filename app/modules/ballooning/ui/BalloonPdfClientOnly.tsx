import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { LuLoader } from "react-icons/lu";
import type { BallooningPdfJsViewportProps } from "./BallooningPdfJsViewport";

export type BalloonPdfClientOnlyProps = BallooningPdfJsViewportProps;

/**
 * Gates pdf.js behind `useEffect` + dynamic `import()` so the SSR bundle never
 * evaluates pdfjs / canvas (avoids `DOMMatrix is not defined` in Node).
 */
export function BalloonPdfClientOnly(props: BalloonPdfClientOnlyProps) {
  const [Viewport, setViewport] =
    useState<ComponentType<BallooningPdfJsViewportProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./BallooningPdfJsViewport").then((m) => {
      if (!cancelled) setViewport(() => m.BallooningPdfJsViewport);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Viewport) {
    return (
      <div
        className={`flex items-center justify-center bg-white text-muted-foreground ${props.className ?? "h-full w-full min-h-[12rem]"}`}
        aria-busy="true"
      >
        <LuLoader
          className="h-8 w-8 animate-spin opacity-40"
          aria-label="Loading PDF viewer"
        />
      </div>
    );
  }

  return <Viewport {...props} />;
}
