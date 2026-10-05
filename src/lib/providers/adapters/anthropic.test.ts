import { describe, it, expect, vi, afterEach } from "vitest";
import { anthropic } from "./anthropic";

const c = { label: "Claude", baseUrl: "https://api.anthropic.com/v1", apiKey: "sk-ant-key", model: "claude-opus-5-5" };
const input = { system: "sys", user: "hi" };

afterEach(() => vi.unstubAllGlobals());

describe("anthropic adapter", () => {
  it("posts to {baseUrl}/messages with the browser-access header", () => {
    const req = anthropic.buildRequest(input, c);
    expect(req.url).toBe("https://api.anthropic.com/v1/messages");
    expect(req.headers.get("x-api-key")).toBe("sk-ant-key");
    expect(req.headers.get("anthropic-dangerous-direct-browser-access")).toBe("true");
    expect(req.headers.get("anthropic-version")).toBeTruthy();
  });
  it("sends the picked model with max_tokens 16000", async () => {
    const b = JSON.parse(await anthropic.buildRequest(input, c).text());
    expect([b.model, b.max_tokens, b.system]).toEqual(["claude-opus-5-5", 16000, "sys"]);
  });
  it("joins text blocks and skips thinking blocks", () => {
    expect(anthropic.parseResponse({ content: [{ type: "thinking", thinking: "" }, { type: "text", text: "hello world" }] })).toBe("hello world");
  });
  it("throws a clear error on an empty reply", () => {
    expect(() => anthropic.parseResponse({ content: [] })).toThrow(/empty reply/);
  });
  it("tests the key against the free models endpoint", () => {
    const req = anthropic.testRequest(c);
    expect(req.method).toBe("GET");
    expect(req.url).toBe("https://api.anthropic.com/v1/models?limit=1");
  });
  it("lists models across pages using display names", async () => {
    const pages = [
      { data: [{ id: "claude-opus-5-5", display_name: "Claude Opus 5.5" }], has_more: true, last_id: "claude-opus-5-5" },
      { data: [{ id: "claude-haiku-4-5", display_name: "Claude Haiku 4.5" }], has_more: false }
    ];
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (r: Request) => { urls.push(r.url); return new Response(JSON.stringify(pages.shift())); }));
    expect(await anthropic.listModels(c)).toEqual([
      { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" }
    ]);
    expect(urls[1]).toContain("after_id=claude-opus-5-5");
  });
});
