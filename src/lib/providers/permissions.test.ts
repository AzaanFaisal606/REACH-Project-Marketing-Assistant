import { describe, it, expect, vi, afterEach } from "vitest";
import { originPattern, hostOf, hasAccess, requestAccess, isValidAddress } from "./permissions";

afterEach(() => vi.unstubAllGlobals());

describe("permissions", () => {
  it("builds a port-less origin pattern (match patterns ignore ports)", () => {
    expect(originPattern("http://localhost:1234/v1")).toBe("http://localhost/*");
    expect(originPattern("https://openrouter.ai/api/v1")).toBe("https://openrouter.ai/*");
  });
  it("reports the host for messages", () => {
    expect(hostOf("https://api.groq.com/openai/v1")).toBe("api.groq.com");
  });
  it("checks and requests via chrome.permissions", async () => {
    const contains = vi.fn(async () => false);
    const request = vi.fn(async () => true);
    vi.stubGlobal("chrome", { permissions: { contains, request } });
    expect(await hasAccess("https://api.x.ai/v1")).toBe(false);
    expect(contains).toHaveBeenCalledWith({ origins: ["https://api.x.ai/*"] });
    expect(await requestAccess("https://api.x.ai/v1")).toBe(true);
    expect(request).toHaveBeenCalledWith({ origins: ["https://api.x.ai/*"] });
  });
  it("treats an empty or invalid address as no access", async () => {
    vi.stubGlobal("chrome", { permissions: { contains: vi.fn(async () => true), request: vi.fn(async () => true) } });
    expect(await hasAccess("")).toBe(false);
    expect(await requestAccess("not a url")).toBe(false);
  });
  it("rejects addresses without http:// or https://", () => {
    expect(isValidAddress("http://localhost:1234/v1")).toBe(true);
    expect(isValidAddress("https://api.x.ai/v1")).toBe(true);
    expect(isValidAddress("localhost:1234/v1")).toBe(false); // parses as protocol "localhost:"
    expect(isValidAddress("192.168.1.5:8000/v1")).toBe(false);
    expect(isValidAddress("ftp://box/v1")).toBe(false);
    expect(originPattern("localhost:1234/v1")).toBe("");
  });
  it("reports no access instead of throwing when Chrome rejects the pattern", async () => {
    vi.stubGlobal("chrome", { permissions: { contains: vi.fn(async () => { throw new Error("Invalid pattern"); }) } });
    expect(await hasAccess("http://localhost:1234/v1")).toBe(false);
  });
});
