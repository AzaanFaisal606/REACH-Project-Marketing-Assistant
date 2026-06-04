import { describe, it, expect } from "vitest";
import { flattenFacets, isProjectSummary, type ProjectSummary } from "./types";

const base: ProjectSummary = {
  valueProp: "v", targetUser: "t", keyFeatures: ["f"], tone: "x", keywords: ["fallback"]
};

describe("flattenFacets", () => {
  it("falls back to flat keywords when no facets present", () => {
    expect(flattenFacets(base)).toEqual(["fallback"]);
  });

  it("flattens facets in axis order, deduped", () => {
    const s: ProjectSummary = {
      ...base,
      keywords: ["pc building", "gamers", "Pakistan"],
      facets: {
        topic: ["pc building", "marketplace"],
        audience: ["gamers"],
        geography: ["Pakistan"],
        platform: ["web app"]
      }
    };
    expect(flattenFacets(s)).toEqual(["pc building", "marketplace", "gamers", "Pakistan", "web app"]);
  });

  it("appends flat keywords the facets missed", () => {
    const s: ProjectSummary = {
      ...base,
      keywords: ["pc building", "price tracker"],
      facets: { topic: ["pc building"] }
    };
    expect(flattenFacets(s)).toEqual(["pc building", "price tracker"]);
  });

  it("dedupes case-insensitively across facets and flat list", () => {
    const s: ProjectSummary = {
      ...base,
      keywords: ["pakistan"],
      facets: { geography: ["Pakistan"] }
    };
    expect(flattenFacets(s)).toEqual(["Pakistan"]);
  });
});

describe("isProjectSummary with facets", () => {
  it("accepts a summary with no facets", () => {
    expect(isProjectSummary(base)).toBe(true);
  });
  it("accepts well-formed facets", () => {
    expect(isProjectSummary({ ...base, facets: { geography: ["Pakistan"], topic: [] } })).toBe(true);
  });
  it("rejects facets with non-string arrays", () => {
    expect(isProjectSummary({ ...base, facets: { geography: [123] } })).toBe(false);
  });
  it("rejects facets that aren't an object", () => {
    expect(isProjectSummary({ ...base, facets: "Pakistan" })).toBe(false);
  });
});
