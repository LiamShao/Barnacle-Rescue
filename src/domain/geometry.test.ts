import { describe, expect, it } from "vitest";
import {
  doesCircleFitGeometry,
  doesCircleIntersectGeometry,
  isGeometryValid,
  isPointInCleanableRegion,
  isPointInGeometry,
  isPointOnCleanableSurface,
  isValidTargetPlacement,
  segmentIntersectsCircle,
  type CleanableGeometry,
} from "./geometry";

describe("segmentIntersectsCircle", () => {
  it("detects a scrape crossing a target", () => {
    expect(segmentIntersectsCircle({ x: 0, y: 10 }, { x: 20, y: 10 }, { x: 10, y: 10 }, 3)).toBe(true);
  });

  it("rejects movement outside the target", () => {
    expect(segmentIntersectsCircle({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 10 }, 3)).toBe(false);
  });
});

describe("cleanable geometry", () => {
  const circle = { kind: "circle", center: { x: 0, y: 0 }, radius: 10 } as const;
  const ellipse = {
    kind: "ellipse", center: { x: 0, y: 0 }, radiusX: 10, radiusY: 5, rotation: Math.PI / 2,
  } as const;
  const capsule = {
    kind: "capsule", start: { x: -5, y: 0 }, end: { x: 5, y: 0 }, radius: 2,
  } as const;
  const polygon = {
    kind: "polygon",
    points: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }],
  } as const;

  it("includes deterministic boundaries for circle and rotated ellipse points", () => {
    expect(isPointInGeometry({ x: 10, y: 0 }, circle)).toBe(true);
    expect(isPointInGeometry({ x: 10.01, y: 0 }, circle)).toBe(false);
    expect(isPointInGeometry({ x: 0, y: 10 }, ellipse)).toBe(true);
    expect(isPointInGeometry({ x: 5.01, y: 0 }, ellipse)).toBe(false);
  });

  it("supports oriented capsules and polygons", () => {
    expect(isPointInGeometry({ x: 6.5, y: 0 }, capsule)).toBe(true);
    expect(isPointInGeometry({ x: 0, y: 2.1 }, capsule)).toBe(false);
    expect(isPointInGeometry({ x: 0, y: 0 }, polygon)).toBe(true);
    expect(isPointInGeometry({ x: 5, y: 3 }, polygon)).toBe(true);
    expect(isPointInGeometry({ x: 5.1, y: 3 }, polygon)).toBe(false);
  });

  it("checks full circular containment in every primitive", () => {
    expect(doesCircleFitGeometry({ x: 0, y: 0 }, 10, circle)).toBe(true);
    expect(doesCircleFitGeometry({ x: 1, y: 0 }, 10, circle)).toBe(false);
    expect(doesCircleFitGeometry({ x: 0, y: 0 }, 5, ellipse)).toBe(true);
    expect(doesCircleFitGeometry({ x: 0, y: 0 }, 5.01, ellipse)).toBe(false);
    expect(doesCircleFitGeometry({ x: 0, y: 0 }, 2, capsule)).toBe(true);
    expect(doesCircleFitGeometry({ x: 0, y: 0 }, 5, polygon)).toBe(true);
    expect(doesCircleFitGeometry({ x: 0, y: 0 }, 5.01, polygon)).toBe(false);
  });

  it("detects exclusion overlap, including boundary contact", () => {
    expect(doesCircleIntersectGeometry({ x: 13, y: 0 }, 3, circle)).toBe(true);
    expect(doesCircleIntersectGeometry({ x: 13.01, y: 0 }, 3, circle)).toBe(false);
    expect(doesCircleIntersectGeometry({ x: 0, y: 12 }, 2, ellipse)).toBe(true);
    expect(doesCircleIntersectGeometry({ x: 0, y: 12.01 }, 2, ellipse)).toBe(false);
    expect(doesCircleIntersectGeometry({ x: 0, y: 4 }, 2, capsule)).toBe(true);
    expect(doesCircleIntersectGeometry({ x: 0, y: 4.01 }, 2, capsule)).toBe(false);
    expect(doesCircleIntersectGeometry({ x: 8, y: 0 }, 3, polygon)).toBe(true);
    expect(doesCircleIntersectGeometry({ x: 8.01, y: 0 }, 3, polygon)).toBe(false);
    expect(isPointInCleanableRegion({ x: 0, y: 0 }, circle, [{
      kind: "circle", center: { x: 0, y: 0 }, radius: 2,
    }])).toBe(false);
    expect(isPointInCleanableRegion({ x: 0, y: 0 }, circle, [{
      kind: "circle", center: { x: 20, y: 0 }, radius: 0,
    }])).toBe(false);
  });

  it("uses the minimum hit radius for placement containment and exclusions", () => {
    const exclusion: CleanableGeometry = { kind: "circle", center: { x: 5, y: 0 }, radius: 1 };
    expect(isValidTargetPlacement({ x: 0, y: 0 }, 2, 4, circle, [])).toBe(true);
    expect(isValidTargetPlacement({ x: 7, y: 0 }, 2, 4, circle, [])).toBe(false);
    expect(isValidTargetPlacement({ x: 0, y: 0 }, 2, 4, circle, [exclusion])).toBe(false);
  });

  it("treats configured cleanable surfaces as a union while honoring exclusions", () => {
    const surfaces = [
      {
        geometry: circle,
        exclusions: [{ kind: "circle", center: { x: 0, y: 0 }, radius: 2 }],
      },
      {
        geometry: { kind: "circle", center: { x: 30, y: 0 }, radius: 5 },
        exclusions: [],
      },
    ] as const;

    expect(isPointOnCleanableSurface({ x: 8, y: 0 }, surfaces)).toBe(true);
    expect(isPointOnCleanableSurface({ x: 0, y: 0 }, surfaces)).toBe(false);
    expect(isPointOnCleanableSurface({ x: 30, y: 0 }, surfaces)).toBe(true);
    expect(isPointOnCleanableSurface({ x: 20, y: 0 }, surfaces)).toBe(false);
  });

  it("rejects degenerate or non-finite definitions before use", () => {
    expect(isGeometryValid({ kind: "circle", center: { x: 0, y: 0 }, radius: 0 })).toBe(false);
    expect(isGeometryValid({
      kind: "capsule", start: { x: 1, y: 1 }, end: { x: 1, y: 1 }, radius: 2,
    })).toBe(false);
    expect(isGeometryValid({
      kind: "polygon", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
    })).toBe(false);
  });
});
