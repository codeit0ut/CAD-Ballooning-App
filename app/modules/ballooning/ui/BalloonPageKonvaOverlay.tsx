import type { KonvaEventObject } from "konva/lib/Node";
import type { Stage as StageType } from "konva/lib/Stage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, RegularPolygon, Stage, Text } from "react-konva";
import {
  clamp01,
  normRectToPx,
  toScreenCoords,
  type BalloonRectResizeDragState,
  type RectResizeHandle
} from "~/modules/ballooning/hooks/usePageSpaceCoords";
import type {
  BalloonAnnotation,
  BalloonDrawingNote
} from "~/modules/ballooning/ballooning.types";
import {
  clampNoteSize,
  DEFAULT_NOTE_FONT_SIZE_PX,
  DEFAULT_PIN_SIZE_PX,
  stepBalloonSizeDropdownPx
} from "~/modules/ballooning/balloonToolbar.constants";

export type DragStateNormalized = {
  page: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
} | null;

export type MovingBalloonNormalized = {
  /** Balloon under the pointer (drives movement math). */
  primaryId: string;
  /** All balloons moving together (same-page subset when group-dragging). */
  ids: string[];
  /** Normalized positions at drag start. */
  startById: Record<
    string,
    { x: number; y: number; rect: BalloonAnnotation["rect"] }
  >;
  offsetX: number;
  offsetY: number;
} | null;

export type MovingSelectionNormalized = {
  primaryId: string;
  ids: string[];
  startRectById: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >;
  offsetX: number;
  offsetY: number;
} | null;

export type BalloonKonvaTheme = {
  stroke: string;
  rectFill: string;
  rectFillSelected: string;
  previewFill: string;
  pinFill: string;
  pinFillSelected: string;
  pinText: string;
  pinTextSelected: string;
};

export type BalloonPageKonvaOverlayProps = {
  pageNumber: number;
  pageWidthPx: number;
  pageHeightPx: number;
  annotations: BalloonAnnotation[];
  notes: BalloonDrawingNote[];
  /** Selection order; last id is treated as primary for table scroll. */
  selectedBalloonIds: string[];
  selectedNote: string | null;
  placing: boolean;
  addingNote: boolean;
  /** When placing, only this page accepts the highlight gesture (1-based). */
  placingTargetPage: number;
  movingBalloon: MovingBalloonNormalized;
  movingSelection: MovingSelectionNormalized;
  /** Left-drag resize on primary selection highlight handles (same page only). */
  resizingRect: BalloonRectResizeDragState | null;
  movingNote: {
    id: string;
    offsetX: number;
    offsetY: number;
    dragging?: boolean;
  } | null;
  drag: DragStateNormalized;
  /** Left-drag marquee on empty page area (normalized page coords). */
  selectionMarquee: DragStateNormalized;
  theme: BalloonKonvaTheme;
  /** Highlight color while drawing a new region */
  previewFrameColor: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onRectangleDown: (page: number, nx: number, ny: number) => void;
  onRectangleMove: (page: number, nx: number, ny: number) => void;
  onRectangleUp: (page: number, nx: number, ny: number) => void;
  onSelectionMarqueeDown: (page: number, nx: number, ny: number) => void;
  onSelectionMarqueeMove: (page: number, nx: number, ny: number) => void;
  onSelectionMarqueeUp: (
    page: number,
    nx: number,
    ny: number,
    additive: boolean
  ) => void;
  /** Left click: selection only (Ctrl/Shift/meta supported). */
  onPinSelectPointerDown: (
    id: string,
    nx: number,
    ny: number,
    modifiers: { ctrl: boolean; meta: boolean; shift: boolean }
  ) => void;
  /** Right click: start pin / balloon move drag. */
  onPinMoveDragStart: (id: string, nx: number, ny: number) => void;
  onMoveBalloonMove: (nx: number, ny: number) => void;
  onMoveBalloonUp: () => void;
  /** Left click on highlight rect: selection only. */
  onBalloonRectSelectPointerDown: (
    id: string,
    nx: number,
    ny: number,
    modifiers: { ctrl: boolean; meta: boolean; shift: boolean }
  ) => void;
  /** Right click on highlight rect: move rect drag. */
  onSelectionMoveDragStart: (id: string, nx: number, ny: number) => void;
  onMoveSelectionMove: (nx: number, ny: number) => void;
  onMoveSelectionUp: () => void;
  /** Left pointer down on a resize handle (normalized coords). */
  onRectResizePointerDown: (
    id: string,
    handle: RectResizeHandle,
    nx: number,
    ny: number
  ) => void;
  onMoveRectResizeMove: (nx: number, ny: number) => void;
  onMoveRectResizeUp: () => void;
  onNoteCreate: (page: number, nx: number, ny: number) => void;
  /** Left click: focus note. */
  onNoteSelectPointerDown: (id: string, nx: number, ny: number) => void;
  /** Right click: drag note. */
  onNoteMoveDragStart: (id: string, nx: number, ny: number) => void;
  onMoveNoteMove: (nx: number, ny: number) => void;
  onMoveNoteUp: () => void;
  onClearSelectedNote: () => void;
  onNoteEdit: (id: string) => void;
  onNoteUpdate: (
    id: string,
    patch: Partial<Pick<BalloonDrawingNote, "text" | "fontSizePx" | "color">>
  ) => void;
  onNoteDelete: (id: string) => void;
  onLeaveSurface: () => void;
};

