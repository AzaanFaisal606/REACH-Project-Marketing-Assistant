import { describe, it, expect } from "vitest";
import { PRESETS, getPreset, DEFAULT_PRESET_ID } from "./presets";

describe("provider presets", () => {
  it("has unique ids and covers every planned provider", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      "claude", "openai", "gemini", "openrouter", "deepseek", "kimi", "groq", "xai", "mistral",
      "ollama-cloud", "ollama", "lmstudio", "llamacpp", "vllm", "custom"
    ]));
  });
  it("cloud presets use https and link to a key page", () => {
    for (const p of PRESETS.filter((p) => p.group === "cloud")) {
      expect(p.baseUrl.startsWith("https://"), p.id).toBe(true);
      expect(p.keyUrl, p.id).toMatch(/^https:\/\//);
      expect(p.key, p.id).toBe("required");
    }
  });
  it("base URLs are valid and have no trailing slash", () => {
    for (const p of PRESETS.filter((p) => p.baseUrl)) {
      expect(() => new URL(p.baseUrl), p.id).not.toThrow();
      expect(p.baseUrl.endsWith("/"), p.id).toBe(false);
    }
  });
  it("only Claude uses the Anthropic adapter", () => {
    expect(PRESETS.filter((p) => p.adapter === "anthropic").map((p) => p.id)).toEqual(["claude"]);
  });
  it("custom starts with no address and local servers need no key", () => {
    expect(getPreset("custom")?.baseUrl).toBe("");
    expect(getPreset("lmstudio")?.key).toBe("none");
    expect(getPreset("vllm")?.key).toBe("optional");
  });
  it("looks presets up by id", () => {
    expect(getPreset(DEFAULT_PRESET_ID)?.label).toBe("Claude");
    expect(getPreset("gpt")).toBeUndefined();
  });
});
