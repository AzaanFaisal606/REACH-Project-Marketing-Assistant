import type { Provider, GenerateInput, ProviderConfig } from "./types";

const URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";

export const claude: Provider = {
  id: "claude",
  label: "Claude",
  buildRequest(input: GenerateInput, config: ProviderConfig): Request {
    const apiKey = config.apiKey ?? "";
    return new Request(URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: input.system,
        messages: [{ role: "user", content: input.user }]
      })
    });
  },
  parseResponse(json: unknown): string {
    const j = json as { content?: Array<{ type: string; text?: string }> };
    return (j.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
  },
  testRequest(config: ProviderConfig): Request {
    const apiKey = config.apiKey ?? "";
    return new Request(URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }]
      })
    });
  }
};
