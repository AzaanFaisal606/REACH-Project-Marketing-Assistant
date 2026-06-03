import { describe, it, expect, vi } from "vitest";
import { analyze } from "./analyze";
import type { Provider } from "@/lib/providers/types";

function fakeProvider(responses: string[]): Provider {
  let i = 0;
  return {
    id: "claude",
    label: "Fake",
    buildRequest: () => new Request("https://example.com"),
    parseResponse: () => responses[Math.min(i++, responses.length - 1)],
    testRequest: () => new Request("https://example.com")
  };
}

describe("analyze", () => {
  it("parses clean JSON", async () => {
    const json = JSON.stringify({
      valueProp: "v", targetUser: "t", keyFeatures: ["a"], tone: "technical", keywords: ["k1"]
    });
    const gen = vi.fn(async () => json);
    const out = await analyze("ctx", fakeProvider([json]), "key", gen);
    expect(out.keywords).toEqual(["k1"]);
  });

  it("strips markdown fences", async () => {
    const inner = JSON.stringify({
      valueProp: "v", targetUser: "t", keyFeatures: ["a"], tone: "x", keywords: ["k"]
    });
    const fenced = "```json\n" + inner + "\n```";
    const gen = vi.fn(async () => fenced);
    const out = await analyze("ctx", fakeProvider([fenced]), "key", gen);
    expect(out.valueProp).toBe("v");
  });

  it("retries once on invalid JSON then succeeds", async () => {
    const good = JSON.stringify({
      valueProp: "v", targetUser: "t", keyFeatures: ["a"], tone: "x", keywords: ["k"]
    });
    const gen = vi.fn()
      .mockResolvedValueOnce("not json at all")
      .mockResolvedValueOnce(good);
    const out = await analyze("ctx", fakeProvider(["x"]), "key", gen);
    expect(gen).toHaveBeenCalledTimes(2);
    expect(out.tone).toBe("x");
  });

  it("throws after a failed retry", async () => {
    const gen = vi.fn().mockResolvedValue("still not json");
    await expect(analyze("ctx", fakeProvider(["x"]), "key", gen)).rejects.toThrow();
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it("rejects a summary whose array fields contain non-strings", async () => {
    const bad = JSON.stringify({
      valueProp: "v", targetUser: "t", keyFeatures: [{ text: "x" }], tone: "x", keywords: ["k"]
    });
    // both attempts return the same structurally-invalid payload → should throw after retry
    const gen = vi.fn().mockResolvedValue(bad);
    await expect(analyze("ctx", fakeProvider(["x"]), "key", gen)).rejects.toThrow();
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it("does not retry when gen throws a non-parse error", async () => {
    const gen = vi.fn().mockRejectedValue(new TypeError("network exploded"));
    await expect(analyze("ctx", fakeProvider(["x"]), "key", gen)).rejects.toThrow("network exploded");
    expect(gen).toHaveBeenCalledTimes(1); // no retry on a real error
  });
});
