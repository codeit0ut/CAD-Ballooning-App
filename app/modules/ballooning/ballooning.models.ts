import { z } from "zod";

export const balloonCharacteristicType = [
  "Basic",
  "Note",
  "gD&T"
] as const;

/** Mirrors Carbon `ballooningDiagramValidator` fields (without zfd). */
export const ballooningDiagramValidator = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Name is required" }),
  drawingNumber: z.string().optional(),
  revision: z.string().optional(),
  pdfUrl: z.string().optional(),
  annotations: z.string().optional(),
  features: z.string().optional(),
  notes: z.string().optional()
});

export function parseBallooningDiagramForm(formData: FormData) {
  const raw = {
    id: emptyToUndef(formData.get("id")),
    name: String(formData.get("name") ?? ""),
    drawingNumber: emptyToUndef(formData.get("drawingNumber")),
    revision: emptyToUndef(formData.get("revision")),
    pdfUrl: emptyToUndef(formData.get("pdfUrl")),
    annotations: emptyToUndef(formData.get("annotations")),
    features: emptyToUndef(formData.get("features")),
    notes: emptyToUndef(formData.get("notes"))
  };
  return ballooningDiagramValidator.safeParse(raw);
}

function emptyToUndef(v: FormDataEntryValue | null) {
  if (v === null || v === "") return undefined;
  return String(v);
}
