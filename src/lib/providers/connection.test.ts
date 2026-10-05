import { describe, it, expect } from "vitest";
import { resolveConnection, isReady, type ProviderSettings } from "./connection";

const empty: ProviderSettings = { apiKeys: {}, baseUrls: {}, models: {} };

describe("resolveConnection", () => {
  it("uses a saved base URL, trimming trailing slashes", () => {
    const { config } = resolveConnection("vllm", { ...empty, baseUrls: { vllm: "http://box:8000/v1/" }, models: { vllm: "m" } });
    expect(config.baseUrl).toBe("http://box:8000/v1");
  });
  it("accepts a pasted full endpoint by dropping /chat/completions", () => {
    const { config } = resolveConnection("custom", { ...empty, baseUrls: { custom: " http://box:8000/v1/chat/completions/ " } });
    expect(config.baseUrl).toBe("http://box:8000/v1");
  });
  it("falls back to the preset's base URL and default model", () => {
    const { config, adapter } = resolveConnection("claude", { ...empty, apiKeys: { claude: "k" } });
    expect(config).toMatchObject({ label: "Claude", baseUrl: "https://api.anthropic.com/v1", apiKey: "k", model: "claude-opus-5-5" });
    expect(adapter.id).toBe("anthropic");
  });
  it("carries preset headers and model filter", () => {
    expect(resolveConnection("openrouter", empty).config.headers?.["X-Title"]).toBe("REACH");
    expect(resolveConnection("openai", empty).config.modelFilter?.("text-embedding-3-small")).toBe(false);
  });
  it("never sends a key for keyless presets", () => {
    expect(resolveConnection("lmstudio", { ...empty, apiKeys: { lmstudio: "stale" } }).config.apiKey).toBeUndefined();
  });
  it("throws for an unknown preset id", () => {
    expect(() => resolveConnection("nope", empty)).toThrow(/Unknown provider/);
  });
});

describe("isReady", () => {
  it("needs a key when the preset requires one", () => {
    expect(isReady("deepseek", { ...empty, models: { deepseek: "m" } })).toBe(false);
    expect(isReady("deepseek", { ...empty, apiKeys: { deepseek: "k" }, models: { deepseek: "m" } })).toBe(true);
  });
  it("needs a model unless the preset has a default", () => {
    expect(isReady("lmstudio", empty)).toBe(false);
    expect(isReady("lmstudio", { ...empty, models: { lmstudio: "qwen" } })).toBe(true);
    expect(isReady("claude", { ...empty, apiKeys: { claude: "k" } })).toBe(true);
  });
  it("needs an address for custom", () => {
    expect(isReady("custom", { ...empty, models: { custom: "m" } })).toBe(false);
    expect(isReady("custom", { ...empty, baseUrls: { custom: "http://h/v1" }, models: { custom: "m" } })).toBe(true);
    expect(isReady("custom", { ...empty, baseUrls: { custom: "localhost:1234/v1" }, models: { custom: "m" } })).toBe(false);
  });
  it("is false for an unknown preset", () => {
    expect(isReady("nope", empty)).toBe(false);
  });
});
