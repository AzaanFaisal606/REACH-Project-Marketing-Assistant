import { describe, it, expect } from "vitest";
import { isChatModelId, isGeminiTextModel } from "./model-filters";

describe("isChatModelId (OpenAI)", () => {
  it("keeps chat models and drops specialised ones and dated snapshots", () => {
    for (const id of ["gpt-5.5", "gpt-5.4-mini", "o3", "o4-mini", "gpt-4o"]) expect(isChatModelId(id)).toBe(true);
    for (const id of ["text-embedding-3-large", "gpt-image-2", "gpt-4o-mini-tts", "gpt-realtime", "whisper-1",
      "gpt-5-2025-08-07", "gpt-4-0613", "gpt-5.5-pro", "gpt-5.1-codex", "o3-deep-research", "dall-e-3"]) {
      expect(isChatModelId(id)).toBe(false);
    }
  });
});

describe("isGeminiTextModel", () => {
  it("keeps Gemini text models only", () => {
    expect(isGeminiTextModel("gemini-2.5-flash")).toBe(true);
    for (const id of ["text-embedding-004", "gemini-2.5-flash-preview-tts", "gemini-2.0-flash-live-001", "gemma-3-27b-it", "imagen-4.0"]) {
      expect(isGeminiTextModel(id)).toBe(false);
    }
  });
});
