import type { Provider, ProviderConfig, ModelOption } from "../types";
import { fetchModelsJson } from "../types";

// One adapter for every OpenAI-style API: OpenAI, Gemini's compat endpoint,
// OpenRouter, DeepSeek, Kimi, Groq, xAI, Mistral, Ollama, LM Studio,
// llama.cpp, vLLM, … It is deliberately conservative so provider and model
// changes don't break it:
//  - send only `model` + `messages`. temperature / max_tokens / reasoning
//    settings are what differ between providers and models.
//  - read only `message.content` and strip inline <think> blocks that some
//    local reasoning models emit. Separate reasoning fields are ignored.

function headers(c: ProviderConfig): Record<string, string> {
  return {
    "content-type": "application/json",
    ...(c.apiKey ? { authorization: `Bearer ${c.apiKey}` } : {}),
    ...c.headers
  };
}

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

function contentText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map((p: { text?: string }) => p?.text ?? "").join("");
  return "";
}

type ModelEntry = { id?: string; name?: string };

export const openaiCompat: Provider = {
  id: "openai-compat",
  buildRequest(input, c) {
    return new Request(`${c.baseUrl}/chat/completions`, {
      method: "POST",
      headers: headers(c),
      body: JSON.stringify({
        model: c.model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user }
        ]
      })
    });
  },
  parseResponse(json) {
    const j = json as { error?: string | { message?: string }; choices?: Array<{ message?: { content?: unknown } }> } | null;
    if (j?.error) {
      // Most servers send { message }, some (LM Studio) send a plain string.
      throw new Error((typeof j.error === "string" ? j.error : j.error.message) || "The provider returned an error.");
    }
    const text = stripThinking(contentText(j?.choices?.[0]?.message?.content));
    if (!text) throw new Error("The model returned an empty reply. Try another model.");
    return text;
  },
  testRequest(c) {
    return new Request(`${c.baseUrl}/models`, { headers: headers(c) });
  },
  async listModels(c): Promise<ModelOption[]> {
    const j = (await fetchModelsJson(c, openaiCompat.testRequest(c))) as { data?: ModelEntry[]; models?: ModelEntry[] };
    return (j.data ?? j.models ?? [])
      .map((m) => (m.id ?? m.name ?? "").replace(/^models\//, ""))
      .filter((id) => id && (!c.modelFilter || c.modelFilter(id)))
      .map((id) => ({ id, label: id }));
  }
};
