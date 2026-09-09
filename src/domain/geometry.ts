export type Point = { x: number; y: number };

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function segmentIntersectsCircle(start: Point, end: Point, center: Point, radius: number): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return distance(start, center) <= radius;

  const projection = Math.max(
    0,
    Math.min(1, ((center.x - start.x) * dx + (center.y - start.y) * dy) / lengthSquared),
  );
  return distance({ x: start.x + projection * dx, y: start.y + projection * dy }, center) <= radius;
}
