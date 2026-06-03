import type { Provider, GenerateInput } from "./types";

const URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

export const gpt: Provider = {
  id: "gpt",
  label: "GPT (OpenAI)",
  buildRequest(input: GenerateInput, apiKey: string): Request {
    return new Request(URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user }
        ]
      })
    });
  },
  parseResponse(json: unknown): string {
    const j = json as { choices?: Array<{ message?: { content?: string } }> };
    return (j.choices?.[0]?.message?.content ?? "").trim();
  },
  testRequest(apiKey: string): Request {
    return new Request(URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }]
      })
    });
  }
};
