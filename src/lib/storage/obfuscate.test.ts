import { describe, it, expect } from "vitest";
import { obfuscate, deobfuscate } from "./obfuscate";

describe("obfuscate", () => {
  it("round-trips a string", () => {
    const secret = "sk-ant-12345-XYZ";
    expect(deobfuscate(obfuscate(secret))).toBe(secret);
  });
  it("does not store plaintext", () => {
    const secret = "sk-ant-plaintext";
    expect(obfuscate(secret)).not.toContain("plaintext");
  });
  it("handles empty string", () => {
    expect(deobfuscate(obfuscate(""))).toBe("");
  });
});
