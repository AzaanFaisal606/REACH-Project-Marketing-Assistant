import { describe, it, expect, vi, afterEach } from "vitest";
import { openaiCompat } from "./openai-compat";
import { generate } from "../types";

const c = { label: "DeepSeek", baseUrl: "https://api.deepseek.com", apiKey: "k", model: "deepseek-flash" };
const input = { system: "s", user: "u" };

afterEach(() => vi.unstubAllGlobals());

describe("openai-compatible adapter: requests", () => {
  it("posts to {baseUrl}/chat/completions sending only model + messages", async () => {
    const req = openaiCompat.buildRequest(input, c);
    expect(req.url).toBe("https://api.deepseek.com/chat/completions");
    const body = JSON.parse(await req.text());
    expect(Object.keys(body).sort()).toEqual(["messages", "model"]);
    expect(body.model).toBe("deepseek-flash");
  });
  it("sends a bearer key when there is one and none otherwise", () => {
    expect(openaiCompat.buildRequest(input, c).headers.get("authorization")).toBe("Bearer k");
    expect(openaiCompat.buildRequest(input, { ...c, apiKey: undefined }).headers.get("authorization")).toBeNull();
  });
  it("adds preset headers", () => {
    expect(openaiCompat.buildRequest(input, { ...c, headers: { "X-Title": "REACH" } }).headers.get("x-title")).toBe("REACH");
  });
});

describe("openai-compatible adapter: responses", () => {
  it("reads string content and strips <think> blocks", () => {
    expect(openaiCompat.parseResponse({ choices: [{ message: { content: "<think>hmm</think>\nHello" } }] })).toBe("Hello");
  });
  it("drops reasoning that only has a closing </think> tag", () => {
    expect(openaiCompat.parseResponse({ choices: [{ message: { content: "step one…\n</think>\n\nHello" } }] })).toBe("Hello");
  });
  it("reads content given as an array of text parts", () => {
    expect(openaiCompat.parseResponse({ choices: [{ message: { content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] } }] })).toBe("AB");
  });
  it("ignores a separate reasoning field", () => {
    expect(openaiCompat.parseResponse({ choices: [{ message: { content: "Post", reasoning_content: "thinking…" } }] })).toBe("Post");
  });
  it("throws on an error object inside a 200 response", () => {
    expect(() => openaiCompat.parseResponse({ error: { message: "quota exceeded" } })).toThrow(/quota exceeded/);
  });
  it("reads an error given as a plain string inside a 200 response", () => {
    expect(() => openaiCompat.parseResponse({ error: "Unexpected endpoint or method." })).toThrow("Unexpected endpoint or method.");
  });
  it("throws a clear error on an empty reply", () => {
    expect(() => openaiCompat.parseResponse({ choices: [{ message: { content: "<think>x</think>" } }] })).toThrow(/empty reply/);
  });
});

describe("openai-compatible adapter: models", () => {
  it("tests the connection against the free models endpoint", () => {
    const req = openaiCompat.testRequest(c);
    expect(req.method).toBe("GET");
    expect(req.url).toBe("https://api.deepseek.com/models");
  });
  it("lists models from data[], normalising ids and applying the filter", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [{ id: "models/gemini-2.5-flash" }, { id: "text-embedding-004" }] }))));
    const list = await openaiCompat.listModels({ ...c, modelFilter: (id) => !id.includes("embedding") });
    expect(list).toEqual([{ id: "gemini-2.5-flash", label: "gemini-2.5-flash" }]);
  });
  it("also accepts a models[] list with name fields", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ models: [{ name: "qwen3:8b" }] }))));
    expect(await openaiCompat.listModels(c)).toEqual([{ id: "qwen3:8b", label: "qwen3:8b" }]);
  });
  it("explains a rejected key", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 })));
    await expect(openaiCompat.listModels(c)).rejects.toThrow("DeepSeek error 401: Invalid API key");
  });
  it("turns a network failure into a readable error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const local = { ...c, baseUrl: "http://localhost:1234/v1" };
    await expect(openaiCompat.listModels(local)).rejects.toThrow("Can't reach http://localhost:1234/v1. Is the server running?");
    await expect(generate(openaiCompat, input, local)).rejects.toThrow(/Is the server running/);
  });
  it("explains a reply that isn't JSON (usually a wrong address)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<!doctype html><html></html>", { status: 200 })));
    const local = { ...c, label: "Custom", baseUrl: "http://localhost:5000" };
    await expect(openaiCompat.listModels(local)).rejects.toThrow("Custom sent back something unexpected. Check the address (it usually ends in /v1).");
    await expect(generate(openaiCompat, input, local)).rejects.toThrow(/usually ends in \/v1/);
  });
});