function clientToNormalized(
  stage: StageType,
  width: number,
  height: number,
  clientX: number,
  clientY: number
) {
  const rect = stage.container().getBoundingClientRect();
  const nx = clamp01((clientX - rect.left) / width);
  const ny = clamp01((clientY - rect.top) / height);
  return { nx, ny };
}

function cursorForResizeHandle(h: RectResizeHandle): string {
  switch (h) {
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "n":
    case "s":
      return "ns-resize";
    default:
      return "ew-resize";
  }
}

function pinRadiusPx(ann: BalloonAnnotation) {
  const d = ann.pinSizePx ?? DEFAULT_PIN_SIZE_PX;
  return Math.max(2, Math.min(54, d / 2));
}

function BalloonPinShape({
  ann,
  selected,
  r,
  theme
}: {
  ann: BalloonAnnotation;
  selected: boolean;
  r: number;
  theme: BalloonKonvaTheme;
}) {
  const stroke = ann.frameColor ?? theme.stroke;
  const strokeW = selected ? 2.5 : 2;
  const fill = "#ffffff";
  const shape = ann.pinShape ?? "circle";

  switch (shape) {
    case "square":
      return (
        <Rect
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          stroke={stroke}
          strokeWidth={strokeW}
          fill={fill}
          listening
        />
      );
    case "hex":
      return (
        <RegularPolygon
          x={0}
          y={0}
          sides={6}
          radius={r}
          rotation={Math.PI / 6}
          stroke={stroke}
          strokeWidth={strokeW}
          fill={fill}
          listening
        />
      );
    case "diamond":
      return (
        <RegularPolygon
          x={0}
          y={0}
          sides={4}
          radius={r}
          rotation={Math.PI / 4}
          stroke={stroke}
          strokeWidth={strokeW}
          fill={fill}
          listening
        />
      );
    case "triangle":
      return (
        <RegularPolygon
          x={0}
          y={0}
          sides={3}
          radius={r}
          rotation={-Math.PI / 2}
          stroke={stroke}
          strokeWidth={strokeW}
          fill={fill}
          listening
        />
      );
    default:
      return (
        <Circle
          radius={r}
          stroke={stroke}
          strokeWidth={strokeW}
          fill={fill}
          listening
        />
      );
  }
}

/**
 * Konva stage aligned to one PDF page (same pixel size as the rendered page).
 * All geometry is exchanged in normalized page coordinates (0–1); this layer
 * converts to pixels for drawing.
 */
