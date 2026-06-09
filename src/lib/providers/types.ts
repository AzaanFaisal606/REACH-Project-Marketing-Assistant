import { describeProviderError } from "./errors";

export type ProviderId = "claude" | "gpt" | "gemini" | "ollama";

export interface GenerateInput {
  system: string;
  user: string;
}

/** Connection config for a generation call. Cloud providers use `apiKey`;
 *  local providers (Ollama) use `baseUrl` + `model`. */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface Provider {
  id: ProviderId;
  label: string;
  /** Build the fetch Request for a generation call. */
  buildRequest(input: GenerateInput, config: ProviderConfig): Request;
  /** Parse the provider's JSON response into plain text. */
  parseResponse(json: unknown): string;
  /** Endpoint used by the "Test key" ping. */
  testRequest(config: ProviderConfig): Request;
}

export async function generate(
  provider: Provider,
  input: GenerateInput,
  config: ProviderConfig
): Promise<string> {
  const res = await fetch(provider.buildRequest(input, config));
  if (!res.ok) {
    throw new Error(describeProviderError(provider.label, res.status, await res.text()));
  }
  return provider.parseResponse(await res.json());
}
