import { getRotatedAABB } from "./rotation";
import { computeLineBounds } from "./edge-intersection";

export interface VisibleBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Convert viewport state + screen dimensions to canvas-space visible bounds */
export function getVisibleBounds(
  pos: { x: number; y: number },
  scale: number,
  screenW: number,
  screenH: number,
): VisibleBounds {
  return {
    minX: -pos.x / scale,
    minY: -pos.y / scale,
    maxX: (screenW - pos.x) / scale,
    maxY: (screenH - pos.y) / scale,
  };
}

const PADDING = 200; // canvas-space pixels

/** AABB overlap test with padding */
export function isObjectVisible(
  obj: { x: number; y: number; width: number; height: number; rotation?: number; type?: string; points?: { x: number; y: number }[] },
  bounds: VisibleBounds,
): boolean {
  let aabb: { x: number; y: number; width: number; height: number };
  if ((obj.type === "line" || obj.type === "drawing") && obj.points && obj.points.length >= 2) {
    aabb = computeLineBounds(obj.points);
  } else {
    aabb = getRotatedAABB(obj);
  }

  return (
    aabb.x + aabb.width >= bounds.minX - PADDING &&
    aabb.x <= bounds.maxX + PADDING &&
    aabb.y + aabb.height >= bounds.minY - PADDING &&
    aabb.y <= bounds.maxY + PADDING
  );
}
