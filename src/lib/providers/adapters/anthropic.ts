import type { Provider, ProviderConfig, ModelOption } from "../types";
import { fetchModelsJson } from "../types";

// Claude's native Messages API. The only provider not on the OpenAI-compatible
// adapter: the native API is the supported path, and its models endpoint
// returns display names.

function headers(c: ProviderConfig): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": c.apiKey ?? "",
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  };
}

function modelsRequest(c: ProviderConfig, limit: number, afterId?: string): Request {
  const after = afterId ? `&after_id=${encodeURIComponent(afterId)}` : "";
  return new Request(`${c.baseUrl}/models?limit=${limit}${after}`, { headers: headers(c) });
}

export const anthropic: Provider = {
  id: "anthropic",
  buildRequest(input, c) {
    return new Request(`${c.baseUrl}/messages`, {
      method: "POST",
      headers: headers(c),
      body: JSON.stringify({
        model: c.model,
        // Newer Claude models think before answering, and thinking tokens count
        // toward max_tokens. A tight cap here cuts the actual post off mid-way.
        max_tokens: 16000,
        system: input.system,
        messages: [{ role: "user", content: input.user }]
      })
    });
  },
  parseResponse(json) {
    const j = json as { content?: Array<{ type: string; text?: string }> } | null;
    const text = (j?.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("The model returned an empty reply. Try another model.");
    return text;
  },
  testRequest(c) {
    return modelsRequest(c, 1);
  },
  async listModels(c): Promise<ModelOption[]> {
    // Every model Anthropic lists works with the Messages API, newest first.
    const out: ModelOption[] = [];
    let afterId: string | undefined;
    for (let page = 0; page < 10; page++) {
      const j = (await fetchModelsJson(c, modelsRequest(c, 1000, afterId))) as {
        data?: Array<{ id: string; display_name?: string }>;
        has_more?: boolean;
        last_id?: string;
      };
      for (const m of j.data ?? []) out.push({ id: m.id, label: m.display_name || m.id });
      if (!j.has_more || !j.last_id) break;
      afterId = j.last_id;
    }
    return out;
  }
};