export function BalloonPageKonvaOverlay({
  pageNumber,
  pageWidthPx,
  pageHeightPx,
  annotations,
  notes,
  selectedBalloonIds,
  selectedNote,
  placing,
  addingNote,
  placingTargetPage,
  movingBalloon,
  movingSelection,
  resizingRect,
  movingNote,
  drag,
  selectionMarquee,
  theme,
  previewFrameColor,
  scrollRef,
  onRectangleDown,
  onRectangleMove,
  onRectangleUp,
  onSelectionMarqueeDown,
  onSelectionMarqueeMove,
  onSelectionMarqueeUp,
  onPinSelectPointerDown,
  onPinMoveDragStart,
  onMoveBalloonMove,
  onMoveBalloonUp,
  onBalloonRectSelectPointerDown,
  onSelectionMoveDragStart,
  onMoveSelectionMove,
  onMoveSelectionUp,
  onRectResizePointerDown,
  onMoveRectResizeMove,
  onMoveRectResizeUp,
  onNoteCreate,
  onNoteSelectPointerDown,
  onNoteMoveDragStart,
  onMoveNoteMove,
  onMoveNoteUp,
  onClearSelectedNote,
  onNoteEdit,
  onNoteUpdate,
  onNoteDelete,
  onLeaveSurface
}: BalloonPageKonvaOverlayProps) {
  const stageRef = useRef<StageType>(null);
  const w = Math.max(1, Math.floor(pageWidthPx));
  const h = Math.max(1, Math.floor(pageHeightPx));
  const [noteDraftText, setNoteDraftText] = useState("");
  const [noteDraftSize, setNoteDraftSize] = useState(14);

  const localDrag = drag?.page === pageNumber ? drag : null;
  const localMarquee =
    selectionMarquee?.page === pageNumber ? selectionMarquee : null;
  const selectedSet = useMemo(
    () => new Set(selectedBalloonIds),
    [selectedBalloonIds]
  );

  /** Only one page should own global listeners while dragging a pin. */
  const attachWindowListeners = !!(
    localDrag ||
    localMarquee ||
    (movingNote &&
      notes.some((n) => n.id === movingNote.id && n.page === pageNumber)) ||
    (movingSelection &&
      annotations.some(
        (a) =>
          movingSelection.ids.includes(a.id) && a.page === pageNumber
      )) ||
    (movingBalloon &&
      annotations.some(
        (a) =>
          movingBalloon.ids.includes(a.id) && a.page === pageNumber
      )) ||
    (resizingRect &&
      annotations.some(
        (a) => a.id === resizingRect.id && a.page === pageNumber
      ))
  );

  const placementActiveHere =
    placing && pageNumber === placingTargetPage;

  useEffect(() => {
    if (!attachWindowListeners) return;
    const stage = stageRef.current;
    if (!stage) return;

    const onWinMove = (e: MouseEvent) => {
      const { nx, ny } = clientToNormalized(stage, w, h, e.clientX, e.clientY);
      if (resizingRect) onMoveRectResizeMove(nx, ny);
      else if (movingBalloon) onMoveBalloonMove(nx, ny);
      else if (movingNote) onMoveNoteMove(nx, ny);
      else if (movingSelection) onMoveSelectionMove(nx, ny);
      else if (localDrag) onRectangleMove(pageNumber, nx, ny);
      else if (localMarquee)
        onSelectionMarqueeMove(pageNumber, nx, ny);
    };

    const onWinUp = (e: MouseEvent) => {
      /** End each gesture only when the matching button is released (avoid RMB ending LMB marquee / toggling selection). */
      if (resizingRect) {
        if (e.button !== 0) return;
        onMoveRectResizeUp();
        return;
      }
      if (movingBalloon) {
        if (e.button !== 2) return;
        onMoveBalloonUp();
        return;
      }
      if (movingNote) {
        if (e.button !== 2) return;
        onMoveNoteUp();
        return;
      }
      if (movingSelection) {
        if (e.button !== 2) return;
        onMoveSelectionUp();
        return;
      }
      const { nx, ny } = clientToNormalized(stage, w, h, e.clientX, e.clientY);
      if (localDrag && placing) {
        if (e.button !== 0) return;
        onRectangleUp(pageNumber, nx, ny);
        return;
      }
      if (localMarquee) {
        if (e.button !== 0) return;
        onSelectionMarqueeUp(pageNumber, nx, ny, e.shiftKey);
      }
    };

    window.addEventListener("mousemove", onWinMove);
    window.addEventListener("mouseup", onWinUp);
    return () => {
      window.removeEventListener("mousemove", onWinMove);
      window.removeEventListener("mouseup", onWinUp);
    };
  }, [
    attachWindowListeners,
    localDrag,
    localMarquee,
    resizingRect,
    movingBalloon,
    movingNote,
    movingSelection,
    annotations,
    notes,
    pageNumber,
    placing,
    w,
    h,
    onRectangleMove,
    onRectangleUp,
    onSelectionMarqueeMove,
    onSelectionMarqueeUp,
    onMoveBalloonMove,
    onMoveBalloonUp,
    onMoveNoteMove,
    onMoveNoteUp,
    onMoveSelectionMove,
    onMoveSelectionUp,
    onMoveRectResizeMove,
    onMoveRectResizeUp
  ]);

  const handlePlacementSurfaceDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (movingBalloon || movingSelection || resizingRect || !placementActiveHere)
        return;
      if (e.evt.button !== 0) return;
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const { nx, ny } = clientToNormalized(
        stage,
        w,
        h,
        e.evt.clientX,
        e.evt.clientY
      );
      onRectangleDown(pageNumber, nx, ny);
    },
    [
      movingBalloon,
      movingSelection,
      resizingRect,
      placementActiveHere,
      w,
      h,
      pageNumber,
      onRectangleDown
    ]
  );

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      const el = scrollRef.current;
      if (!el) return;
      e.evt.preventDefault();
      el.scrollTop += e.evt.deltaY;
    },
    [scrollRef]
  );

  const previewRect = localDrag
    ? {
        x: Math.min(localDrag.startX, localDrag.currentX),
        y: Math.min(localDrag.startY, localDrag.currentY),
        rw: Math.abs(localDrag.currentX - localDrag.startX),
        rh: Math.abs(localDrag.currentY - localDrag.startY)
      }
    : null;

  const previewPx = previewRect
    ? normRectToPx(
        {
          x: previewRect.x,
          y: previewRect.y,
          width: previewRect.rw,
          height: previewRect.rh
        },
        w,
        h
      )
    : null;

  const marqueeRectNorm = localMarquee
    ? {
        x: Math.min(localMarquee.startX, localMarquee.currentX),
        y: Math.min(localMarquee.startY, localMarquee.currentY),
        rw: Math.abs(localMarquee.currentX - localMarquee.startX),
        rh: Math.abs(localMarquee.currentY - localMarquee.startY)
      }
    : null;

  const marqueePx = marqueeRectNorm
    ? normRectToPx(
        {
          x: marqueeRectNorm.x,
          y: marqueeRectNorm.y,
          width: marqueeRectNorm.rw,
          height: marqueeRectNorm.rh
        },
        w,
        h
      )
    : null;

  const backdropListening =
    !addingNote && !(placing && pageNumber === placingTargetPage);

  const handleBackdropMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!backdropListening) return;
      if (e.evt.button !== 0) return;
      onClearSelectedNote();
      const stage = e.target.getStage();
      if (!stage) return;
      const { nx, ny } = clientToNormalized(
        stage,
        w,
        h,
        e.evt.clientX,
        e.evt.clientY
      );
      onSelectionMarqueeDown(pageNumber, nx, ny);
    },
    [
      backdropListening,
      w,
      h,
      pageNumber,
      onClearSelectedNote,
      onSelectionMarqueeDown
    ]
  );

  const activeNoteId = movingNote ? null : selectedNote;
  const activeNote = activeNoteId
    ? notes.find((n) => n.id === activeNoteId) ?? null
    : null;

  useEffect(() => {
    if (!activeNote) return;
    setNoteDraftText(activeNote.text);
    setNoteDraftSize(
      clampNoteSize(activeNote.fontSizePx ?? DEFAULT_NOTE_FONT_SIZE_PX)
    );
  }, [activeNote?.id, activeNote?.text, activeNote?.fontSizePx]);

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[1]"
      style={{ width: w, height: h }}
    >
      <div className="pointer-events-auto h-full w-full">
        <Stage
          ref={stageRef}
          width={w}
          height={h}
          style={{
            cursor: addingNote
              ? "crosshair"
              : placementActiveHere && localDrag
              ? "crosshair"
              : localMarquee
              ? "crosshair"
              : resizingRect
                ? cursorForResizeHandle(resizingRect.handle)
                : movingBalloon || movingSelection || movingNote?.dragging
                  ? "move"
                  : "default"
          }}
          onWheel={handleWheel}
          onMouseLeave={onLeaveSurface}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={w}
              height={h}
              fill="rgba(0,0,0,0)"
              listening={backdropListening}
              onMouseDown={handleBackdropMouseDown}
            />
            {notes.map((note) => {
              const sel = selectedNote === note.id;
              const frame = note.color ?? "#ef4444";
              const { screenX: nx, screenY: ny } = toScreenCoords(
                note.x,
                note.y,
                w,
                h
              );
              const fs = clampNoteSize(note.fontSizePx ?? DEFAULT_NOTE_FONT_SIZE_PX);
              return (
                <Group
                  key={`note-${note.id}`}
                  x={nx}
                  y={ny}
                  onMouseDown={(e) => {
                    if (placing) return;
                    e.cancelBubble = true;
                    const stage = e.target.getStage();
                    if (!stage) return;
                    const { nx: px, ny: py } = clientToNormalized(
                      stage,
                      w,
                      h,
                      e.evt.clientX,
                      e.evt.clientY
                    );
                    if (e.evt.button === 0) {
                      onNoteSelectPointerDown(note.id, px, py);
                    } else if (e.evt.button === 2) {
                      e.evt.preventDefault();
                      onNoteMoveDragStart(note.id, px, py);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault();
                  }}
                  onDblClick={() => onNoteEdit(note.id)}
                >
                  <Rect
                    x={-4}
                    y={-2}
                    width={Math.max(30, note.text.length * (fs * 0.55) + 8)}
                    height={fs + 6}
                    fill="#ffffffd9"
                    stroke={frame}
                    strokeWidth={sel ? 2 : 1}
                    cornerRadius={4}
                  />
                  <Text
                    text={note.text}
                    fontSize={fs}
                    fill={frame}
                    x={0}
                    y={1}
                    listening={false}
                  />
                </Group>
              );
            })}
            {annotations.map((ann) => {
              if (!ann.rect) return null;
              const sel = selectedSet.has(ann.id);
              const box = normRectToPx(ann.rect, w, h);
              const frame = ann.frameColor ?? theme.stroke;
              const showLine = ann.showLeaderLine !== false;
              const { screenX: px, screenY: py } = toScreenCoords(
                ann.x,
                ann.y,
                w,
                h
              );
              const mx = box.x + box.width / 2;
              const my = box.y + box.height / 2;
              const pr = pinRadiusPx(ann);
              const dx = mx - px;
              const dy = my - py;
              const len = Math.hypot(dx, dy) || 1;
              const sx = px + (dx / len) * pr;
              const sy = py + (dy / len) * pr;
              const outDx = sx - mx;
              const outDy = sy - my;
              const hx = box.width / 2;
              const hy = box.height / 2;
              const kx = outDx === 0 ? Number.POSITIVE_INFINITY : hx / Math.abs(outDx);
              const ky = outDy === 0 ? Number.POSITIVE_INFINITY : hy / Math.abs(outDy);
              const k = Math.min(kx, ky);
              const ex = mx + outDx * k;
              const ey = my + outDy * k;
              return (
                <Group key={`g-${ann.id}`}>
                  {showLine ? (
                    <Line
                      points={[sx, sy, ex, ey]}
                      stroke={frame}
                      strokeWidth={sel ? 2.2 : 1.6}
                      lineCap="round"
                      listening={false}
                    />
                  ) : null}
                  <Rect
                    key={`r-${ann.id}`}
                    x={box.x}
                    y={box.y}
                    width={box.width}
                    height={box.height}
                    cornerRadius={2}
                    stroke={frame}
                    strokeWidth={sel ? 2.5 : 2}
                    opacity={1}
                    fill={sel ? `${frame}12` : "rgba(0,0,0,0)"}
                    onMouseDown={(e) => {
                      if (placing) return;
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      if (!stage) return;
                      const { nx, ny } = clientToNormalized(
                        stage,
                        w,
                        h,
                        e.evt.clientX,
                        e.evt.clientY
                      );
                      if (e.evt.button === 0) {
                        onBalloonRectSelectPointerDown(ann.id, nx, ny, {
                          ctrl: e.evt.ctrlKey,
                          meta: e.evt.metaKey,
                          shift: e.evt.shiftKey
                        });
                      } else if (e.evt.button === 2) {
                        e.evt.preventDefault();
                        onSelectionMoveDragStart(ann.id, nx, ny);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.evt.preventDefault();
                    }}
                  />
                </Group>
              );
            })}
            {previewPx ? (
              <Rect
                x={previewPx.x}
                y={previewPx.y}
                width={previewPx.width}
                height={previewPx.height}
                cornerRadius={2}
                stroke={previewFrameColor}
                strokeWidth={2}
                fill={`${previewFrameColor}18`}
              />
            ) : null}
            {marqueePx ? (
              <Rect
                x={marqueePx.x}
                y={marqueePx.y}
                width={marqueePx.width}
                height={marqueePx.height}
                cornerRadius={2}
                stroke={theme.stroke}
                strokeWidth={1.5}
                dash={[6, 4]}
                fill={`${theme.previewFill}`}
              />
            ) : null}
          </Layer>

          <Layer>
            {annotations.map((ann) => {
              const sel = selectedSet.has(ann.id);
              const { screenX: cx, screenY: cy } = toScreenCoords(
                ann.x,
                ann.y,
                w,
                h
              );
              const r = pinRadiusPx(ann);
              const noteColor =
                ann.noteColor ?? ann.frameColor ?? theme.pinText;
              const fontSize = Math.max(
                6,
                Math.min(96, clampNoteSize(ann.noteFontSizePx ?? DEFAULT_NOTE_FONT_SIZE_PX))
              );
              return (
                <Group
                  key={`p-${ann.id}`}
                  x={cx}
                  y={cy}
                  listening={!placing}
                  onMouseDown={(e) => {
                    e.cancelBubble = true;
                    if (placing) return;
                    const stage = e.target.getStage();
                    if (!stage) return;
                    const { nx, ny } = clientToNormalized(
                      stage,
                      w,
                      h,
                      e.evt.clientX,
                      e.evt.clientY
                    );
                    if (e.evt.button === 0) {
                      onPinSelectPointerDown(ann.id, nx, ny, {
                        ctrl: e.evt.ctrlKey,
                        meta: e.evt.metaKey,
                        shift: e.evt.shiftKey
                      });
                    } else if (e.evt.button === 2) {
                      e.evt.preventDefault();
                      onPinMoveDragStart(ann.id, nx, ny);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault();
                  }}
                >
                  <BalloonPinShape ann={ann} selected={sel} r={r} theme={theme} />
                  <Text
                    text={String(ann.balloonNumber)}
                    fontSize={fontSize}
                    fontStyle="bold"
                    fill={noteColor}
                    width={r * 2.2}
                    x={-r * 1.1}
                    y={-fontSize / 2 - 1}
                    align="center"
                    listening={false}
                  />
                </Group>
              );
            })}
          </Layer>

          {addingNote ? (
            <Layer>
              <Rect
                x={0}
                y={0}
                width={w}
                height={h}
                fill="rgba(0,0,0,0.001)"
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  const stage = e.target.getStage();
                  if (!stage) return;
                  const { nx, ny } = clientToNormalized(
                    stage,
                    w,
                    h,
                    e.evt.clientX,
                    e.evt.clientY
                  );
                  onNoteCreate(pageNumber, nx, ny);
                }}
              />
            </Layer>
          ) : null}
          {placementActiveHere && !movingBalloon && !resizingRect ? (
            <Layer>
              <Rect
                x={0}
                y={0}
                width={w}
                height={h}
                fill="rgba(0,0,0,0.001)"
                onMouseDown={handlePlacementSurfaceDown}
              />
            </Layer>
          ) : null}

          <Layer listening={!placing && !addingNote}>
            {(() => {
              if (placing || addingNote || movingBalloon || movingSelection) {
                return null;
              }
              const primary =
                selectedBalloonIds.length > 0
                  ? selectedBalloonIds[selectedBalloonIds.length - 1]!
                  : null;
              if (!primary) return null;
              const ann = annotations.find((a) => a.id === primary && a.rect);
              if (!ann?.rect) return null;
              const box = normRectToPx(ann.rect, w, h);
              const frame = ann.frameColor ?? theme.stroke;
              const hitR = 6;
              const handles: {
                handle: RectResizeHandle;
                cx: number;
                cy: number;
              }[] = [
                { handle: "nw", cx: box.x, cy: box.y },
                { handle: "n", cx: box.x + box.width / 2, cy: box.y },
                { handle: "ne", cx: box.x + box.width, cy: box.y },
                { handle: "e", cx: box.x + box.width, cy: box.y + box.height / 2 },
                { handle: "se", cx: box.x + box.width, cy: box.y + box.height },
                { handle: "s", cx: box.x + box.width / 2, cy: box.y + box.height },
                { handle: "sw", cx: box.x, cy: box.y + box.height },
                { handle: "w", cx: box.x, cy: box.y + box.height / 2 }
              ];
              return handles.map(({ handle, cx, cy }) => (
                <Circle
                  key={`rh-${primary}-${handle}`}
                  x={cx}
                  y={cy}
                  radius={hitR}
                  fill="#ffffff"
                  stroke={frame}
                  strokeWidth={2}
                  onMouseDown={(e) => {
                    if (placing) return;
                    e.cancelBubble = true;
                    const stage = e.target.getStage();
                    if (!stage) return;
                    if (e.evt.button !== 0) return;
                    e.evt.preventDefault();
                    const { nx, ny } = clientToNormalized(
                      stage,
                      w,
                      h,
                      e.evt.clientX,
                      e.evt.clientY
                    );
                    onRectResizePointerDown(primary, handle, nx, ny);
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault();
                  }}
                />
              ));
            })()}
          </Layer>
        </Stage>
      </div>
      {activeNote ? (
        <div
          className="pointer-events-auto absolute z-10 rounded-md border bg-card p-2 shadow-lg"
          style={{
            left: `${Math.min(
              w - 210,
              Math.max(8, activeNote.x * w + 12)
            )}px`,
            top: `${Math.min(
              h - 116,
              Math.max(8, activeNote.y * h + 12)
            )}px`,
            width: 200
          }}
        >
          <div className="mb-1 text-[11px] text-muted-foreground">
            Note editor
          </div>
          <input
            className="mb-1 h-8 w-full rounded border border-input bg-background px-2 text-xs"
            value={noteDraftText}
            onChange={(e) => setNoteDraftText(e.target.value)}
            onBlur={() =>
              onNoteUpdate(activeNote.id, {
                text: noteDraftText.trim() || "Note"
              })
            }
          />
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              className="h-7 w-7 rounded border border-input text-xs"
              onClick={() => {
                const v = stepBalloonSizeDropdownPx(noteDraftSize, -1);
                setNoteDraftSize(v);
                onNoteUpdate(activeNote.id, { fontSizePx: v });
              }}
            >
              -
            </button>
            <input
              type="number"
              min={2}
              max={108}
              className="h-7 w-16 rounded border border-input bg-background px-1 text-center text-xs"
              value={noteDraftSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                const next = clampNoteSize(v);
                setNoteDraftSize(next);
                onNoteUpdate(activeNote.id, { fontSizePx: next });
              }}
            />
            <button
              type="button"
              className="h-7 w-7 rounded border border-input text-xs"
              onClick={() => {
                const v = stepBalloonSizeDropdownPx(noteDraftSize, 1);
                setNoteDraftSize(v);
                onNoteUpdate(activeNote.id, { fontSizePx: v });
              }}
            >
              +
            </button>
            <span className="text-[11px] text-muted-foreground">size</span>
          </div>
          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="h-7 flex-1 rounded border border-input text-xs"
              onClick={() =>
                onNoteUpdate(activeNote.id, {
                  text: noteDraftText.trim() || "Note",
                  fontSizePx: noteDraftSize
                })
              }
            >
              Save
            </button>
            <button
              type="button"
              className="h-7 flex-1 rounded border border-destructive text-xs text-destructive"
              onClick={() => onNoteDelete(activeNote.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
