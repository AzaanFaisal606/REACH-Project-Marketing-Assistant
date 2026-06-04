import { describe, it, expect } from "vitest";
import { describeProviderError } from "./errors";

describe("describeProviderError", () => {
  it("extracts Google's quota message and retry delay on 429", () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        message: "You exceeded your current quota. Quota exceeded for metric: ...free_tier_requests, limit: 0",
        status: "RESOURCE_EXHAUSTED",
        details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "6s" }]
      }
    });
    const msg = describeProviderError("Gemini", 429, body);
    expect(msg).toMatch(/Gemini/);
    expect(msg).toMatch(/rate.?limit|quota/i);
    expect(msg).toMatch(/limit: 0|no free|quota/i); // the actionable detail survives
  });

  it("calls out a zero free-tier quota distinctly", () => {
    const body = JSON.stringify({
      error: { code: 429, message: "Quota exceeded ... limit: 0, model: gemini-2.0-flash", status: "RESOURCE_EXHAUSTED" }
    });
    const msg = describeProviderError("Gemini", 429, body);
    expect(msg).toMatch(/free.?tier|billing|limit: 0/i);
  });

  it("extracts an OpenAI-style error message", () => {
    const body = JSON.stringify({ error: { message: "Incorrect API key provided", type: "invalid_request_error" } });
    const msg = describeProviderError("GPT", 401, body);
    expect(msg).toMatch(/GPT/);
    expect(msg).toMatch(/Incorrect API key/);
  });

  it("gives a friendly generic 429 when the body has no detail", () => {
    const msg = describeProviderError("Claude", 429, "");
    expect(msg).toMatch(/Claude/);
    expect(msg).toMatch(/rate.?limit/i);
  });

  it("falls back to status text for non-JSON bodies", () => {
    const msg = describeProviderError("Gemini", 500, "<html>Internal Error</html>");
    expect(msg).toMatch(/Gemini/);
    expect(msg).toMatch(/500/);
  });

  it("truncates very long messages", () => {
    const long = "x".repeat(1000);
    const body = JSON.stringify({ error: { message: long } });
    const msg = describeProviderError("GPT", 400, body);
    expect(msg.length).toBeLessThan(400);
  });
});
