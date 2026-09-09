import { describe, expect, it } from "vitest";
import { segmentIntersectsCircle } from "./geometry";

describe("segmentIntersectsCircle", () => {
  it("detects a scrape crossing a target", () => {
    expect(segmentIntersectsCircle({ x: 0, y: 10 }, { x: 20, y: 10 }, { x: 10, y: 10 }, 3)).toBe(true);
  });

  it("rejects movement outside the target", () => {
    expect(segmentIntersectsCircle({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 10 }, 3)).toBe(false);
  });
});
