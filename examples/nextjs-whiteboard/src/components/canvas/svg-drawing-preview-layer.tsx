"use client";

import { catmullRomToSvgPath } from "@/lib/geometry/catmull-rom";

interface SvgDrawingPreviewLayerProps {
  points: Array<{ x: number; y: number }>;
}

export function SvgDrawingPreviewLayer({ points }: SvgDrawingPreviewLayerProps) {
  if (points.length < 2) return null;
  const d = catmullRomToSvgPath(points);
  return (
    <path
      d={d}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
      opacity={0.8}
    />
  );
}
