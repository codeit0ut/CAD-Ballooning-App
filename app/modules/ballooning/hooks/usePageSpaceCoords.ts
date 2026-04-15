import { useMemo } from "react";

/**
 * Page-space coordinates: normalized (0–1) relative to a single PDF page's
 * rendered width/height. Independent of zoom/resize as long as page pixel size updates.
 */

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Which edge/corner is dragged when resizing a normalized highlight rect. */
export type RectResizeHandle =
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w";

export type BalloonNormRectLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Live resize state: pointer updates `start` + handle → new rect (0–1 page space). */
export type BalloonRectResizeDragState = {
  id: string;
  handle: RectResizeHandle;
  start: BalloonNormRectLike;
};

const MIN_NORM_RECT_W = 0.004;
const MIN_NORM_RECT_H = 0.004;

/**
 * Compute a new axis-aligned rect from drag position `nx, ny` (normalized 0–1)
 * and fixed opposite edges implied by `handle`.
 */
export function resizeNormRect(
  handle: RectResizeHandle,
  start: BalloonNormRectLike,
  nx: number,
  ny: number
): BalloonNormRectLike {
  nx = clamp01(nx);
  ny = clamp01(ny);
  const rx = start.x;
  const ry = start.y;
  const rw = start.width;
  const rh = start.height;
  const right = rx + rw;
  const bottom = ry + rh;

  switch (handle) {
    case "se": {
      const width = Math.min(1 - rx, Math.max(MIN_NORM_RECT_W, nx - rx));
      const height = Math.min(1 - ry, Math.max(MIN_NORM_RECT_H, ny - ry));
      return { x: rx, y: ry, width, height };
    }
    case "nw": {
      const x = Math.min(right - MIN_NORM_RECT_W, Math.max(0, nx));
      const y = Math.min(bottom - MIN_NORM_RECT_H, Math.max(0, ny));
      return { x, y, width: right - x, height: bottom - y };
    }
    case "ne": {
      const width = Math.min(1 - rx, Math.max(MIN_NORM_RECT_W, nx - rx));
      const y = Math.min(bottom - MIN_NORM_RECT_H, Math.max(0, ny));
      return { x: rx, y, width, height: bottom - y };
    }
    case "sw": {
      const x = Math.min(right - MIN_NORM_RECT_W, Math.max(0, nx));
      const height = Math.min(1 - ry, Math.max(MIN_NORM_RECT_H, ny - ry));
      return { x, y: ry, width: right - x, height };
    }
    case "e": {
      const width = Math.min(1 - rx, Math.max(MIN_NORM_RECT_W, nx - rx));
      return { x: rx, y: ry, width, height: rh };
    }
    case "w": {
      const x = Math.min(right - MIN_NORM_RECT_W, Math.max(0, nx));
      return { x, y: ry, width: right - x, height: rh };
    }
    case "s": {
      const height = Math.min(1 - ry, Math.max(MIN_NORM_RECT_H, ny - ry));
      return { x: rx, y: ry, width: rw, height };
    }
    case "n": {
      const y = Math.min(bottom - MIN_NORM_RECT_H, Math.max(0, ny));
      return { x: rx, y, width: rw, height: bottom - y };
    }
    default:
      return { x: rx, y: ry, width: rw, height: rh };
  }
}

/** Click position in page pixels → normalized (0–1). */
export function toNormalizedPageCoords(
  clickX: number,
  clickY: number,
  pageWidthPx: number,
  pageHeightPx: number
) {
  const w = Math.max(1e-6, pageWidthPx);
  const h = Math.max(1e-6, pageHeightPx);
  return {
    x: clamp01(clickX / w),
    y: clamp01(clickY / h)
  };
}

/** Normalized (0–1) → Konva / screen pixels for the current page render size. */
export function toScreenCoords(
  xNorm: number,
  yNorm: number,
  pageWidthPx: number,
  pageHeightPx: number
) {
  return {
    screenX: xNorm * pageWidthPx,
    screenY: yNorm * pageHeightPx
  };
}

export function normRectToPx(
  rect: { x: number; y: number; width: number; height: number },
  pageWidthPx: number,
  pageHeightPx: number
) {
  return {
    x: rect.x * pageWidthPx,
    y: rect.y * pageHeightPx,
    width: rect.width * pageWidthPx,
    height: rect.height * pageHeightPx
  };
}

/** Stable object of pure coordinate helpers (optional ergonomic hook). */
export function usePageSpaceGeometry() {
  return useMemo(
    () =>
      ({
        clamp01,
        toNormalizedPageCoords,
        toScreenCoords,
        normRectToPx
      }) as const,
    []
  );
}
