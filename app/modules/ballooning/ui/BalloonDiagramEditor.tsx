import { Button } from "~/components/ui/button";
import { ToolsSidebar } from "~/components/ui/tools-sidebar";
import { HStack, VStack } from "~/components/ui/stack";
import {
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "~/components/ui/table";
import { Input } from "~/components/ui/input";
import { balloonCharacteristicType } from "~/modules/ballooning/ballooning.models";
import { useBalloonAnnotations } from "~/modules/ballooning/hooks/useBalloonAnnotations";
import {
  clamp01,
  resizeNormRect,
  type BalloonRectResizeDragState,
  type RectResizeHandle
} from "~/modules/ballooning/hooks/usePageSpaceCoords";
import {
  BALLOON_FRAME_COLOR_OPTIONS,
  BALLOON_NOTE_COLOR_OPTIONS,
  BALLOON_PIN_SHAPES,
  BALLOON_SIZE_DROPDOWN_PX,
  clampNoteSize,
  clampPinSize,
  DEFAULT_FRAME_COLOR,
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_FONT_SIZE_PX,
  DEFAULT_PIN_SHAPE,
  DEFAULT_PIN_SIZE_PX
} from "~/modules/ballooning/balloonToolbar.constants";
import type {
  BalloonAnnotation,
  BalloonDrawingNote,
  BalloonFeature,
  BalloonFeatureCharacteristic,
  BallooningDiagramContent,
  BalloonPinShape
} from "~/modules/ballooning/ballooning.types";
import { path } from "~/utils/path";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuLoader,
  LuMessageSquarePlus,
  LuChevronDown,
  LuChevronUp,
  LuCircleHelp,
  LuMaximize2,
  LuRectangleHorizontal,
  LuSave,
  LuTrash,
  LuUpload,
  LuZoomIn,
  LuZoomOut
} from "react-icons/lu";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { BalloonPdfClientOnly } from "./BalloonPdfClientOnly";
import type {
  BalloonKonvaTheme,
  BalloonPageKonvaOverlayProps,
  DragStateNormalized,
  MovingBalloonNormalized,
  MovingSelectionNormalized
} from "./BalloonPageKonvaOverlay";
import type { BallooningPdfPageOverlayContext } from "./BallooningPdfJsViewport";

