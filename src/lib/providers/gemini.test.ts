import { describe, it, expect } from "vitest";
import { gemini } from "./gemini";

describe("gemini adapter", () => {
  it("builds a request with key in the query string", () => {
    const req = gemini.buildRequest({ system: "sys", user: "hi" }, { apiKey: "g-key" });
    expect(req.url).toContain("generativelanguage.googleapis.com");
    expect(req.url).toContain("key=g-key");
  });
  it("parses the response text", () => {
    const json = { candidates: [{ content: { parts: [{ text: "from gemini" }] } }] };
    expect(gemini.parseResponse(json)).toBe("from gemini");
  });
  it("parses empty/missing candidates as empty string", () => {
    expect(gemini.parseResponse({})).toBe("");
    expect(gemini.parseResponse({ candidates: [] })).toBe("");
  });
});
