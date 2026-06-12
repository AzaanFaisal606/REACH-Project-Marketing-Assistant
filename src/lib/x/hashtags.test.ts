import { describe, it, expect } from "vitest";
import { HASHTAG_TAXONOMY, filterHashtags } from "./hashtags";
import type { ProjectSummary } from "@/lib/analysis/types";

function summaryWith(over: Partial<ProjectSummary>): ProjectSummary {
  return { valueProp: "v", targetUser: "u", keyFeatures: ["f"], tone: "t", keywords: [], ...over };
}

describe("HASHTAG_TAXONOMY", () => {
  it("has all four categories, each non-empty, all tags start with #", () => {
    for (const cat of ["stack", "domain", "audience", "format"] as const) {
      expect(HASHTAG_TAXONOMY[cat].length).toBeGreaterThan(0);
      for (const tag of HASHTAG_TAXONOMY[cat]) expect(tag.startsWith("#")).toBe(true);
    }
  });
});

describe("filterHashtags", () => {
  it("never returns an empty list (broad fallback)", () => {
    expect(filterHashtags(summaryWith({})).length).toBeGreaterThan(0);
  });

  it("surfaces a stack tag when the platform facet names a known stack", () => {
    const out = filterHashtags(summaryWith({ facets: { platform: ["react"] } }));
    expect(out).toContain("#react");
  });

  it("always includes the build-in-public format tag as a candidate", () => {
    expect(filterHashtags(summaryWith({}))).toContain("#buildinpublic");
  });

  it("returns a de-duped list", () => {
    const out = filterHashtags(summaryWith({ keywords: ["react", "react"], facets: { platform: ["react"] } }));
    expect(out.length).toBe(new Set(out).size);
  });

  it("surfaces a domain tag when a topic facet names a known domain", () => {
    const out = filterHashtags(summaryWith({ facets: { topic: ["fintech"] } }));
    expect(out).toContain("#fintech");
  });

  it("includes the broad fallback set when no topical tag matches", () => {
    const out = filterHashtags(summaryWith({ keywords: ["zzqqxx"] }));
    expect(out).toContain("#developers");
    expect(out).toContain("#opensource");
  });
});
