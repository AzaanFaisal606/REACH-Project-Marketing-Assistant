import { describe, it, expect } from "vitest";
import { buildSubmitUrl, TITLE_MAX } from "./submit-url";

describe("buildSubmitUrl", () => {
  it("builds an encoded submit URL", () => {
    const url = buildSubmitUrl("webdev", "Hello & welcome", "Body with spaces");
    expect(url).toBe(
      "https://www.reddit.com/r/webdev/submit?title=Hello%20%26%20welcome&text=Body%20with%20spaces"
    );
  });
  it("flags titles over the limit", () => {
    const longTitle = "x".repeat(TITLE_MAX + 1);
    expect(() => buildSubmitUrl("webdev", longTitle, "body")).toThrow(/title/i);
  });
});
