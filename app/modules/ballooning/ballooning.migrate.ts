import {
  clampNoteSize,
  clampPinSize,
  DEFAULT_FRAME_COLOR,
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_FONT_SIZE_PX,
  DEFAULT_PIN_SHAPE,
  DEFAULT_PIN_SIZE_PX
} from "~/modules/ballooning/balloonToolbar.constants";
import { clamp01 } from "~/modules/ballooning/hooks/usePageSpaceCoords";
import type { BalloonAnnotation, BalloonPinShape } from "~/modules/ballooning/ballooning.types";

const PIN_SHAPES: BalloonPinShape[] = [
  "circle",
  "square",
  "hex",
  "diamond",
  "triangle"
];

function normalizePinShape(v: unknown): BalloonPinShape {
  return PIN_SHAPES.includes(v as BalloonPinShape)
    ? (v as BalloonPinShape)
    : DEFAULT_PIN_SHAPE;
}

/**
 * Legacy annotations used viewport percentages (0–100). New format uses
 * normalized page-space (0–1) per PDF page.
 */
export function migrateBalloonAnnotations(
  list: BalloonAnnotation[]
): BalloonAnnotation[] {
  return list.map(migrateOne);
}

function migrateOne(a: BalloonAnnotation): BalloonAnnotation {
  let { x, y, page, rect } = a;
  const looksLegacyPercent =
    x > 1.0001 ||
    y > 1.0001 ||
    (rect &&
      (rect.x > 1.0001 ||
        rect.y > 1.0001 ||
        rect.width > 1.0001 ||
        rect.height > 1.0001));

  if (looksLegacyPercent) {
    x = x / 100;
    y = y / 100;
    if (rect) {
      rect = {
        x: rect.x / 100,
        y: rect.y / 100,
        width: rect.width / 100,
        height: rect.height / 100
      };
    }
  }

  const pinSizePx =
    a.pinSizePx != null ? clampPinSize(a.pinSizePx) : DEFAULT_PIN_SIZE_PX;
  const noteFontSizePx =
    a.noteFontSizePx != null
      ? clampNoteSize(a.noteFontSizePx)
      : DEFAULT_NOTE_FONT_SIZE_PX;

  return {
    ...a,
    page: page ?? 1,
    x: clamp01(x),
    y: clamp01(y),
    rect: rect
      ? {
          x: clamp01(rect.x),
          y: clamp01(rect.y),
          width: clamp01(rect.width),
          height: clamp01(rect.height)
        }
      : rect,
    showLeaderLine: a.showLeaderLine ?? true,
    frameColor: a.frameColor ?? DEFAULT_FRAME_COLOR,
    pinShape: normalizePinShape(a.pinShape),
    pinSizePx,
    noteColor: a.noteColor ?? DEFAULT_NOTE_COLOR,
    noteFontSizePx
  };
}
