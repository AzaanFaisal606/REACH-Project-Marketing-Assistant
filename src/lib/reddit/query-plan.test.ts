import { describe, it, expect } from "vitest";
import { buildQueryPlan } from "./query-plan";
import type { ProjectSummary } from "@/lib/analysis/types";

const base: ProjectSummary = {
  valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: []
};

describe("buildQueryPlan", () => {
  it("falls back to flat keywords when no facets", () => {
    const plan = buildQueryPlan({ ...base, keywords: ["alpha", "beta", "gamma"] });
    expect(plan).toContain("alpha");
    expect(plan).toContain("beta");
  });

  it("includes a bare geography query and geography×topic crosses", () => {
    const plan = buildQueryPlan({
      ...base,
      keywords: ["pc building", "gamers", "Pakistan"],
      facets: { topic: ["pc building"], audience: ["gamers"], geography: ["Pakistan"] }
    });
    expect(plan).toContain("Pakistan");                 // the audience's place itself
    expect(plan).toContain("Pakistan pc building");      // niche geo+topic sub
    // geography-related queries must come before generic topic-only ones,
    // so they're searched before the early-stop / rate limit can cut them off
    expect(plan.indexOf("Pakistan")).toBeLessThan(plan.indexOf("pc building"));
  });

  it("does not invent geography queries when there is none", () => {
    const plan = buildQueryPlan({
      ...base,
      keywords: ["devtools", "api"],
      facets: { topic: ["devtools"], platform: ["api"] }
    });
    expect(plan).toEqual(expect.arrayContaining(["devtools", "api"]));
    expect(plan.some((q) => /\s/.test(q))).toBe(false); // no cross queries fabricated
  });

  it("dedupes and trims", () => {
    const plan = buildQueryPlan({
      ...base,
      keywords: ["pc building", "PC Building"],
      facets: { topic: ["pc building", " PC Building "] }
    });
    const lower = plan.map((p) => p.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it("caps the number of queries", () => {
    const many = Array.from({ length: 30 }, (_, i) => `kw${i}`);
    const plan = buildQueryPlan({ ...base, keywords: many, facets: { topic: many } });
    expect(plan.length).toBeLessThanOrEqual(6);
  });
});
