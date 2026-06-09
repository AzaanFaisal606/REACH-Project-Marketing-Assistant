import type { Provider, GenerateInput, ProviderConfig } from "./types";

function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export const ollama: Provider = {
  id: "ollama",
  label: "Ollama (local)",
  buildRequest(input: GenerateInput, config: ProviderConfig): Request {
    const base = normalizeBase(config.baseUrl ?? "http://localhost:11434");
    return new Request(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: config.model ?? "",
        stream: false,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user }
        ]
      })
    });
  },
  parseResponse(json: unknown): string {
    const j = json as { message?: { role?: string; content?: string } } | null;
    return (j?.message?.content ?? "").trim();
  },
  testRequest(config: ProviderConfig): Request {
    const base = normalizeBase(config.baseUrl ?? "http://localhost:11434");
    return new Request(`${base}/api/tags`);
  }
};

/** List model names installed on the local Ollama server.
 *  Throws (does NOT swallow) on non-ok, network error, or malformed JSON so the
 *  UI can surface the problem. An empty `models` array (daemon up, nothing pulled)
 *  is valid — returns `[]`. */
export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  const base = normalizeBase(baseUrl);
  const url = `${base}/api/tags`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`Cannot reach Ollama at ${base}: ${(e as Error).message}`);
  }
  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status} from ${url}`);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Ollama response from ${url} is not valid JSON`);
  }
  const b = body as { models?: Array<{ name: string }> };
  if (!Array.isArray(b.models)) {
    throw new Error(`Unexpected Ollama response shape: missing "models" array`);
  }
  return b.models.map((m) => m.name).filter((n): n is string => typeof n === "string");
}
