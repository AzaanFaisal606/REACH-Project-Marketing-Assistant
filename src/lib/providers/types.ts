export type ProviderId = "claude" | "gpt" | "gemini";

export interface GenerateInput {
  system: string;
  user: string;
}

export interface Provider {
  id: ProviderId;
  label: string;
  /** Build the fetch Request for a generation call. */
  buildRequest(input: GenerateInput, apiKey: string): Request;
  /** Parse the provider's JSON response into plain text. */
  parseResponse(json: unknown): string;
  /** Endpoint used by the "Test key" ping. */
  testRequest(apiKey: string): Request;
}

export async function generate(
  provider: Provider,
  input: GenerateInput,
  apiKey: string
): Promise<string> {
  const res = await fetch(provider.buildRequest(input, apiKey));
  if (!res.ok) {
    throw new Error(`${provider.label} error ${res.status}: ${await res.text()}`);
  }
  return provider.parseResponse(await res.json());
}
