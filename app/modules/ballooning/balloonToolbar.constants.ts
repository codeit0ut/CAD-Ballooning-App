import type { BalloonPinShape } from "~/modules/ballooning/ballooning.types";

/** Frame / leader line palette (5). */
export const BALLOON_FRAME_COLOR_OPTIONS = [
  { label: "Orange", value: "#f97316" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Violet", value: "#8b5cf6" }
] as const;

/** Balloon number (note) text palette (5). */
export const BALLOON_NOTE_COLOR_OPTIONS = [
  { label: "Red", value: "#dc2626" },
  { label: "Blue", value: "#2563eb" },
  { label: "Black", value: "#0f172a" },
  { label: "Green", value: "#15803d" },
  { label: "Orange", value: "#ea580c" }
] as const;

export const BALLOON_PIN_SHAPES: { label: string; value: BalloonPinShape }[] = [
  { label: "Circle", value: "circle" },
  { label: "Square", value: "square" },
  { label: "Hex", value: "hex" },
  { label: "Diamond", value: "diamond" },
  { label: "Triangle", value: "triangle" }
];

/** Allowed pin / note font sizes (px) in every size dropdown and when clamping stored values. */
export const BALLOON_SIZE_DROPDOWN_PX = [
  2, 10, 17, 25, 32, 40, 47, 55, 63, 70, 78, 85, 93, 100, 108
] as const;

export type BalloonSizeDropdownPx =
  (typeof BALLOON_SIZE_DROPDOWN_PX)[number];

export const PIN_SIZE_MIN = BALLOON_SIZE_DROPDOWN_PX[0];
export const PIN_SIZE_MAX =
  BALLOON_SIZE_DROPDOWN_PX[BALLOON_SIZE_DROPDOWN_PX.length - 1];
export const NOTE_SIZE_MIN = PIN_SIZE_MIN;
export const NOTE_SIZE_MAX = PIN_SIZE_MAX;

export const DEFAULT_FRAME_COLOR = BALLOON_FRAME_COLOR_OPTIONS[0].value;
export const DEFAULT_NOTE_COLOR = BALLOON_NOTE_COLOR_OPTIONS[2].value;
/** Nearest entry to the old default (24). */
export const DEFAULT_PIN_SIZE_PX: BalloonSizeDropdownPx = 25;
/** Nearest entry to the old default (12). */
export const DEFAULT_NOTE_FONT_SIZE_PX: BalloonSizeDropdownPx = 10;
export const DEFAULT_PIN_SHAPE: BalloonPinShape = "circle";

function snapToBalloonSizeDropdown(n: number): BalloonSizeDropdownPx {
  const r = Math.round(n);
  let best: BalloonSizeDropdownPx = BALLOON_SIZE_DROPDOWN_PX[0];
  let bestDist = Math.abs(r - best);
  for (const v of BALLOON_SIZE_DROPDOWN_PX) {
    const d = Math.abs(r - v);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}

export function clampPinSize(n: number): BalloonSizeDropdownPx {
  return snapToBalloonSizeDropdown(n);
}

export function clampNoteSize(n: number): BalloonSizeDropdownPx {
  return snapToBalloonSizeDropdown(n);
}

/** Step to the previous or next allowed size in `BALLOON_SIZE_DROPDOWN_PX`. */
export function stepBalloonSizeDropdownPx(
  current: number,
  direction: 1 | -1
): BalloonSizeDropdownPx {
  const v = snapToBalloonSizeDropdown(current);
  const i = BALLOON_SIZE_DROPDOWN_PX.indexOf(v);
  const idx = i === -1 ? 0 : i;
  const next = Math.max(
    0,
    Math.min(BALLOON_SIZE_DROPDOWN_PX.length - 1, idx + direction)
  );
  return BALLOON_SIZE_DROPDOWN_PX[next]!;
}
