import { describe, it, expect } from "vitest";
import { isProjectSummary, flattenFacets, type ProjectSummary } from "./types";

const base: ProjectSummary = {
  valueProp: "v", targetUser: "u", keyFeatures: ["f"], tone: "t", keywords: ["k"]
};

describe("isProjectSummary — xFormat back-compat", () => {
  it("accepts a summary with no xFormat (legacy stored summary)", () => {
    expect(isProjectSummary(base)).toBe(true);
  });

  it("accepts xFormat 'tweet' and 'thread' with a reason", () => {
    expect(isProjectSummary({ ...base, xFormat: "tweet", xFormatReason: "short" })).toBe(true);
    expect(isProjectSummary({ ...base, xFormat: "thread", xFormatReason: "deep" })).toBe(true);
  });

  it("rejects an invalid xFormat value", () => {
    expect(isProjectSummary({ ...base, xFormat: "essay" })).toBe(false);
  });

  it("rejects a non-string xFormatReason", () => {
    expect(isProjectSummary({ ...base, xFormatReason: 5 })).toBe(false);
  });

  it("accepts xFormat: null (LLMs sometimes emit null instead of omitting)", () => {
    expect(isProjectSummary({ ...base, xFormat: null })).toBe(true);
  });

  it("accepts xFormatReason: null", () => {
    expect(isProjectSummary({ ...base, xFormatReason: null })).toBe(true);
  });
});

describe("flattenFacets still works", () => {
  it("falls back to flat keywords when no facets", () => {
    expect(flattenFacets(base)).toEqual(["k"]);
  });
});
