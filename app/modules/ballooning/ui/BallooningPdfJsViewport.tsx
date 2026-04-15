import type { PDFDocumentProxy } from "pdfjs-dist";
import type { MutableRefObject, ReactNode, Ref } from "react";
import { useCallback, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export type BallooningPdfPageOverlayContext = {
  pageNumber: number;
  pageWidthPx: number;
  pageHeightPx: number;
};

export type BallooningPdfGeometry = {
  numPages: number;
  /** Height ÷ width for page 1 at scale 1 (used to size the stack to the viewport). */
  pageHeightOverWidth: number;
};

export type BallooningPdfJsViewportProps = {
  /** Same sources as before: uploaded path, blob URL, or absolute URL. */
  src: string;
  /** CSS pixel width passed to each react-pdf `Page` (`width` prop). */
  pageWidth: number;
  /**
   * When true, the outer scrollport shows scrollbars if content exceeds the
   * scrollport; when false, overflow is clipped (fit / zoomed-out views).
   */
  overflowScroll: boolean;
  /** Optional class on the outer scrollport (e.g. `h-full w-full min-h-0`). */
  className?: string;
  /** The element that receives programmatic scroll (e.g. Konva wheel → scrollTop). */
  scrollPortRef?: Ref<HTMLDivElement | null>;
  /** Fired once the document and first-page geometry are known. */
  onPdfGeometry?: (g: BallooningPdfGeometry) => void;
  /** Disable right-click drag pan on the scrollport (e.g. when RMB is reserved). */
  disableRightDragPan?: boolean;
  /** One Konva overlay per page; receives measured render size for that page. */
  renderPageOverlay?: (ctx: BallooningPdfPageOverlayContext) => ReactNode;
};

type PageRowProps = {
  pageNumber: number;
  pageWidthPx: number;
  renderPageOverlay?: BallooningPdfJsViewportProps["renderPageOverlay"];
};

function PdfPageRow({
  pageNumber,
  pageWidthPx,
  renderPageOverlay
}: PageRowProps) {
  const [rendered, setRendered] = useState<{
    w: number;
    h: number;
  } | null>(null);

  const onRenderSuccess = useCallback(
    (page: { width: number; height: number }) => {
      setRendered({ w: page.width, h: page.height });
    },
    []
  );

  const w = Math.max(1, Math.floor(pageWidthPx));

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        className="relative bg-white"
        style={
          rendered
            ? { width: rendered.w, height: rendered.h }
            : { minWidth: w, minHeight: 1 }
        }
      >
        <Page
          pageNumber={pageNumber}
          width={w}
          onRenderSuccess={onRenderSuccess}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
        {rendered && renderPageOverlay
          ? renderPageOverlay({
              pageNumber,
              pageWidthPx: rendered.w,
              pageHeightPx: rendered.h
            })
          : null}
      </div>
    </div>
  );
}

/**
 * pdf.js rendering via `react-pdf`. Keep overlays outside this file — use
 * `renderPageOverlay` so Konva stays separate per page.
 */
export function BallooningPdfJsViewport({
  src,
  pageWidth,
  overflowScroll,
  className,
  scrollPortRef,
  onPdfGeometry,
  disableRightDragPan,
  renderPageOverlay
}: BallooningPdfJsViewportProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  const rmbPanRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);

  const onLoadSuccess = useCallback(
    async (pdf: PDFDocumentProxy) => {
      const n = pdf.numPages;
      setNumPages(n);
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: 1 });
      const pageHeightOverWidth = vp.height / vp.width;
      onPdfGeometry?.({ numPages: n, pageHeightOverWidth });
    },
    [onPdfGeometry]
  );

  const pageW = Math.max(1, Math.floor(pageWidth));

  const setScrollPort = useCallback(
    (node: HTMLDivElement | null) => {
      localScrollRef.current = node;
      if (!scrollPortRef) return;
      if (typeof scrollPortRef === "function") {
        scrollPortRef(node);
      } else {
        (scrollPortRef as MutableRefObject<HTMLDivElement | null>).current =
          node;
      }
    },
    [scrollPortRef]
  );

  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 2) return;
      if (disableRightDragPan) return;
      const el = localScrollRef.current;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      rmbPanRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: el.scrollLeft,
        startScrollTop: el.scrollTop
      };
      el.style.cursor = "grabbing";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [disableRightDragPan]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = rmbPanRef.current;
    if (!p || p.pointerId !== e.pointerId) return;
    const el = localScrollRef.current;
    if (!el) return;
    el.scrollLeft =
      p.startScrollLeft - (e.clientX - p.startX);
    el.scrollTop = p.startScrollTop - (e.clientY - p.startY);
  }, []);

  const endRmbPan = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = rmbPanRef.current;
    if (!p || p.pointerId !== e.pointerId) return;
    rmbPanRef.current = null;
    const el = localScrollRef.current;
    if (el) {
      el.style.cursor = "";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <div
      ref={setScrollPort}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMove={onPointerMove}
      onPointerUp={endRmbPan}
      onPointerCancel={endRmbPan}
      onContextMenu={(ev) => ev.preventDefault()}
      className={`bg-muted/30 ${overflowScroll ? "overflow-auto" : "overflow-hidden"} ${className ?? ""}`}
    >
      <div className="flex min-h-full w-full flex-col items-center py-2">
        <Document
          file={src}
          onLoadSuccess={onLoadSuccess}
          loading={
            <div className="p-4 text-sm text-muted-foreground">
              Loading document…
            </div>
          }
          error={
            <div className="p-4 text-sm text-destructive">
              Could not load PDF.
            </div>
          }
        >
          {numPages
            ? Array.from({ length: numPages }, (_, i) => (
                <PdfPageRow
                  key={i + 1}
                  pageNumber={i + 1}
                  pageWidthPx={pageW}
                  renderPageOverlay={renderPageOverlay}
                />
              ))
            : null}
        </Document>
      </div>
    </div>
  );
}
