export type Point = { x: number; y: number };

export type CircleGeometry = Readonly<{
  kind: "circle";
  center: Readonly<Point>;
  radius: number;
}>;

export type EllipseGeometry = Readonly<{
  kind: "ellipse";
  center: Readonly<Point>;
  radiusX: number;
  radiusY: number;
  rotation: number;
}>;

export type CapsuleGeometry = Readonly<{
  kind: "capsule";
  start: Readonly<Point>;
  end: Readonly<Point>;
  radius: number;
}>;

export type PolygonGeometry = Readonly<{
  kind: "polygon";
  points: readonly Readonly<Point>[];
}>;

export type CleanableGeometry = CircleGeometry | EllipseGeometry | CapsuleGeometry | PolygonGeometry;

const EPSILON = 1e-9;

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

export function isGeometryValid(geometry: CleanableGeometry): boolean {
  switch (geometry.kind) {
    case "circle":
      return isPointFinite(geometry.center) && isPositiveFinite(geometry.radius);
    case "ellipse":
      return isPointFinite(geometry.center)
        && isPositiveFinite(geometry.radiusX)
        && isPositiveFinite(geometry.radiusY)
        && Number.isFinite(geometry.rotation);
    case "capsule":
      return isPointFinite(geometry.start)
        && isPointFinite(geometry.end)
        && isPositiveFinite(geometry.radius)
        && distance(geometry.start, geometry.end) > EPSILON;
    case "polygon":
      return geometry.points.length >= 3
        && geometry.points.every(isPointFinite)
        && Math.abs(polygonSignedArea(geometry.points)) > EPSILON;
  }
}

export function isPointInGeometry(point: Point, geometry: CleanableGeometry): boolean {
  if (!isPointFinite(point) || !isGeometryValid(geometry)) return false;

  switch (geometry.kind) {
    case "circle":
      return distance(point, geometry.center) <= geometry.radius + EPSILON;
    case "ellipse": {
      const local = ellipseLocalPoint(point, geometry);
      return (local.x / geometry.radiusX) ** 2 + (local.y / geometry.radiusY) ** 2 <= 1 + EPSILON;
    }
    case "capsule":
      return distanceToSegment(point, geometry.start, geometry.end) <= geometry.radius + EPSILON;
    case "polygon":
      return pointInPolygon(point, geometry.points);
  }
}

export function doesCircleFitGeometry(center: Point, radius: number, geometry: CleanableGeometry): boolean {
  if (!isPointFinite(center) || !Number.isFinite(radius) || radius < 0 || !isGeometryValid(geometry)) return false;

  switch (geometry.kind) {
    case "circle":
      return distance(center, geometry.center) + radius <= geometry.radius + EPSILON;
    case "ellipse":
      return isPointInGeometry(center, geometry)
        && ellipseBoundaryDistance(center, geometry) + EPSILON >= radius;
    case "capsule":
      return distanceToSegment(center, geometry.start, geometry.end) + radius <= geometry.radius + EPSILON;
    case "polygon":
      return isPointInGeometry(center, geometry)
        && polygonEdgeDistance(center, geometry.points) + EPSILON >= radius;
  }
}

export function doesCircleIntersectGeometry(center: Point, radius: number, geometry: CleanableGeometry): boolean {
  if (!isPointFinite(center) || !Number.isFinite(radius) || radius < 0 || !isGeometryValid(geometry)) return false;
  if (isPointInGeometry(center, geometry)) return true;

  switch (geometry.kind) {
    case "circle":
      return distance(center, geometry.center) <= radius + geometry.radius + EPSILON;
    case "ellipse":
      return ellipseBoundaryDistance(center, geometry) <= radius + EPSILON;
    case "capsule":
      return distanceToSegment(center, geometry.start, geometry.end) <= radius + geometry.radius + EPSILON;
    case "polygon":
      return polygonEdgeDistance(center, geometry.points) <= radius + EPSILON;
  }
}

