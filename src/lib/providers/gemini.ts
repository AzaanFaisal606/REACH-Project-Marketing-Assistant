import type { Provider, GenerateInput } from "./types";

const MODEL = "gemini-2.0-flash";
const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const gemini: Provider = {
  id: "gemini",
  label: "Gemini",
  buildRequest(input: GenerateInput, apiKey: string): Request {
    return new Request(`${BASE}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: input.system }] },
        contents: [{ role: "user", parts: [{ text: input.user }] }]
      })
    });
  },
  parseResponse(json: unknown): string {
    const j = json as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return (j.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
  },
  testRequest(apiKey: string): Request {
    return new Request(`${BASE}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1 }
      })
    });
  }
};