type BalloonDiagramEditorProps = {
  diagramId: string;
  name: string;
  content: BallooningDiagramContent | null;
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const MIXED = "__mixed__" as const;

function uniformLeaderLine(
  anns: BalloonAnnotation[]
): "show" | "hide" | typeof MIXED {
  if (anns.length === 0) return "show";
  const vs = anns.map((a) => (a.showLeaderLine === false ? "hide" : "show"));
  const f = vs[0]!;
  return vs.every((x) => x === f) ? f : MIXED;
}

function uniformStrings(values: string[]): string | typeof MIXED {
  if (values.length === 0) return "";
  const f = values[0]!;
  return values.every((x) => x === f) ? f : MIXED;
}

function uniformNumbers(values: number[]): number | typeof MIXED {
  if (values.length === 0) return MIXED;
  const f = values[0]!;
  return values.every((x) => x === f) ? f : MIXED;
}

function uniformCharacteristic(
  feats: BalloonFeature[]
): BalloonFeatureCharacteristic | typeof MIXED {
  if (feats.length === 0) return "Basic";
  const vs = feats.map((f) => f.characteristicType ?? "Basic");
  const f0 = vs[0]!;
  return vs.every((x) => x === f0)
    ? (f0 as BalloonFeatureCharacteristic)
    : MIXED;
}

const defaultKonvaTheme: BalloonKonvaTheme = {
  stroke: "hsl(240 5.9% 10%)",
  rectFill: "hsl(240 5.9% 10% / 0.07)",
  rectFillSelected: "hsl(240 5.9% 10% / 0.15)",
  previewFill: "hsl(240 5.9% 10% / 0.12)",
  pinFill: "#ffffff",
  pinFillSelected: "hsl(240 5.9% 10%)",
  pinText: "hsl(240 5.9% 10%)",
  pinTextSelected: "hsl(0 0% 98%)"
};

/** Short hover hints (plain language). */
const diagramEditorTooltips = {
  helpToggle: "Show or hide step-by-step help on the right.",
  balloonToolsHeading:
    "Change colors, line, tag shape, and number for the selected callout(s).",
  sidebarFrameColor: "Outline color on every selected callout.",
  sidebarPinShape: "Tag shape on every selected callout.",
  sidebarFeatureType: "Inspection row type on every selected callout.",
  sidebarLeaderLine: "Line from tag to box on every selected callout.",
  sidebarPinSize: "Tag size on every selected callout.",
  sidebarNumberColor: "Number color on every selected callout.",
  sidebarNumberSize: "Number size on every selected callout.",
  addBalloon: "Turn on, then drag on the drawing to mark a spot and add a number.",
  addNote: "Turn on, then click the drawing to leave a short note.",
  replacePdf: "Use a different drawing file for this job.",
  openPdf: "Choose the drawing file to work on.",
  save: "Store your markup and table on this diagram.",
  zoomOut: "See more of the sheet at once.",
  zoomIn: "Get a closer look at details.",
  zoomFit: "Back to normal zoom.",
  nextNumber: "Which number the next new callout will use.",
  placementType: "What kind of row goes in the list for the next callout.",
  showLeaderLine: "Draw a line from the number to the box, or tag only.",
  frameColor: "Color for the next new callout you place.",
  pinShape: "Tag shape for the next new callout.",
  pinSize: "Tag size for the next new callout.",
  noteColor: "Number color for the next new callout.",
  noteFontSize: "Number size for the next new callout.",
  placementPage: "Which sheet you add to when the drawing has several pages.",
  tableExpand: "Show more or less of the list under the drawing.",
  rowDelete: "Remove this callout and its row.",
  duplicateSelection: "Copy the selected callouts.",
  deleteSelection: "Remove the selected callouts and their rows.",
  openPdfEmpty: "Open your drawing here to get started."
} as const;

function DiagramEditorHelpPanel() {
  return (
    <VStack className="gap-5 text-xs leading-relaxed text-muted-foreground">
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">Get started</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>Open your drawing with Open or Replace.</li>
          <li>Press Save when you’re done or switching tasks.</li>
        </ul>
      </section>
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">Balloons</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>Turn Add Balloon on, then drag a box on the part you care about.</li>
          <li>Click a callout to select it. Shift-click adds another to the selection.</li>
          <li>Drag the number or the box to move it. Use the small handles on the box to resize.</li>
          <li>Use the list under the drawing to type dimensions and notes.</li>
        </ul>
      </section>
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">Notes</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>Turn Add Note on, then click where the note should sit.</li>
          <li>Click the note to change text or colors in the side panel.</li>
        </ul>
      </section>
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">Top bar</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>Next number, colors, and tag options apply to the next callout you add.</li>
          <li>Page picks which sheet you’re working on when there are multiple.</li>
          <li>Zoom makes the drawing bigger or smaller so you can see clearly.</li>
        </ul>
      </section>
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">When a balloon is selected</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>The Balloon tools panel opens on the right to change that callout.</li>
          <li>Duplicate or Delete at the bottom of that panel works on everything selected.</li>
        </ul>
      </section>
    </VStack>
  );
}

/** Drawing viewer with callouts and an inspection list. */
export default function BalloonDiagramEditor({
  diagramId,
  name,
  content
}: BalloonDiagramEditorProps) {
  const fetcher = useFetcher<{ success: boolean; message?: string }>();

  const {
    annotations,
    setAnnotations,
    addBalloon,
    removeBalloon,
    getBalloonsForPage
  } = useBalloonAnnotations({
    diagramId,
    initialAnnotations: content?.annotations
  });

  const [pdfUrl, setPdfUrl] = useState<string>(content?.pdfUrl ?? "");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [helpSidebarOpen, setHelpSidebarOpen] = useState(false);
  const [features, setFeatures] = useState<BalloonFeature[]>(
    content?.features ?? []
  );
  const [notes, setNotes] = useState<BalloonDrawingNote[]>(
    content?.notes ?? []
  );
  const [placing, setPlacing] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [selectedBalloonIds, setSelectedBalloonIds] = useState<string[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragStateNormalized>(null);
  const [selectionMarquee, setSelectionMarquee] =
    useState<DragStateNormalized>(null);
  const selectionMarqueeRef = useRef(selectionMarquee);
  selectionMarqueeRef.current = selectionMarquee;
  const [movingBalloon, setMovingBalloon] =
    useState<MovingBalloonNormalized>(null);
  const [movingSelection, setMovingSelection] =
    useState<MovingSelectionNormalized>(null);
  const [resizingRect, setResizingRect] =
    useState<BalloonRectResizeDragState | null>(null);
  const [movingNote, setMovingNote] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const [PageKonva, setPageKonva] =
    useState<ComponentType<BalloonPageKonvaOverlayProps> | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [pdfLayout, setPdfLayout] = useState<{
    numPages: number;
    pageHeightOverWidth: number;
  } | null>(null);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [placementPage, setPlacementPage] = useState(1);
  const [nextPlacementNumber, setNextPlacementNumber] = useState(1);
  const [placementCharacteristic, setPlacementCharacteristic] =
    useState<BalloonFeatureCharacteristic>("Basic");
  const [showLeaderLine, setShowLeaderLine] = useState<"show" | "hide">("show");
  const [frameColor, setFrameColor] = useState<string>(DEFAULT_FRAME_COLOR);
  const [pinShape, setPinShape] = useState<BalloonPinShape>(DEFAULT_PIN_SHAPE);
  const [pinSizePx, setPinSizePx] = useState(DEFAULT_PIN_SIZE_PX);
  const [noteColor, setNoteColor] = useState<string>(DEFAULT_NOTE_COLOR);
  const [noteFontSizePx, setNoteFontSizePx] = useState(
    DEFAULT_NOTE_FONT_SIZE_PX
  );
  const [konvaTheme, setKonvaTheme] =
    useState<BalloonKonvaTheme>(defaultKonvaTheme);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfScrollPortRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableBodyRef = useRef<HTMLDivElement>(null);
  const movingBalloonRef = useRef(movingBalloon);
  movingBalloonRef.current = movingBalloon;
  const selectedBalloonIdsRef = useRef(selectedBalloonIds);
  selectedBalloonIdsRef.current = selectedBalloonIds;
  const movingSelectionRef = useRef(movingSelection);
  movingSelectionRef.current = movingSelection;
  const resizingRectRef = useRef(resizingRect);
  resizingRectRef.current = resizingRect;
  const movingNoteRef = useRef(movingNote);
  movingNoteRef.current = movingNote;
  const [tableExpanded, setTableExpanded] = useState(false);
  const [userClosedBalloonDrawer, setUserClosedBalloonDrawer] =
    useState(false);
  const prevSelectionKeyRef = useRef<string | null>(null);
  /** Right-drag move may call `setSelectedBalloonIds` only to attach the drag target; do not auto-open the tools column. */
  const skipDrawerOpenForNextSelectionChangeRef = useRef(false);

  const selectionKey = useMemo(
    () => [...selectedBalloonIds].sort().join("\0"),
    [selectedBalloonIds]
  );

  useEffect(() => {
    if (selectedBalloonIds.length === 0) {
      setUserClosedBalloonDrawer(false);
      prevSelectionKeyRef.current = null;
      return;
    }
    if (prevSelectionKeyRef.current !== selectionKey) {
      if (skipDrawerOpenForNextSelectionChangeRef.current) {
        skipDrawerOpenForNextSelectionChangeRef.current = false;
        prevSelectionKeyRef.current = selectionKey;
        setUserClosedBalloonDrawer(true);
        return;
      }
      setUserClosedBalloonDrawer(false);
      prevSelectionKeyRef.current = selectionKey;
    }
  }, [selectionKey, selectedBalloonIds.length]);

  const balloonActionsPopoverOpen =
    selectedBalloonIds.length > 0 && !userClosedBalloonDrawer;

  useEffect(() => {
    let cancelled = false;
    import("./BalloonPageKonvaOverlay").then((m) => {
      if (!cancelled) setPageKonva(() => m.BalloonPageKonvaOverlay);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFeatures(content?.features ?? []);
    setNotes(content?.notes ?? []);
  }, [diagramId, content?.features, content?.notes]);

  useEffect(() => {
    if (!pdfFile) {
      setPdfObjectUrl(null);
      return;
    }
    const u = URL.createObjectURL(pdfFile);
    setPdfObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pdfFile]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr && (cr.width > 0 || cr.height > 0)) {
        setContainerSize({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (fetcher.data?.success === true) {
      toast.success("Diagram saved");
    } else if (fetcher.data?.success === false) {
      toast.error(fetcher.data.message ?? "Failed to save diagram");
    }
  }, [fetcher.data]);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const raw = cs.getPropertyValue("--primary").trim();
    const rawFg = cs.getPropertyValue("--primary-foreground").trim();
    const p = raw || "240 5.9% 10%";
    const pf = rawFg || "0 0% 98%";
    setKonvaTheme({
      stroke: `hsl(${p})`,
      rectFill: `hsl(${p} / 0.07)`,
      rectFillSelected: `hsl(${p} / 0.15)`,
      previewFill: `hsl(${p} / 0.12)`,
      pinFill: "#ffffff",
      pinFillSelected: `hsl(${p})`,
      pinText: `hsl(${p})`,
      pinTextSelected: `hsl(${pf})`
    });
  }, []);

  const autoNextBalloonNumber = useMemo(() => {
    if (annotations.length === 0) return 1;
    return Math.max(...annotations.map((a) => a.balloonNumber)) + 1;
  }, [annotations]);

  useEffect(() => {
    setNextPlacementNumber(autoNextBalloonNumber);
  }, [diagramId, autoNextBalloonNumber]);

  useEffect(() => {
    if (pdfLayout && placementPage > pdfLayout.numPages) {
      setPlacementPage(Math.max(1, pdfLayout.numPages));
    }
  }, [pdfLayout, placementPage]);

  const primarySelectedBalloonId =
    selectedBalloonIds.length > 0
      ? selectedBalloonIds[selectedBalloonIds.length - 1]
      : null;

  useEffect(() => {
    if (!primarySelectedBalloonId) return;
    const row = tableBodyRef.current?.querySelector<HTMLTableRowElement>(
      `[data-feature-id="${primarySelectedBalloonId}"]`
    );
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [primarySelectedBalloonId]);

  const handleRectangleDown = useCallback(
    (page: number, nx: number, ny: number) => {
      if (
        !placing ||
        movingBalloonRef.current ||
        movingSelectionRef.current ||
        resizingRectRef.current
      ) {
        return;
      }
      if (page !== placementPage) return;
      setDrag({
        page,
        startX: nx,
        startY: ny,
        currentX: nx,
        currentY: ny
      });
    },
    [placing, placementPage]
  );

  const handleRectangleMove = useCallback(
    (page: number, nx: number, ny: number) => {
      setDrag((d) =>
        d && d.page === page ? { ...d, currentX: nx, currentY: ny } : d
      );
    },
    []
  );

  const handleMoveBalloonMove = useCallback(
    (nx: number, ny: number) => {
      const mb = movingBalloonRef.current;
      if (!mb) return;
      const primaryStart = mb.startById[mb.primaryId];
      if (!primaryStart) return;
      const newPrimaryX = clamp01(nx - mb.offsetX);
      const newPrimaryY = clamp01(ny - mb.offsetY);
      const dx = newPrimaryX - primaryStart.x;
      const dy = newPrimaryY - primaryStart.y;
      setAnnotations((prev) =>
        prev.map((a) => {
          if (!mb.ids.includes(a.id)) return a;
          const s = mb.startById[a.id];
          if (!s) return a;
          return {
            ...a,
            x: clamp01(s.x + dx),
            y: clamp01(s.y + dy),
            rect:
              s.rect != null
                ? { ...s.rect }
                : a.rect
          };
        })
      );
    },
    [setAnnotations]
  );

  const handleMoveBalloonUp = useCallback(() => {
    setMovingBalloon(null);
  }, []);

  const handleBalloonRectSelectPointerDown = useCallback(
    (
      id: string,
      _nx: number,
      _ny: number,
      mod: { ctrl: boolean; meta: boolean; shift: boolean }
    ) => {
      if (placing) return;
      setSelectedNote(null);
      const ann = annotations.find((a) => a.id === id);
      if (!ann?.rect) return;

      if (mod.ctrl || mod.meta) {
        setSelectedBalloonIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
        return;
      }

      let nextSel = selectedBalloonIdsRef.current;
      if (mod.shift) {
        nextSel = nextSel.includes(id) ? nextSel : [...nextSel, id];
      } else if (!nextSel.includes(id) || nextSel.length === 1) {
        nextSel = [id];
      }
      setSelectedBalloonIds(nextSel);
    },
    [placing, annotations]
  );

  const handleSelectionMoveDragStart = useCallback(
    (id: string, nx: number, ny: number) => {
      if (placing) return;
      setSelectedNote(null);
      const ann = annotations.find((a) => a.id === id);
      if (!ann?.rect) return;

      let nextSel = selectedBalloonIdsRef.current;
      if (!nextSel.includes(id)) {
        skipDrawerOpenForNextSelectionChangeRef.current = true;
        nextSel = [id];
        setSelectedBalloonIds(nextSel);
      }

      const idsToMove =
        nextSel.length > 1 && nextSel.includes(id)
          ? nextSel.filter((bid) => {
              const a = annotations.find((x) => x.id === bid);
              return !!a?.rect && a.page === ann.page;
            })
          : [id];

      const startRectById = Object.fromEntries(
        idsToMove.map((bid) => {
          const a = annotations.find((x) => x.id === bid)!;
          const r = a.rect!;
          return [bid, { x: r.x, y: r.y, width: r.width, height: r.height }];
        })
      );

      setMovingSelection({
        primaryId: id,
        ids: idsToMove,
        startRectById,
        offsetX: nx - ann.rect.x,
        offsetY: ny - ann.rect.y
      });
    },
    [placing, annotations]
  );

  const handleMoveSelectionMove = useCallback(
    (nx: number, ny: number) => {
      const ms = movingSelectionRef.current;
      if (!ms) return;
      const primaryStart = ms.startRectById[ms.primaryId];
      if (!primaryStart) return;
      const maxX = Math.max(0, 1 - primaryStart.width);
      const maxY = Math.max(0, 1 - primaryStart.height);
      const newPrimaryX = Math.min(maxX, Math.max(0, nx - ms.offsetX));
      const newPrimaryY = Math.min(maxY, Math.max(0, ny - ms.offsetY));
      const dx = newPrimaryX - primaryStart.x;
      const dy = newPrimaryY - primaryStart.y;
      setAnnotations((prev) =>
        prev.map((a) => {
          if (!ms.ids.includes(a.id) || !a.rect) return a;
          const s = ms.startRectById[a.id];
          if (!s) return a;
          const maxXa = Math.max(0, 1 - a.rect.width);
          const maxYa = Math.max(0, 1 - a.rect.height);
          const newX = Math.min(maxXa, Math.max(0, s.x + dx));
          const newY = Math.min(maxYa, Math.max(0, s.y + dy));
          return {
            ...a,
            rect: { ...a.rect, x: newX, y: newY }
          };
        })
      );
    },
    [setAnnotations]
  );

  const handleMoveSelectionUp = useCallback(() => {
    setMovingSelection(null);
  }, []);

  const handleRectResizePointerDown = useCallback(
    (id: string, handle: RectResizeHandle, _nx: number, _ny: number) => {
      if (placing) return;
      const ann = annotations.find((a) => a.id === id);
      if (!ann?.rect) return;
      setSelectedNote(null);
      setResizingRect({
        id,
        handle,
        start: { ...ann.rect }
      });
    },
    [placing, annotations]
  );

  const handleMoveRectResizeMove = useCallback(
    (nx: number, ny: number) => {
      const rr = resizingRectRef.current;
      if (!rr) return;
      const next = resizeNormRect(rr.handle, rr.start, nx, ny);
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === rr.id
            ? {
                ...a,
                rect: {
                  x: next.x,
                  y: next.y,
                  width: next.width,
                  height: next.height
                }
              }
            : a
        )
      );
    },
    [setAnnotations]
  );

  const handleMoveRectResizeUp = useCallback(() => {
    setResizingRect(null);
  }, []);

  const handleNoteCreate = useCallback(
    (page: number, nx: number, ny: number) => {
      const id = generateId();
      setNotes((prev) => [
        ...prev,
        {
          id,
          page,
          x: clamp01(nx),
          y: clamp01(ny),
          text: "Note",
          color: frameColor,
          fontSizePx: clampNoteSize(noteFontSizePx)
        }
      ]);
      setSelectedNote(id);
      setSelectedBalloonIds([]);
      setAddingNote(false);
    },
    [frameColor, noteFontSizePx]
  );

  const handleNoteSelectPointerDown = useCallback(
    (id: string, _nx: number, _ny: number) => {
      setSelectedNote(id);
      setSelectedBalloonIds([]);
    },
    []
  );

  const handleNoteMoveDragStart = useCallback(
    (id: string, nx: number, ny: number) => {
      const n = notes.find((it) => it.id === id);
      if (!n) return;
      setSelectedNote(id);
      setSelectedBalloonIds([]);
      setMovingNote({
        id,
        offsetX: nx - n.x,
        offsetY: ny - n.y,
        startX: nx,
        startY: ny,
        dragging: false
      });
    },
    [notes]
  );

  const handleMoveNoteMove = useCallback((nx: number, ny: number) => {
    const mn = movingNoteRef.current;
    if (!mn) return;
    if (!mn.dragging) {
      const d = Math.hypot(nx - mn.startX, ny - mn.startY);
      if (d < 0.004) return;
      setMovingNote((curr) =>
        curr && curr.id === mn.id ? { ...curr, dragging: true } : curr
      );
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === mn.id
          ? { ...n, x: clamp01(nx - mn.offsetX), y: clamp01(ny - mn.offsetY) }
          : n
      )
    );
  }, []);

  const handleMoveNoteUp = useCallback(() => {
    setMovingNote(null);
  }, []);

  const handleNoteEdit = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, text: (window.prompt("Edit note", n.text) ?? n.text).trim() || n.text }
          : n
      )
    );
  }, []);

  const handleNoteUpdate = useCallback(
    (
      id: string,
      patch: Partial<Pick<BalloonDrawingNote, "text" | "fontSizePx" | "color">>
    ) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...patch } : n))
      );
    },
    []
  );

  const handleNoteDelete = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedNote((curr) => (curr === id ? null : curr));
  }, []);

  const handlePinSelectPointerDown = useCallback(
    (
      id: string,
      _nx: number,
      _ny: number,
      mod: { ctrl: boolean; meta: boolean; shift: boolean }
    ) => {
      if (placing) return;
      setSelectedNote(null);
      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;

      if (mod.ctrl || mod.meta) {
        setSelectedBalloonIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
        return;
      }

      let nextSel = selectedBalloonIdsRef.current;
      if (mod.shift) {
        nextSel = nextSel.includes(id) ? nextSel : [...nextSel, id];
      } else if (!nextSel.includes(id) || nextSel.length === 1) {
        nextSel = [id];
      }
      setSelectedBalloonIds(nextSel);
    },
    [placing, annotations]
  );

  const handlePinMoveDragStart = useCallback(
    (id: string, nx: number, ny: number) => {
      if (placing) return;
      setSelectedNote(null);
      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;

      let nextSel = selectedBalloonIdsRef.current;
      if (!nextSel.includes(id)) {
        skipDrawerOpenForNextSelectionChangeRef.current = true;
        nextSel = [id];
        setSelectedBalloonIds(nextSel);
      }

      const idsToMove =
        nextSel.length > 1 && nextSel.includes(id)
          ? nextSel.filter((bid) => {
              const a = annotations.find((x) => x.id === bid);
              return a && a.page === ann.page;
            })
          : [id];

      const startById = Object.fromEntries(
        idsToMove.map((bid) => {
          const a = annotations.find((x) => x.id === bid)!;
          return [
            bid,
            {
              x: a.x,
              y: a.y,
              rect: a.rect ? { ...a.rect } : null
            }
          ];
        })
      );

      setMovingBalloon({
        primaryId: id,
        ids: idsToMove,
        startById,
        offsetX: nx - ann.x,
        offsetY: ny - ann.y
      });
    },
    [placing, annotations]
  );

  const handleRectangleUp = useCallback(
    (page: number, nx: number, ny: number) => {
      if (!drag || !placing || drag.page !== page) return;

      const rx = Math.min(drag.startX, nx);
      const ry = Math.min(drag.startY, ny);
      const rw = Math.abs(nx - drag.startX);
      const rh = Math.abs(ny - drag.startY);

      if (rw < 0.005 || rh < 0.005) {
        setDrag(null);
        return;
      }

      const num = Math.max(1, Math.floor(nextPlacementNumber));
      if (
        annotations.some((a) => a.balloonNumber === num) ||
        features.some((f) => f.balloonNumber === num)
      ) {
        toast.error(`Balloon number ${num} is already in use`);
        setDrag(null);
        return;
      }

      const id = generateId();
      const pinSize = clampPinSize(pinSizePx);
      const noteSize = clampNoteSize(noteFontSizePx);

      addBalloon({
        id,
        balloonNumber: num,
        page: placementPage,
        x: clamp01(rx + rw),
        y: clamp01(ry),
        rect: {
          x: clamp01(rx),
          y: clamp01(ry),
          width: clamp01(rw),
          height: clamp01(rh)
        },
        showLeaderLine: showLeaderLine === "show",
        frameColor,
        pinShape,
        pinSizePx: pinSize,
        noteColor,
        noteFontSizePx: noteSize
      });
      setFeatures((prev) => [
        ...prev,
        {
          id,
          balloonNumber: num,
          description: "",
          nominalValue: null,
          tolerancePlus: null,
          toleranceMinus: null,
          unitOfMeasureCode: null,
          characteristicType: placementCharacteristic,
          sortOrder: num
        }
      ]);
      setNextPlacementNumber(num + 1);
      setDrag(null);
    },
    [
      drag,
      placing,
      nextPlacementNumber,
      annotations,
      features,
      placementPage,
      showLeaderLine,
      frameColor,
      pinShape,
      pinSizePx,
      noteColor,
      noteFontSizePx,
      placementCharacteristic,
      addBalloon
    ]
  );

  const handleSelectionMarqueeDown = useCallback(
    (page: number, nx: number, ny: number) => {
      if (
        placing ||
        movingBalloonRef.current ||
        movingSelectionRef.current ||
        resizingRectRef.current ||
        movingNoteRef.current
      ) {
        return;
      }
      setSelectionMarquee({
        page,
        startX: nx,
        startY: ny,
        currentX: nx,
        currentY: ny
      });
    },
    [placing]
  );

  const handleSelectionMarqueeMove = useCallback(
    (page: number, nx: number, ny: number) => {
      setSelectionMarquee((m) =>
        m && m.page === page ? { ...m, currentX: nx, currentY: ny } : m
      );
    },
    []
  );

  const handleSelectionMarqueeUp = useCallback(
    (page: number, nx: number, ny: number, additive: boolean) => {
      const m = selectionMarqueeRef.current;
      if (!m || m.page !== page) return;

      const rx = Math.min(m.startX, nx);
      const ry = Math.min(m.startY, ny);
      const rw = Math.abs(nx - m.startX);
      const rh = Math.abs(ny - m.startY);

      setSelectionMarquee(null);

      if (rw < 0.004 && rh < 0.004) {
        if (!additive) setSelectedBalloonIds([]);
        return;
      }

      const x2 = rx + rw;
      const y2 = ry + rh;

      const normIntersects = (
        ax: number,
        ay: number,
        aw: number,
        ah: number
      ) => !(ax + aw < rx || ax > x2 || ay + ah < ry || ay > y2);

      /** ~pin footprint in normalized page space */
      const pinSlop = 0.02;
      const pinNormHit = (ax: number, ay: number) =>
        ax + pinSlop >= rx &&
        ax - pinSlop <= x2 &&
        ay + pinSlop >= ry &&
        ay - pinSlop <= y2;

      const hits = annotations.filter((a) => {
        if (a.page !== page) return false;
        if (
          a.rect &&
          normIntersects(a.rect.x, a.rect.y, a.rect.width, a.rect.height)
        ) {
          return true;
        }
        return pinNormHit(a.x, a.y);
      });

      const hitIds = hits.map((a) => a.id);

      if (additive) {
        setSelectedBalloonIds((prev) => [...new Set([...prev, ...hitIds])]);
      } else {
        setSelectedBalloonIds(hitIds);
      }
    },
    [annotations]
  );

  const handleLeaveKonvaSurface = useCallback(() => {
    if (drag) setDrag(null);
    if (movingBalloonRef.current) setMovingBalloon(null);
    if (movingSelectionRef.current) setMovingSelection(null);
    if (resizingRectRef.current) setResizingRect(null);
    if (movingNoteRef.current) setMovingNote(null);
    setSelectionMarquee(null);
  }, [drag]);

  const removeAnnotation = useCallback(
    (id: string) => {
      removeBalloon(id);
      setFeatures((prev) => prev.filter((f) => f.id !== id));
      setSelectedBalloonIds((prev) => prev.filter((x) => x !== id));
    },
    [removeBalloon]
  );

  const updateFeature = useCallback(
    (id: string, field: keyof BalloonFeature, value: unknown) => {
      setFeatures((prev) =>
        prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
      );
    },
    []
  );

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("annotations", JSON.stringify(annotations));
    formData.set("features", JSON.stringify(features));
    formData.set("notes", JSON.stringify(notes));
    if (pdfUrl) formData.set("pdfUrl", pdfUrl);
    fetcher.submit(formData, {
      method: "post",
      action: `/x/ballooning-diagram/${diagramId}/save`
    });
  }, [diagramId, name, annotations, features, notes, pdfUrl, fetcher]);

  const handlePdfUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPdfFile(file);

      setUploading(true);

      const fd = new FormData();
      fd.set("diagramId", diagramId);
      fd.set("file", file);

      try {
        const res = await fetch(path.to.uploadPdf, {
          method: "POST",
          body: fd,
          credentials: "same-origin"
        });
        const ct = res.headers.get("Content-Type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          setUploading(false);
          setPdfFile(null);
          toast.error(
            res.ok
              ? "Upload returned non-JSON (check dev server / routes)"
              : text.slice(0, 120) || `Upload failed (${res.status})`
          );
          return;
        }
        const json = (await res.json()) as {
          ok?: boolean;
          url?: string;
          error?: string;
        };
        setUploading(false);
        if (!res.ok || !json.ok || !json.url) {
          toast.error(json.error ?? "Failed to upload PDF");
          setPdfFile(null);
          return;
        }
        setPdfUrl(json.url);
        setPdfFile(null);
      } catch {
        setUploading(false);
        toast.error("Failed to upload PDF");
        setPdfFile(null);
      } finally {
        e.target.value = "";
      }
    },
    [diagramId]
  );

  const hasPdf = pdfFile !== null || pdfUrl !== "";
  const pdfSrc = pdfObjectUrl ?? pdfUrl;

  const handlePdfGeometry = useCallback(
    (g: { numPages: number; pageHeightOverWidth: number }) => {
      setPdfLayout({
        numPages: g.numPages,
        pageHeightOverWidth: g.pageHeightOverWidth
      });
    },
    []
  );

  useEffect(() => {
    setPdfLayout(null);
    setZoomFactor(1);
  }, [pdfSrc]);

  const zoomOut = useCallback(() => {
    setZoomFactor((z) => Math.max(0.25, z / 1.2));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomFactor((z) => Math.min(4, z * 1.2));
  }, []);

  const zoomFit = useCallback(() => {
    setZoomFactor(1);
  }, []);

  const pad = 16;
  const availW = Math.max(0, containerSize.w - pad);
  const availH = Math.max(0, containerSize.h - pad);

  const fitWidth = useMemo(() => {
    if (!pdfLayout || availW < 2 || availH < 2) return null;
    const { numPages, pageHeightOverWidth } = pdfLayout;
    return Math.min(availW, availH / (numPages * pageHeightOverWidth));
  }, [pdfLayout, availW, availH]);

  const pageRenderWidth = useMemo(() => {
    if (fitWidth != null && fitWidth > 0) {
      return Math.max(1, Math.floor(fitWidth * zoomFactor));
    }
    if (containerSize.w > 0) {
      return Math.max(1, Math.floor(containerSize.w - pad));
    }
    return 800;
  }, [fitWidth, zoomFactor, containerSize.w, pad]);

  const contentStackHeight = useMemo(() => {
    if (!pdfLayout) return 0;
    return pdfLayout.numPages * pageRenderWidth * pdfLayout.pageHeightOverWidth;
  }, [pdfLayout, pageRenderWidth]);

  const overflowScroll = useMemo(() => {
    if (!pdfLayout || availW < 2 || availH < 2) return false;
    return pageRenderWidth > availW + 1 || contentStackHeight > availH + 2;
  }, [pdfLayout, availW, availH, pageRenderWidth, contentStackHeight]);

  const selectToolbarClass =
    "h-8 min-w-[5.5rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  const selectToolsClass =
    "h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const sortedFeatures = [...features].sort(
    (a, b) => a.balloonNumber - b.balloonNumber
  );
  const annotationById = useMemo(
    () => new Map(annotations.map((a) => [a.id, a])),
    [annotations]
  );

  const selectedAnnotations = useMemo(() => {
    return selectedBalloonIds
      .map((id) => annotationById.get(id))
      .filter((a): a is BalloonAnnotation => a != null);
  }, [selectedBalloonIds, annotationById]);

  const selectedFeatures = useMemo(() => {
    return selectedBalloonIds
      .map((id) => features.find((f) => f.id === id))
      .filter((f): f is BalloonFeature => f != null);
  }, [selectedBalloonIds, features]);

  const applyAnnotationPatchToSelected = useCallback(
    (
      patch: Partial<
        Pick<
          BalloonAnnotation,
          | "frameColor"
          | "pinShape"
          | "pinSizePx"
          | "noteColor"
          | "noteFontSizePx"
          | "showLeaderLine"
        >
      >
    ) => {
      const ids = new Set(selectedBalloonIdsRef.current);
      if (ids.size === 0) return;
      setAnnotations((prev) =>
        prev.map((a) => (ids.has(a.id) ? { ...a, ...patch } : a))
      );
    },
    [setAnnotations]
  );

  const applyCharacteristicToSelected = useCallback(
    (characteristicType: BalloonFeatureCharacteristic | null) => {
      const ids = new Set(selectedBalloonIdsRef.current);
      if (ids.size === 0) return;
      setFeatures((prev) =>
        prev.map((f) =>
          ids.has(f.id) ? { ...f, characteristicType } : f
        )
      );
    },
    []
  );

  const duplicateSelectedBalloons = useCallback(() => {
    const ids = [...selectedBalloonIdsRef.current];
    if (ids.length === 0) return;

    const offsetNorm = 0.018;
    const newAnnotations: BalloonAnnotation[] = [];
    const newFeatures: BalloonFeature[] = [];

    let nextNum =
      Math.max(
        0,
        ...annotations.map((a) => a.balloonNumber),
        ...features.map((f) => f.balloonNumber)
      ) + 1;

    const taken = (n: number) =>
      annotations.some((a) => a.balloonNumber === n) ||
      features.some((f) => f.balloonNumber === n) ||
      newAnnotations.some((a) => a.balloonNumber === n) ||
      newFeatures.some((f) => f.balloonNumber === n);

    for (const id of ids) {
      const ann = annotations.find((a) => a.id === id);
      const feat = features.find((f) => f.id === id);
      if (!ann || !feat) continue;

      while (taken(nextNum)) nextNum++;

      const newId = generateId();
      newAnnotations.push({
        ...ann,
        id: newId,
        balloonNumber: nextNum,
        x: clamp01(ann.x + offsetNorm),
        y: clamp01(ann.y + offsetNorm),
        rect: ann.rect
          ? {
              x: clamp01(ann.rect.x + offsetNorm),
              y: clamp01(ann.rect.y + offsetNorm),
              width: ann.rect.width,
              height: ann.rect.height
            }
          : ann.rect
      });
      newFeatures.push({
        ...feat,
        id: newId,
        balloonNumber: nextNum,
        sortOrder: nextNum
      });
      nextNum++;
    }

    if (newAnnotations.length === 0) return;

    setAnnotations((prev) => [...prev, ...newAnnotations]);
    setFeatures((prev) => [...prev, ...newFeatures]);
    setSelectedBalloonIds(newAnnotations.map((a) => a.id));
    setNextPlacementNumber((n) => Math.max(n, nextNum));
    toast.success(`Duplicated ${newAnnotations.length} balloon(s).`);
  }, [annotations, features]);

  const deleteSelectedBalloons = useCallback(() => {
    const ids = new Set(selectedBalloonIdsRef.current);
    if (ids.size === 0) return;
    setAnnotations((prev) => prev.filter((a) => !ids.has(a.id)));
    setFeatures((prev) => prev.filter((f) => !ids.has(f.id)));
    setSelectedBalloonIds([]);
    toast.success(`Deleted ${ids.size} balloon(s).`);
  }, [setAnnotations, setFeatures]);

  const updateAnnotationStyle = useCallback(
    (
      id: string,
      patch: Partial<{
        showLeaderLine: boolean;
        frameColor: string;
        pinShape: BalloonPinShape;
      }>
    ) => {
      setAnnotations((prev) =>
        prev.map((ann) => (ann.id === id ? { ...ann, ...patch } : ann))
      );
    },
    [setAnnotations]
  );

  const updateBalloonNumber = useCallback(
    (id: string, raw: string) => {
      const parsed = Math.floor(Number(raw));
      if (!Number.isFinite(parsed) || parsed < 1) return;

      const duplicate = features.some(
        (f) => f.id !== id && f.balloonNumber === parsed
      );
      if (duplicate) {
        toast.error(`Balloon number ${parsed} is already in use`);
        return;
      }

      setFeatures((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, balloonNumber: parsed, sortOrder: parsed } : f
        )
      );
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, balloonNumber: parsed } : a
        )
      );
      setNextPlacementNumber((n) => Math.max(n, parsed + 1));
    },
    [features, setAnnotations]
  );

  const dlgFrameColor = useMemo(() => {
    if (selectedAnnotations.length === 0) return DEFAULT_FRAME_COLOR;
    const vals = selectedAnnotations.map(
      (a) => a.frameColor ?? DEFAULT_FRAME_COLOR
    );
    return uniformStrings(vals);
  }, [selectedAnnotations]);

  const dlgPinShape = useMemo(() => {
    if (selectedAnnotations.length === 0) return DEFAULT_PIN_SHAPE;
    const vals = selectedAnnotations.map(
      (a) => a.pinShape ?? DEFAULT_PIN_SHAPE
    );
    return uniformStrings(vals);
  }, [selectedAnnotations]);

  const dlgLeader = useMemo(
    () => uniformLeaderLine(selectedAnnotations),
    [selectedAnnotations]
  );

  const dlgPinSize = useMemo(() => {
    if (selectedAnnotations.length === 0) return MIXED;
    const vs = selectedAnnotations.map((a) =>
      clampPinSize(a.pinSizePx ?? DEFAULT_PIN_SIZE_PX)
    );
    return uniformNumbers(vs);
  }, [selectedAnnotations]);

  const dlgNoteColor = useMemo(() => {
    if (selectedAnnotations.length === 0) return DEFAULT_NOTE_COLOR;
    const vals = selectedAnnotations.map(
      (a) => a.noteColor ?? a.frameColor ?? DEFAULT_NOTE_COLOR
    );
    return uniformStrings(vals);
  }, [selectedAnnotations]);

  const dlgNoteSize = useMemo(() => {
    if (selectedAnnotations.length === 0) return MIXED;
    const vs = selectedAnnotations.map((a) =>
      clampNoteSize(a.noteFontSizePx ?? DEFAULT_NOTE_FONT_SIZE_PX)
    );
    return uniformNumbers(vs);
  }, [selectedAnnotations]);

  const dlgCharacteristic = useMemo(
    () => uniformCharacteristic(selectedFeatures),
    [selectedFeatures]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfUpload}
        disabled={uploading}
      />

      <div className="flex-shrink-0 border-b border-border bg-background px-3 py-2">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xs">
          <HStack className="flex-wrap gap-1 border-border pr-0 sm:border-r sm:pr-3">
            <Button
              variant={placing ? "primary" : "secondary"}
              size="sm"
              leftIcon={<LuRectangleHorizontal />}
              title={diagramEditorTooltips.addBalloon}
              onClick={() => {
                setPlacing((v) => !v);
                setAddingNote(false);
              }}
              isDisabled={!hasPdf}
            >
              {placing ? "Balloon Mode On" : "Add Balloon"}
            </Button>
            <Button
              variant={addingNote ? "primary" : "secondary"}
              size="sm"
              leftIcon={<LuMessageSquarePlus />}
              title={diagramEditorTooltips.addNote}
              onClick={() => {
                setAddingNote(true);
                setPlacing(false);
              }}
              isDisabled={!hasPdf}
            >
              {addingNote ? "Click drawing to place note" : "Add Note"}
            </Button>
            {hasPdf ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<LuUpload />}
                title={diagramEditorTooltips.replacePdf}
                onClick={() => fileInputRef.current?.click()}
                isDisabled={uploading}
              >
                {uploading ? "Uploading..." : "Replace PDF"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<LuUpload />}
                title={diagramEditorTooltips.openPdf}
                onClick={() => fileInputRef.current?.click()}
                isDisabled={uploading}
              >
                {uploading ? "Uploading..." : "Open PDF"}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<LuSave />}
              title={diagramEditorTooltips.save}
              onClick={handleSave}
              isDisabled={fetcher.state !== "idle"}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<LuCircleHelp />}
              title={diagramEditorTooltips.helpToggle}
              className={helpSidebarOpen ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : undefined}
              onClick={() => setHelpSidebarOpen((o) => !o)}
            >
              {helpSidebarOpen ? "Close help" : "Help"}
            </Button>
          </HStack>

          <HStack className="gap-0.5 border-border pr-0 sm:border-r sm:pr-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Zoom out"
              title={diagramEditorTooltips.zoomOut}
              onClick={zoomOut}
              isDisabled={!hasPdf || !pdfLayout}
            >
              <LuZoomOut className="h-4 w-4" />
            </Button>
            <span className="min-w-[3.25rem] select-none text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(zoomFactor * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Zoom in"
              title={diagramEditorTooltips.zoomIn}
              onClick={zoomIn}
              isDisabled={!hasPdf || !pdfLayout}
            >
              <LuZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Fit to window"
              title={diagramEditorTooltips.zoomFit}
              onClick={zoomFit}
              isDisabled={!hasPdf || !pdfLayout}
            >
              <LuMaximize2 className="h-4 w-4" />
            </Button>
          </HStack>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.nextNumber}
          >
            Next number
            <Input
              type="number"
              min={1}
              disabled={!hasPdf}
              className="h-8 w-16 text-sm tabular-nums"
              value={nextPlacementNumber}
              title={diagramEditorTooltips.nextNumber}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) setNextPlacementNumber(Math.max(1, v));
              }}
            />
          </label>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.placementType}
          >
            Type
            <select
              className={selectToolbarClass}
              disabled={!hasPdf}
              title={diagramEditorTooltips.placementType}
              value={placementCharacteristic}
              onChange={(e) =>
                setPlacementCharacteristic(
                  e.target.value as BalloonFeatureCharacteristic
                )
              }
            >
              {balloonCharacteristicType.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.showLeaderLine}
          >
            Show line
            <select
              className={selectToolbarClass}
              disabled={!hasPdf}
              title={diagramEditorTooltips.showLeaderLine}
              value={showLeaderLine}
              onChange={(e) =>
                setShowLeaderLine(e.target.value as "show" | "hide")
              }
            >
              <option value="show">Show</option>
              <option value="hide">Hide</option>
            </select>
          </label>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.frameColor}
          >
            Color
            <select
              className={selectToolbarClass}
              disabled={!hasPdf}
              title={diagramEditorTooltips.frameColor}
              value={frameColor}
              onChange={(e) => setFrameColor(e.target.value)}
            >
              {BALLOON_FRAME_COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.pinShape}
          >
            Shape
            <select
              className={selectToolbarClass}
              disabled={!hasPdf}
              title={diagramEditorTooltips.pinShape}
              value={pinShape}
              onChange={(e) => setPinShape(e.target.value as BalloonPinShape)}
            >
              {BALLOON_PIN_SHAPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.pinSize}
          >
            Size
            <select
              className={selectToolbarClass}
              disabled={!hasPdf}
              title={diagramEditorTooltips.pinSize}
              value={pinSizePx}
              onChange={(e) =>
                setPinSizePx(clampPinSize(parseInt(e.target.value, 10)))
              }
            >
              {BALLOON_SIZE_DROPDOWN_PX.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.noteColor}
          >
            Note color
            <select
              className={selectToolbarClass}
              disabled={!hasPdf}
              title={diagramEditorTooltips.noteColor}
              value={noteColor}
              onChange={(e) => setNoteColor(e.target.value)}
            >
              {BALLOON_NOTE_COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.noteFontSize}
          >
            Note size
            <select
              className={selectToolbarClass}
              disabled={!hasPdf}
              title={diagramEditorTooltips.noteFontSize}
              value={noteFontSizePx}
              onChange={(e) =>
                setNoteFontSizePx(clampNoteSize(parseInt(e.target.value, 10)))
              }
            >
              {BALLOON_SIZE_DROPDOWN_PX.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label
            className="flex flex-col gap-0.5 text-muted-foreground"
            title={diagramEditorTooltips.placementPage}
          >
            Page
            <select
              className={selectToolbarClass}
              disabled={!hasPdf || !pdfLayout}
              title={diagramEditorTooltips.placementPage}
              value={placementPage}
              onChange={(e) =>
                setPlacementPage(Math.max(1, parseInt(e.target.value, 10)))
              }
            >
              {pdfLayout
                ? Array.from({ length: pdfLayout.numPages }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))
                : (
                    <option value={1}>1</option>
                  )}
            </select>
          </label>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <div
          ref={containerRef}
          className={`relative flex min-h-0 flex-1 basis-0 flex-col overflow-hidden rounded-lg border bg-muted ${
            placing ? "cursor-crosshair" :         movingBalloon ? "cursor-move" : ""
          }`}
        >
          {hasPdf && pdfSrc ? (
            <BalloonPdfClientOnly
              src={pdfSrc}
              pageWidth={pageRenderWidth}
              overflowScroll={overflowScroll}
              disableRightDragPan
              className="h-full w-full min-h-0 flex-1"
              scrollPortRef={pdfScrollPortRef}
              onPdfGeometry={handlePdfGeometry}
              renderPageOverlay={
                PageKonva
                  ? (ctx: BallooningPdfPageOverlayContext) => (
                      <PageKonva
                        key={`konva-${ctx.pageNumber}`}
                        pageNumber={ctx.pageNumber}
                        pageWidthPx={ctx.pageWidthPx}
                        pageHeightPx={ctx.pageHeightPx}
                        annotations={getBalloonsForPage(ctx.pageNumber)}
                        notes={notes.filter((n) => n.page === ctx.pageNumber)}
                        selectedBalloonIds={selectedBalloonIds}
                        selectedNote={selectedNote}
                        placing={placing}
                        addingNote={addingNote}
                        placingTargetPage={placementPage}
                        movingBalloon={movingBalloon}
                        movingSelection={movingSelection}
                        resizingRect={resizingRect}
                        movingNote={movingNote}
                        drag={drag}
                        selectionMarquee={selectionMarquee}
                        theme={konvaTheme}
                        previewFrameColor={frameColor}
                        scrollRef={pdfScrollPortRef}
                        onRectangleDown={handleRectangleDown}
                        onRectangleMove={handleRectangleMove}
                        onRectangleUp={handleRectangleUp}
                        onSelectionMarqueeDown={handleSelectionMarqueeDown}
                        onSelectionMarqueeMove={handleSelectionMarqueeMove}
                        onSelectionMarqueeUp={handleSelectionMarqueeUp}
                        onPinSelectPointerDown={handlePinSelectPointerDown}
                        onPinMoveDragStart={handlePinMoveDragStart}
                        onMoveBalloonMove={handleMoveBalloonMove}
                        onMoveBalloonUp={handleMoveBalloonUp}
                        onBalloonRectSelectPointerDown={
                          handleBalloonRectSelectPointerDown
                        }
                        onSelectionMoveDragStart={handleSelectionMoveDragStart}
                        onMoveSelectionMove={handleMoveSelectionMove}
                        onMoveSelectionUp={handleMoveSelectionUp}
                        onRectResizePointerDown={handleRectResizePointerDown}
                        onMoveRectResizeMove={handleMoveRectResizeMove}
                        onMoveRectResizeUp={handleMoveRectResizeUp}
                        onNoteCreate={handleNoteCreate}
                        onNoteSelectPointerDown={handleNoteSelectPointerDown}
                        onNoteMoveDragStart={handleNoteMoveDragStart}
                        onMoveNoteMove={handleMoveNoteMove}
                        onMoveNoteUp={handleMoveNoteUp}
                        onClearSelectedNote={() => setSelectedNote(null)}
                        onNoteEdit={handleNoteEdit}
                        onNoteUpdate={handleNoteUpdate}
                        onNoteDelete={handleNoteDelete}
                        onLeaveSurface={handleLeaveKonvaSurface}
                      />
                    )
                  : undefined
              }
            />
          ) : (
            <button
              type="button"
              disabled={uploading}
              title={diagramEditorTooltips.openPdfEmpty}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-full min-w-full cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <VStack className="items-center gap-2">
                {uploading ? (
                  <LuLoader className="h-12 w-12 animate-spin opacity-30" />
                ) : (
                  <LuUpload className="h-12 w-12 opacity-30" />
                )}
                <p>
                  {uploading
                    ? "Uploading…"
                    : "Click to upload a PDF drawing"}
                </p>
              </VStack>
            </button>
          )}
        </div>

        <div
          className={`shrink-0 overflow-hidden rounded-lg border ${
            tableExpanded ? "h-[50vh]" : "h-[220px]"
          }`}
        >
          <div className="flex h-9 items-center justify-between border-b px-2">
            <span className="text-xs text-muted-foreground">
              Features ({sortedFeatures.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              title={diagramEditorTooltips.tableExpand}
              onClick={() => setTableExpanded((v) => !v)}
              aria-label={tableExpanded ? "Collapse table" : "Expand table"}
            >
              {tableExpanded ? (
                <LuChevronDown className="h-4 w-4" />
              ) : (
                <LuChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div ref={tableBodyRef} className="h-[calc(100%-36px)] overflow-auto">
            <Table>
            <Thead>
              <Tr>
                <Th className="w-20">Balloon #</Th>
                <Th className="w-56">Feature</Th>
                <Th className="w-20">Nom</Th>
                <Th className="w-20">Tol+</Th>
                <Th className="w-20">Tol-</Th>
                <Th className="w-20">Units</Th>
                <Th className="w-24">Feature Ty...</Th>
                <Th className="w-20">Tol Type</Th>
                <Th className="w-14">Loc</Th>
                <Th className="w-14">Count</Th>
                <Th className="w-20">Line</Th>
                <Th className="w-24">Color</Th>
                <Th className="w-24">Shape</Th>
                <Th className="w-10">Delete</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedFeatures.map((feature) => (
                (() => {
                  const ann = annotationById.get(feature.id);
                  return (
                <Tr
                  key={feature.id}
                  data-feature-id={feature.id}
                  onClick={(e) => {
                    if (e.button !== 0) return;
                    const id = feature.id;
                    setSelectedNote(null);
                    if (e.shiftKey) {
                      setSelectedBalloonIds((prev) =>
                        prev.includes(id) ? prev : [...prev, id]
                      );
                    } else if (e.metaKey || e.ctrlKey) {
                      setSelectedBalloonIds((prev) =>
                        prev.includes(id)
                          ? prev.filter((x) => x !== id)
                          : [...prev, id]
                      );
                    } else {
                      setSelectedBalloonIds([id]);
                    }
                  }}
                  className={`cursor-pointer ${selectedBalloonIds.includes(feature.id) ? "bg-primary/10" : ""}`}
                >
                  <Td className="min-w-[5rem]">
                    <Input
                      name={`balloon-number-${feature.id}`}
                      defaultValue={feature.balloonNumber}
                      inputMode="numeric"
                      className="h-8 text-xs tabular-nums"
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) =>
                        updateBalloonNumber(feature.id, e.target.value)
                      }
                    />
                  </Td>
                  <Td className="min-w-[14rem]">
                    <Input
                      name={`description-${feature.id}`}
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(feature.id, "description", e.target.value)
                      }
                      className="h-8 text-xs"
                      placeholder={`Feature ${feature.balloonNumber}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Td>
                  <Td className="min-w-[5rem]">
                    <Input
                      key={`nominal-${feature.id}`}
                      name={`nominal-${feature.id}`}
                      inputMode="decimal"
                      defaultValue={feature.nominalValue ?? ""}
                      className="h-8 text-xs"
                      onBlur={(e) =>
                        updateFeature(
                          feature.id,
                          "nominalValue",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      placeholder="0.000"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Td>
                  <Td className="min-w-[5rem]">
                    <Input
                      key={`tolPlus-${feature.id}`}
                      name={`tolPlus-${feature.id}`}
                      inputMode="decimal"
                      defaultValue={feature.tolerancePlus ?? ""}
                      className="h-8 text-xs"
                      onBlur={(e) =>
                        updateFeature(
                          feature.id,
                          "tolerancePlus",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      placeholder="+0.005"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Td>
                  <Td className="min-w-[5rem]">
                    <Input
                      key={`tolMinus-${feature.id}`}
                      name={`tolMinus-${feature.id}`}
                      inputMode="decimal"
                      defaultValue={feature.toleranceMinus ?? ""}
                      className="h-8 text-xs"
                      onBlur={(e) =>
                        updateFeature(
                          feature.id,
                          "toleranceMinus",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      placeholder="-0.005"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Td>
                  <Td className="min-w-[5rem]">
                    <Input
                      name={`unit-${feature.id}`}
                      value={feature.unitOfMeasureCode ?? ""}
                      className="h-8 text-xs"
                      onChange={(e) =>
                        updateFeature(
                          feature.id,
                          "unitOfMeasureCode",
                          e.target.value || null
                        )
                      }
                      placeholder="mm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()} className="min-w-[7rem]">
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={feature.characteristicType ?? ""}
                      onChange={(e) =>
                        updateFeature(
                          feature.id,
                          "characteristicType",
                          (e.target.value || null) as BalloonFeature["characteristicType"]
                        )
                      }
                    >
                      {balloonCharacteristicType.map((ct) => (
                        <option key={ct} value={ct}>
                          {ct}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td className="min-w-[4rem]">
                    <Input
                      readOnly
                      value="+/-"
                      className="h-8 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Td>
                  <Td className="min-w-[3.5rem]">
                    <Input
                      readOnly
                      value={ann?.page ?? ""}
                      className="h-8 text-xs tabular-nums"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Td>
                  <Td className="min-w-[3.5rem]">
                    <Input
                      readOnly
                      value={feature.balloonNumber}
                      className="h-8 text-xs tabular-nums"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={ann?.showLeaderLine === false ? "hide" : "show"}
                      onChange={(e) =>
                        updateAnnotationStyle(feature.id, {
                          showLeaderLine: e.target.value === "show"
                        })
                      }
                    >
                      <option value="show">Show</option>
                      <option value="hide">Hide</option>
                    </select>
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={ann?.frameColor ?? DEFAULT_FRAME_COLOR}
                      onChange={(e) =>
                        updateAnnotationStyle(feature.id, {
                          frameColor: e.target.value
                        })
                      }
                    >
                      {BALLOON_FRAME_COLOR_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={ann?.pinShape ?? DEFAULT_PIN_SHAPE}
                      onChange={(e) =>
                        updateAnnotationStyle(feature.id, {
                          pinShape: e.target.value as BalloonPinShape
                        })
                      }
                    >
                      {BALLOON_PIN_SHAPES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={diagramEditorTooltips.rowDelete}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAnnotation(feature.id);
                      }}
                    >
                      <LuTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </Td>
                </Tr>
                  );
                })()
              ))}
              {sortedFeatures.length === 0 ? (
                <Tr>
                  <Td
                    colSpan={14}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No balloons yet. Turn on &quot;Add Balloon&quot;, then
                    left-click and drag on the drawing to place a highlight.
                  </Td>
                </Tr>
              ) : null}
            </Tbody>
            </Table>
          </div>
        </div>
        </div>

        <ToolsSidebar
          open={balloonActionsPopoverOpen && hasPdf}
          title="Balloon tools"
          headingTooltip={diagramEditorTooltips.balloonToolsHeading}
          description={
            <>
              <span className="font-medium text-foreground">
                {selectedBalloonIds.length}
              </span>{" "}
              balloon{selectedBalloonIds.length === 1 ? "" : "s"} selected.
              Changes apply to the whole selection.
            </>
          }
          onClose={() => setUserClosedBalloonDrawer(true)}
          footer={
            <HStack className="w-full gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="min-w-0 flex-1"
                title={diagramEditorTooltips.duplicateSelection}
                onClick={duplicateSelectedBalloons}
              >
                Duplicate
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="min-w-0 flex-1"
                title={diagramEditorTooltips.deleteSelection}
                onClick={deleteSelectedBalloons}
              >
                Delete
              </Button>
            </HStack>
          }
        >
          <VStack className="gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label
                className="flex flex-col gap-1 text-xs text-muted-foreground"
                title={diagramEditorTooltips.sidebarFrameColor}
              >
                Frame color
                <select
                  className={selectToolsClass}
                  title={diagramEditorTooltips.sidebarFrameColor}
                  value={dlgFrameColor === MIXED ? MIXED : dlgFrameColor}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === MIXED) return;
                    applyAnnotationPatchToSelected({ frameColor: v });
                  }}
                >
                  {dlgFrameColor === MIXED ? (
                    <option value={MIXED}>Mixed</option>
                  ) : null}
                  {BALLOON_FRAME_COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="flex flex-col gap-1 text-xs text-muted-foreground"
                title={diagramEditorTooltips.sidebarPinShape}
              >
                Pin shape
                <select
                  className={selectToolsClass}
                  title={diagramEditorTooltips.sidebarPinShape}
                  value={dlgPinShape === MIXED ? MIXED : dlgPinShape}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === MIXED) return;
                    applyAnnotationPatchToSelected({
                      pinShape: v as BalloonPinShape
                    });
                  }}
                >
                  {dlgPinShape === MIXED ? (
                    <option value={MIXED}>Mixed</option>
                  ) : null}
                  {BALLOON_PIN_SHAPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="flex flex-col gap-1 text-xs text-muted-foreground"
                title={diagramEditorTooltips.sidebarFeatureType}
              >
                Feature type
                <select
                  className={selectToolsClass}
                  title={diagramEditorTooltips.sidebarFeatureType}
                  value={
                    dlgCharacteristic === MIXED ? MIXED : dlgCharacteristic
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === MIXED) return;
                    applyCharacteristicToSelected(
                      v as BalloonFeatureCharacteristic
                    );
                  }}
                >
                  {dlgCharacteristic === MIXED ? (
                    <option value={MIXED}>Mixed</option>
                  ) : null}
                  {balloonCharacteristicType.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="flex flex-col gap-1 text-xs text-muted-foreground"
                title={diagramEditorTooltips.sidebarLeaderLine}
              >
                Leader line
                <select
                  className={selectToolsClass}
                  title={diagramEditorTooltips.sidebarLeaderLine}
                  value={dlgLeader === MIXED ? MIXED : dlgLeader}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === MIXED) return;
                    applyAnnotationPatchToSelected({
                      showLeaderLine: v === "show"
                    });
                  }}
                >
                  {dlgLeader === MIXED ? (
                    <option value={MIXED}>Mixed</option>
                  ) : null}
                  <option value="show">Show</option>
                  <option value="hide">Hide</option>
                </select>
              </label>
              <label
                className="flex flex-col gap-1 text-xs text-muted-foreground"
                title={diagramEditorTooltips.sidebarPinSize}
              >
                Pin size (px)
                <select
                  className={selectToolsClass}
                  title={diagramEditorTooltips.sidebarPinSize}
                  value={dlgPinSize === MIXED ? MIXED : String(dlgPinSize)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === MIXED) return;
                    applyAnnotationPatchToSelected({
                      pinSizePx: clampPinSize(parseInt(v, 10))
                    });
                  }}
                >
                  {dlgPinSize === MIXED ? (
                    <option value={MIXED}>Mixed</option>
                  ) : null}
                  {BALLOON_SIZE_DROPDOWN_PX.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="flex flex-col gap-1 text-xs text-muted-foreground"
                title={diagramEditorTooltips.sidebarNumberColor}
              >
                Number color
                <select
                  className={selectToolsClass}
                  title={diagramEditorTooltips.sidebarNumberColor}
                  value={dlgNoteColor === MIXED ? MIXED : dlgNoteColor}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === MIXED) return;
                    applyAnnotationPatchToSelected({ noteColor: v });
                  }}
                >
                  {dlgNoteColor === MIXED ? (
                    <option value={MIXED}>Mixed</option>
                  ) : null}
                  {BALLOON_NOTE_COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label
              className="flex flex-col gap-1 text-xs text-muted-foreground"
              title={diagramEditorTooltips.sidebarNumberSize}
            >
              Number size (px)
              <select
                className={selectToolsClass}
                title={diagramEditorTooltips.sidebarNumberSize}
                value={dlgNoteSize === MIXED ? MIXED : String(dlgNoteSize)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === MIXED) return;
                  applyAnnotationPatchToSelected({
                    noteFontSizePx: clampNoteSize(parseInt(v, 10))
                  });
                }}
              >
                {dlgNoteSize === MIXED ? (
                  <option value={MIXED}>Mixed</option>
                ) : null}
                {BALLOON_SIZE_DROPDOWN_PX.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </VStack>
        </ToolsSidebar>

        <ToolsSidebar
          open={helpSidebarOpen}
          title="Help"
          headingTooltip="Step-by-step guide for marking the drawing and using the list."
          description="Full steps are below. Hover any top control for a short hint."
          onClose={() => setHelpSidebarOpen(false)}
          widthClassName="w-80 min-w-[18rem] max-w-[24rem]"
        >
          <DiagramEditorHelpPanel />
        </ToolsSidebar>
      </div>
    </div>
  );
}
