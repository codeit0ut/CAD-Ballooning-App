import { useCallback, useEffect, useState } from "react";
import { migrateBalloonAnnotations } from "~/modules/ballooning/ballooning.migrate";
import type { BalloonAnnotation } from "~/modules/ballooning/ballooning.types";
import { clamp01 } from "./usePageSpaceCoords";

export type UseBalloonAnnotationsArgs = {
  diagramId: string;
  initialAnnotations: BalloonAnnotation[] | undefined;
};

/**
 * Balloon list with helpers for page-space (normalized) geometry.
 */
export function useBalloonAnnotations({
  diagramId,
  initialAnnotations
}: UseBalloonAnnotationsArgs) {
  const [annotations, setAnnotations] = useState<BalloonAnnotation[]>(() =>
    migrateBalloonAnnotations(initialAnnotations ?? [])
  );

  useEffect(() => {
    setAnnotations(migrateBalloonAnnotations(initialAnnotations ?? []));
  }, [diagramId]);

  const getBalloonsForPage = useCallback(
    (page: number) => annotations.filter((a) => a.page === page),
    [annotations]
  );

  const addBalloon = useCallback((annotation: BalloonAnnotation) => {
    setAnnotations((prev) => [...prev, annotation]);
  }, []);

  const removeBalloon = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateBalloonPosition = useCallback(
    (id: string, xNorm: number, yNorm: number) => {
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, x: clamp01(xNorm), y: clamp01(yNorm) }
            : a
        )
      );
    },
    []
  );

  const translateBalloonPinAndRect = useCallback(
    (id: string, nx: number, ny: number) => {
      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const newX = clamp01(nx);
          const newY = clamp01(ny);
          const dx = newX - a.x;
          const dy = newY - a.y;
          return {
            ...a,
            x: newX,
            y: newY,
            rect: a.rect
              ? {
                  x: clamp01(a.rect.x + dx),
                  y: clamp01(a.rect.y + dy),
                  width: a.rect.width,
                  height: a.rect.height
                }
              : a.rect
          };
        })
      );
    },
    []
  );

  return {
    annotations,
    setAnnotations,
    getBalloonsForPage,
    addBalloon,
    removeBalloon,
    updateBalloonPosition,
    translateBalloonPinAndRect
  };
}
