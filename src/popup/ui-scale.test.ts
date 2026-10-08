import { describe, it, expect } from "vitest";
import { popupHeight, uiScale, MIN_SCALE, MAX_SCALE } from "./ui-scale";

describe("uiScale", () => {
  it("uses the minimum on small or OS-scaled screens", () => {
    expect(uiScale(768)).toBe(MIN_SCALE);
    expect(uiScale(900)).toBe(MIN_SCALE);
  });

  it("grows with taller screens", () => {
    expect(uiScale(950)).toBeGreaterThan(MIN_SCALE);
    expect(uiScale(1000)).toBeGreaterThan(uiScale(950));
  });

  it("caps on very tall screens", () => {
    expect(uiScale(1440)).toBe(MAX_SCALE);
    expect(uiScale(2160)).toBe(MAX_SCALE);
  });

  it("falls back to the minimum for bad input", () => {
    expect(uiScale(0)).toBe(MIN_SCALE);
    expect(uiScale(Number.NaN)).toBe(MIN_SCALE);
  });
});

describe("popupHeight", () => {
  it("fills Chrome's 600px popup limit after zoom", () => {
    expect(popupHeight(1)).toBe(600);
    expect(popupHeight(1.15) * 1.15).toBeLessThanOrEqual(600);
    expect(popupHeight(1.15) * 1.15).toBeGreaterThan(598);
  });
});
