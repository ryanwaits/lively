/**
 * Catmull-Rom spline utilities for smooth SVG paths.
 *
 * catmullRomToSvgPath — N points → smooth cubic bezier SVG `d` attribute
 * twoPointCurvedPath  — 2-point S-curve (control points offset ~25% perpendicular)
 */

type Point = { x: number; y: number };

const TENSION = 0.5;

/**
 * Convert Catmull-Rom control points to a cubic bezier segment.
 * Given 4 sequential points (p0, p1, p2, p3), returns the two inner
 * bezier control points for the segment between p1 and p2.
 */
function catmullToBezier(
  p0: Point, p1: Point, p2: Point, p3: Point,
): { cp1: Point; cp2: Point } {
  const alpha = TENSION;
  return {
    cp1: {
      x: p1.x + (p2.x - p0.x) / (6 / alpha),
      y: p1.y + (p2.y - p0.y) / (6 / alpha),
    },
    cp2: {
      x: p2.x - (p3.x - p1.x) / (6 / alpha),
      y: p2.y - (p3.y - p1.y) / (6 / alpha),
    },
  };
}

/**
 * Convert an array of N points (N >= 2) into a smooth SVG path `d` attribute
 * using Catmull-Rom → cubic bezier conversion.
 *
 * Boundary handling: mirrors the adjacent point for virtual control points
 * at the start and end of the spline.
 */
export function catmullRomToSvgPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  const n = points.length;
  // Virtual endpoints: mirror first/last interior point across the boundary
  const p0Virtual: Point = {
    x: 2 * points[0].x - points[1].x,
    y: 2 * points[0].y - points[1].y,
  };
  const pNVirtual: Point = {
    x: 2 * points[n - 1].x - points[n - 2].x,
    y: 2 * points[n - 1].y - points[n - 2].y,
  };

  const extended = [p0Virtual, ...points, pNVirtual];
  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < n - 1; i++) {
    const { cp1, cp2 } = catmullToBezier(
      extended[i], extended[i + 1], extended[i + 2], extended[i + 3],
    );
    const end = points[i + 1];
    d += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${end.x},${end.y}`;
  }

  return d;
}

/**
 * Generate an S-curve SVG path between two points.
 * Control points are offset ~25% of the segment length perpendicular to the line.
 */
export function twoPointCurvedPath(
  p0: Point,
  p1: Point,
  curvature = 0.25,
): string {
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return `M ${p0.x},${p0.y} L ${p1.x},${p1.y}`;

  // Perpendicular unit vector
  const px = -dy / len;
  const py = dx / len;
  const offset = len * curvature;

  // S-curve: first control point offsets one way, second the other
  const cp1 = { x: mx + px * offset, y: my + py * offset };
  const cp2 = { x: mx - px * offset, y: my - py * offset };

  // Use two quadratic curves via the midpoint to form the S
  // Actually, a cubic bezier with opposing control offsets:
  const c1 = { x: p0.x + dx * 0.25 + px * offset, y: p0.y + dy * 0.25 + py * offset };
  const c2 = { x: p0.x + dx * 0.75 - px * offset, y: p0.y + dy * 0.75 - py * offset };

  return `M ${p0.x},${p0.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${p1.x},${p1.y}`;
}
