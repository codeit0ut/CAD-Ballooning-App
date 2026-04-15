export type BalloonNormRect = {
  /** Left edge, 0–1 relative to page width */
  x: number;
  /** Top edge, 0–1 relative to page height */
  y: number;
  /** Width, 0–1 relative to page width */
  width: number;
  /** Height, 0–1 relative to page height */
  height: number;
};

export type BalloonPinShape =
  | "circle"
  | "square"
  | "hex"
  | "diamond"
  | "triangle";

export type BalloonAnnotation = {
  id: string;
  balloonNumber: number;
  /** 1-based PDF page index */
  page: number;
  /** Pin / anchor X, normalized 0–1 relative to page width */
  x: number;
  /** Pin / anchor Y, normalized 0–1 relative to page height */
  y: number;
  /** Optional highlight region in the same page-space (0–1) */
  rect?: BalloonNormRect | null;
  /** Leader line from pin to highlight box */
  showLeaderLine?: boolean | null;
  /** Stroke color for frame, leader, and pin outline (hex) */
  frameColor?: string | null;
  pinShape?: BalloonPinShape | null;
  /** Pin outer diameter in page pixels (snapped to toolbar size steps, 2–108). */
  pinSizePx?: number | null;
  /** Number text color (hex) */
  noteColor?: string | null;
  /** Number text size in page pixels (snapped to toolbar size steps, 2–108). */
  noteFontSizePx?: number | null;
};

export type BalloonFeatureCharacteristic =
  | "Basic"
  | "Note"
  | "gD&T";

export type BalloonFeature = {
  id: string;
  balloonNumber: number;
  description: string;
  nominalValue: number | null;
  tolerancePlus: number | null;
  toleranceMinus: number | null;
  unitOfMeasureCode: string | null;
  characteristicType: BalloonFeatureCharacteristic | null;
  sortOrder: number;
};

export type BalloonDrawingNote = {
  id: string;
  /** 1-based PDF page index */
  page: number;
  /** Note anchor x in normalized page-space (0-1) */
  x: number;
  /** Note anchor y in normalized page-space (0-1) */
  y: number;
  text: string;
  color?: string | null;
  fontSizePx?: number | null;
};

export type BallooningDiagramContent = {
  drawingNumber: string | null;
  revision: string | null;
  pdfUrl: string | null;
  annotations: BalloonAnnotation[];
  features: BalloonFeature[];
  notes: BalloonDrawingNote[];
};

export type BallooningDiagram = {
  id: string;
  name: string;
  content: BallooningDiagramContent;
  companyId: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BallooningDiagramDetail = BallooningDiagram;
