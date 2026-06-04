import { describe, it, expect } from "vitest";
import { restrictsSelfPromotion } from "./restrictions";
import type { SubredditRule } from "./rules";

const rule = (name: string, description = ""): SubredditRule => ({ name, description });

describe("restrictsSelfPromotion", () => {
  it("flags an explicit no-self-promotion rule", () => {
    expect(restrictsSelfPromotion([rule("No self-promotion")])).toBe(true);
  });

  it("flags variants in the description text", () => {
    expect(restrictsSelfPromotion([rule("Posting", "Do not advertise your own product here.")])).toBe(true);
    expect(restrictsSelfPromotion([rule("Rule 3", "No self promo of any kind.")])).toBe(true);
    expect(restrictsSelfPromotion([rule("Spam", "Spam and promotion are not allowed.")])).toBe(true);
  });

  it("does not flag subs with no promo restriction", () => {
    expect(restrictsSelfPromotion([rule("Be civil"), rule("No memes", "Keep it on topic.")])).toBe(false);
  });

  it("does not flag rules that merely allow self-promotion", () => {
    expect(restrictsSelfPromotion([rule("Self-promotion", "Self-promotion is allowed on weekends.")])).toBe(false);
  });

  it("returns false for empty rules", () => {
    expect(restrictsSelfPromotion([])).toBe(false);
  });
});
