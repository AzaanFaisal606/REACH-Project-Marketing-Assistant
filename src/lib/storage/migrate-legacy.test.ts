import { describe, it, expect, beforeEach, vi } from "vitest";
import { migrateLegacySettings } from "./migrate-legacy";
import { storage } from "./storage";
import { obfuscate } from "./obfuscate";
import { memoryArea } from "@/test-utils/storage-area";

let data: Record<string, unknown>;
beforeEach(() => {
  data = {};
  (globalThis as any).chrome = {
    storage: {
      session: memoryArea(),
      local: {
        get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]))),
        set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(data, obj); }),
        remove: vi.fn(async (k: string | string[]) => { for (const key of [k].flat()) delete data[key]; })
      }
    }
  };
});

describe("migrateLegacySettings", () => {
  it("carries old settings over once, then removes the old fields", async () => {
    data = { provider: "gpt", apiKey: obfuscate("sk-old"), ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "llama3", cloudModels: { gpt: "gpt-5.5" } };
    await migrateLegacySettings();
    await migrateLegacySettings();
    expect(await storage.getProvider()).toBe("openai");
    const s = await storage.getProviderSettings();
    expect(s.apiKeys).toEqual({ openai: "sk-old" });
    expect(s.baseUrls).toEqual({ ollama: "http://localhost:11434/v1" });
    expect(s.models).toEqual({ ollama: "llama3", openai: "gpt-5.5" });
    expect(Object.keys(data).sort()).toEqual(["apiKeys", "baseUrls", "models", "provider"]);
  });
  it("keeps the old key when the old provider was Ollama, matching it by prefix", async () => {
    data = { provider: "ollama", apiKey: obfuscate("sk-ant-api03-x") };
    await migrateLegacySettings();
    expect((await storage.getProviderSettings()).apiKeys).toEqual({ claude: "sk-ant-api03-x" });
  });
  it("gives a key to the provider its prefix belongs to", async () => {
    data = { provider: "claude", apiKey: obfuscate("AIzaSyX") };
    await migrateLegacySettings();
    expect((await storage.getProviderSettings()).apiKeys).toEqual({ gemini: "AIzaSyX" });
  });
  it("gives an old key with no saved provider to Claude", async () => {
    data = { apiKey: obfuscate("sk-ant") };
    await migrateLegacySettings();
    expect((await storage.getProviderSettings()).apiKeys).toEqual({ claude: "sk-ant" });
  });
  it("drops an unrecognised key when the old provider was Ollama, and keeps an address that already ends in /v1", async () => {
    data = { provider: "ollama", apiKey: obfuscate("unused"), ollamaBaseUrl: "http://box:11434/v1/" };
    await migrateLegacySettings();
    const s = await storage.getProviderSettings();
    expect(s.apiKeys).toEqual({});
    expect(s.baseUrls).toEqual({ ollama: "http://box:11434/v1" });
  });
  it("does nothing on a fresh install", async () => {
    await migrateLegacySettings();
    expect(data).toEqual({});
  });
});
