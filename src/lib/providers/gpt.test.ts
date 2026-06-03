import { describe, it, expect } from "vitest";
import { gpt } from "./gpt";

describe("gpt adapter", () => {
  it("builds a bearer-auth request", () => {
    const req = gpt.buildRequest({ system: "sys", user: "hi" }, "sk-openai");
    expect(req.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(req.headers.get("authorization")).toBe("Bearer sk-openai");
  });
  it("parses the response text", () => {
    const json = { choices: [{ message: { content: "from gpt" } }] };
    expect(gpt.parseResponse(json)).toBe("from gpt");
  });
  it("parses empty/missing choices as empty string", () => {
    expect(gpt.parseResponse({})).toBe("");
    expect(gpt.parseResponse({ choices: [{ message: {} }] })).toBe("");
  });
});