export function isPointInCleanableRegion(
  point: Point,
  geometry: CleanableGeometry,
  exclusions: readonly CleanableGeometry[],
): boolean {
  if (!isGeometryValid(geometry) || exclusions.some((exclusion) => !isGeometryValid(exclusion))) return false;
  return isPointInGeometry(point, geometry)
    && exclusions.every((exclusion) => !isPointInGeometry(point, exclusion));
}

/** Uses the larger visual/hit radius so small targets retain a reachable touch area. */
export function isValidTargetPlacement(
  center: Point,
  visualRadius: number,
  minimumHitRadius: number,
  geometry: CleanableGeometry,
  exclusions: readonly CleanableGeometry[],
): boolean {
  if (!isPositiveFinite(visualRadius) || !isPositiveFinite(minimumHitRadius)) return false;
  if (!isGeometryValid(geometry) || exclusions.some((exclusion) => !isGeometryValid(exclusion))) return false;

  const hitRadius = Math.max(visualRadius, minimumHitRadius);
  return doesCircleFitGeometry(center, hitRadius, geometry)
    && exclusions.every((exclusion) => !doesCircleIntersectGeometry(center, hitRadius, exclusion));
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isPointFinite(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= EPSILON) return distance(point, start);
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return distance(point, { x: start.x + projection * dx, y: start.y + projection * dy });
}

function ellipseLocalPoint(point: Point, ellipse: EllipseGeometry): Point {
  const dx = point.x - ellipse.center.x;
  const dy = point.y - ellipse.center.y;
  const cosine = Math.cos(ellipse.rotation);
  const sine = Math.sin(ellipse.rotation);
  return {
    x: dx * cosine + dy * sine,
    y: -dx * sine + dy * cosine,
  };
}

/** Deterministic nearest-boundary search in one symmetric ellipse quadrant. */
function ellipseBoundaryDistance(point: Point, ellipse: EllipseGeometry): number {
  const local = ellipseLocalPoint(point, ellipse);
  const x = Math.abs(local.x);
  const y = Math.abs(local.y);
  const steps = 64;
  const step = Math.PI / 2 / steps;
  let bestIndex = 0;
  let bestSquared = Number.POSITIVE_INFINITY;

  const squaredDistanceAt = (angle: number) => {
    const dx = ellipse.radiusX * Math.cos(angle) - x;
    const dy = ellipse.radiusY * Math.sin(angle) - y;
    return dx * dx + dy * dy;
  };

  for (let index = 0; index <= steps; index += 1) {
    const squared = squaredDistanceAt(index * step);
    if (squared < bestSquared) {
      bestSquared = squared;
      bestIndex = index;
    }
  }

  let left = Math.max(0, (bestIndex - 1) * step);
  let right = Math.min(Math.PI / 2, (bestIndex + 1) * step);
  const ratio = (Math.sqrt(5) - 1) / 2;
  let leftProbe = right - (right - left) * ratio;
  let rightProbe = left + (right - left) * ratio;

  for (let iteration = 0; iteration < 36; iteration += 1) {
    if (squaredDistanceAt(leftProbe) <= squaredDistanceAt(rightProbe)) {
      right = rightProbe;
      rightProbe = leftProbe;
      leftProbe = right - (right - left) * ratio;
    } else {
      left = leftProbe;
      leftProbe = rightProbe;
      rightProbe = left + (right - left) * ratio;
    }
  }

  return Math.sqrt(Math.min(bestSquared, squaredDistanceAt((left + right) / 2)));
}

function polygonSignedArea(points: readonly Point[]): number {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

function pointInPolygon(point: Point, points: readonly Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const start = points[previous];
    const end = points[index];
    if (distanceToSegment(point, start, end) <= EPSILON) return true;
    const crosses = (start.y > point.y) !== (end.y > point.y)
      && point.x < (end.x - start.x) * (point.y - start.y) / (end.y - start.y) + start.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function polygonEdgeDistance(point: Point, points: readonly Point[]): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    nearest = Math.min(nearest, distanceToSegment(point, points[index], points[(index + 1) % points.length]));
  }
  return nearest;
}
