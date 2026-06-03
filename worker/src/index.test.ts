import { describe, it, expect, vi, afterEach } from "vitest";
import worker from "./index";

const env = { GITHUB_CLIENT_ID: "cid", GITHUB_CLIENT_SECRET: "secret" };
afterEach(() => vi.restoreAllMocks());

describe("oauth worker", () => {
  it("exchanges a code for a token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "gho_abc" }), {
        status: 200, headers: { "content-type": "application/json" }
      })
    );
    const req = new Request("https://w/exchange", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "xyz" })
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ access_token: "gho_abc" });
  });

  it("rejects non-POST", async () => {
    const res = await worker.fetch(new Request("https://w/exchange"), env);
    expect(res.status).toBe(405);
  });

  it("rejects missing code", async () => {
    const req = new Request("https://w/exchange", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}"
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 502 when GitHub returns a non-JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>500</html>", { status: 500, headers: { "content-type": "text/html" } })
    );
    const req = new Request("https://w/exchange", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "xyz" })
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(502);
  });
});
