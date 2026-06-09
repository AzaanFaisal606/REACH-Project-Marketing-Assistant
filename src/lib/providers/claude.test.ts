import { describe, it, expect } from "vitest";
import { claude } from "./claude";

describe("claude adapter", () => {
  it("builds a request with the direct-browser header", () => {
    const req = claude.buildRequest({ system: "sys", user: "hi" }, { apiKey: "sk-ant-key" });
    expect(req.url).toBe("https://api.anthropic.com/v1/messages");
    expect(req.headers.get("x-api-key")).toBe("sk-ant-key");
    expect(req.headers.get("anthropic-dangerous-direct-browser-access")).toBe("true");
    expect(req.headers.get("anthropic-version")).toBeTruthy();
  });
  it("parses the response text", () => {
    const json = { content: [{ type: "text", text: "hello world" }] };
    expect(claude.parseResponse(json)).toBe("hello world");
  });
  it("parses empty/missing content as empty string", () => {
    expect(claude.parseResponse({})).toBe("");
    expect(claude.parseResponse({ content: [] })).toBe("");
  });
});
