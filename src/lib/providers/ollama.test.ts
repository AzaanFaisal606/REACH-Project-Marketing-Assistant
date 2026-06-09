import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ollama } from "./ollama";
import { listOllamaModels } from "./ollama";

// ── buildRequest ─────────────────────────────────────────────────────────────

describe("ollama adapter — buildRequest", () => {
  it("POSTs to /api/chat on the configured baseUrl", async () => {
    const req = ollama.buildRequest(
      { system: "sys", user: "hi" },
      { baseUrl: "http://localhost:11434", model: "llama3.2:latest" }
    );
    expect(req.method).toBe("POST");
    expect(req.url).toBe("http://localhost:11434/api/chat");
  });

  it("sends model and stream:false in the body", async () => {
    const req = ollama.buildRequest(
      { system: "sys", user: "hi" },
      { baseUrl: "http://localhost:11434", model: "mistral:latest" }
    );
    const body = JSON.parse(await req.text());
    expect(body.model).toBe("mistral:latest");
    expect(body.stream).toBe(false);
  });

  it("sends system + user messages in the body", async () => {
    const req = ollama.buildRequest(
      { system: "Be concise", user: "Hello" },
      { baseUrl: "http://localhost:11434", model: "llama3.2:latest" }
    );
    const body = JSON.parse(await req.text());
    expect(body.messages).toEqual([
      { role: "system", content: "Be concise" },
      { role: "user", content: "Hello" }
    ]);
  });

  it("sets content-type header", () => {
    const req = ollama.buildRequest(
      { system: "s", user: "u" },
      { baseUrl: "http://localhost:11434", model: "llama3.2:latest" }
    );
    expect(req.headers.get("content-type")).toBe("application/json");
  });

  it("normalises a trailing slash in baseUrl", async () => {
    const req = ollama.buildRequest(
      { system: "s", user: "u" },
      { baseUrl: "http://localhost:11434/", model: "llama3.2:latest" }
    );
    expect(req.url).toBe("http://localhost:11434/api/chat");
  });

  it("normalises multiple trailing slashes", async () => {
    const req = ollama.buildRequest(
      { system: "s", user: "u" },
      { baseUrl: "http://localhost:11434///", model: "llama3.2:latest" }
    );
    expect(req.url).toBe("http://localhost:11434/api/chat");
  });
});

// ── parseResponse ─────────────────────────────────────────────────────────────

describe("ollama adapter — parseResponse", () => {
  it("extracts content from the message field", () => {
    const json = { message: { role: "assistant", content: "hello from ollama" } };
    expect(ollama.parseResponse(json)).toBe("hello from ollama");
  });

  it("trims whitespace from the response", () => {
    const json = { message: { role: "assistant", content: "  trimmed  " } };
    expect(ollama.parseResponse(json)).toBe("trimmed");
  });

  it("returns empty string when message is missing", () => {
    expect(ollama.parseResponse({})).toBe("");
  });

  it("returns empty string when content is missing", () => {
    expect(ollama.parseResponse({ message: { role: "assistant" } })).toBe("");
  });

  it("returns empty string for a null payload", () => {
    expect(ollama.parseResponse(null)).toBe("");
  });
});

// ── testRequest ───────────────────────────────────────────────────────────────

describe("ollama adapter — testRequest", () => {
  it("GETs /api/tags on the configured baseUrl", () => {
    const req = ollama.testRequest({ baseUrl: "http://localhost:11434" });
    expect(req.method).toBe("GET");
    expect(req.url).toBe("http://localhost:11434/api/tags");
  });

  it("normalises a trailing slash for testRequest", () => {
    const req = ollama.testRequest({ baseUrl: "http://localhost:11434/" });
    expect(req.url).toBe("http://localhost:11434/api/tags");
  });
});

// ── listOllamaModels ──────────────────────────────────────────────────────────

describe("listOllamaModels", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an array of model names on success", async () => {
    (globalThis.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValue(
      new Response(
        JSON.stringify({ models: [{ name: "llama3.2:latest" }, { name: "mistral:latest" }] }),
        { status: 200 }
      )
    );
    const models = await listOllamaModels("http://localhost:11434");
    expect(models).toEqual(["llama3.2:latest", "mistral:latest"]);
  });

  it("returns an empty array when models list is empty", async () => {
    (globalThis.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValue(
      new Response(JSON.stringify({ models: [] }), { status: 200 })
    );
    const models = await listOllamaModels("http://localhost:11434");
    expect(models).toEqual([]);
  });

  it("normalises trailing slash in the baseUrl", async () => {
    (globalThis.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValue(
      new Response(JSON.stringify({ models: [{ name: "phi3:mini" }] }), { status: 200 })
    );
    const models = await listOllamaModels("http://localhost:11434/");
    expect(models).toEqual(["phi3:mini"]);
    expect((globalThis.fetch as ReturnType<typeof vi.spyOn>).mock.calls[0][0])
      .toBe("http://localhost:11434/api/tags");
  });

  it("throws on a non-ok response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValue(
      new Response("connection refused", { status: 503 })
    );
    await expect(listOllamaModels("http://localhost:11434")).rejects.toThrow("503");
  });

  it("throws on a network error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValue(
      new TypeError("Failed to fetch")
    );
    await expect(listOllamaModels("http://localhost:11434")).rejects.toThrow("Failed to fetch");
  });

  it("throws on malformed JSON", async () => {
    (globalThis.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValue(
      new Response("not json", { status: 200 })
    );
    await expect(listOllamaModels("http://localhost:11434")).rejects.toThrow();
  });

  it("throws when models field is missing", async () => {
    (globalThis.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValue(
      new Response(JSON.stringify({ something: "else" }), { status: 200 })
    );
    await expect(listOllamaModels("http://localhost:11434")).rejects.toThrow("models");
  });
});
