"use client";

import { useCallback, useRef, useState } from "react";
import { computeLineBounds } from "@/lib/geometry/edge-intersection";
import type { BoardObject } from "@/types/board";

interface FreehandDrawingState {
  isDrawing: boolean;
  points: Array<{ x: number; y: number }>;
}

const INITIAL_STATE: FreehandDrawingState = {
  isDrawing: false,
  points: [],
};

/**
 * Ramer-Douglas-Peucker line simplification.
 */
function rdpSimplify(points: Array<{ x: number; y: number }>, epsilon: number): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points;

  const first = points[0];
  const last = points[points.length - 1];

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  const num = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  return num / Math.sqrt(lenSq);
}

export function useFreehandDrawing() {
  const [state, setState] = useState<FreehandDrawingState>(INITIAL_STATE);
  const stateRef = useRef(state);

  const updateState = (next: FreehandDrawingState) => {
    stateRef.current = next;
    setState(next);
  };

  const startDrawing = useCallback((pos: { x: number; y: number }) => {
    updateState({ isDrawing: true, points: [pos] });
  }, []);

  const addPoint = useCallback((pos: { x: number; y: number }) => {
    const s = stateRef.current;
    if (!s.isDrawing) return;
    updateState({ ...s, points: [...s.points, pos] });
  }, []);

  const finalize = useCallback(
    (boardId: string, userId: string | null, displayName: string | undefined, zIndex: number): BoardObject | null => {
      const { points: rawPoints } = stateRef.current;
      if (rawPoints.length < 2) {
        updateState(INITIAL_STATE);
        return null;
      }

      const points = rdpSimplify(rawPoints, 1.5);
      if (points.length < 2) {
        updateState(INITIAL_STATE);
        return null;
      }

      const bounds = computeLineBounds(points);
      const obj: BoardObject = {
        id: crypto.randomUUID(),
        board_id: boardId,
        type: "drawing",
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        color: "transparent",
        text: "",
        z_index: zIndex,
        created_by: userId,
        created_by_name: displayName,
        updated_at: new Date().toISOString(),
        points,
        stroke_color: "#374151",
        stroke_width: 2,
      };

      updateState(INITIAL_STATE);
      return obj;
    },
    [],
  );

  const cancel = useCallback(() => {
    updateState(INITIAL_STATE);
  }, []);

  return { state, startDrawing, addPoint, finalize, cancel };
}
