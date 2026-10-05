import { describeProviderError } from "./errors";

/** The two wire formats REACH speaks. Every provider maps onto one of them. */
export type AdapterId = "anthropic" | "openai-compat";

export interface GenerateInput {
  system: string;
  user: string;
}

/** A resolved connection: which server, which key, which model. Built from a
 *  preset plus the user's saved settings (see connection.ts). */
export interface ProviderConfig {
  /** Shown in error messages, e.g. "DeepSeek error 401: …". */
  label: string;
  /** API root without a trailing slash, e.g. https://api.deepseek.com or http://localhost:1234/v1. */
  baseUrl: string;
  apiKey?: string;
  model: string;
  /** Extra request headers some providers want (e.g. OpenRouter's app name). */
  headers?: Record<string, string>;
  /** Drops non-chat models (embeddings, TTS, …) from the model list. */
  modelFilter?: (id: string) => boolean;
}

/** One entry in the model dropdown. */
export interface ModelOption {
  id: string;
  label: string;
}

/** A stateless adapter for one wire format. */
export interface Provider {
  id: AdapterId;
  buildRequest(input: GenerateInput, config: ProviderConfig): Request;
  /** Plain text of the reply. Throws on an in-band error or an empty reply. */
  parseResponse(json: unknown): string;
  /** "Test connection" request. Hits the free models endpoint, so it never spends tokens. */
  testRequest(config: ProviderConfig): Request;
  listModels(config: ProviderConfig): Promise<ModelOption[]>;
}

function unreachable(baseUrl: string): Error {
  return new Error(`Can't reach ${baseUrl}. Is the server running?`);
}

/** fetch() that turns "server not there" into a readable message. */
async function send(req: Request, baseUrl: string): Promise<Response> {
  try {
    return await fetch(req);
  } catch {
    throw unreachable(baseUrl);
  }
}

/** res.json(), but a non-JSON body (an HTML page from a wrong address) gets a readable message. */
async function readJson(res: Response, config: ProviderConfig): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new Error(`${config.label} sent back something unexpected. Check the address (it usually ends in /v1).`);
  }
}

/** Fetch JSON for a model listing, turning HTTP errors into readable messages. */
export async function fetchModelsJson(config: ProviderConfig, req: Request): Promise<unknown> {
  const res = await send(req, config.baseUrl);
  if (!res.ok) {
    throw new Error(describeProviderError(config.label, res.status, await res.text()));
  }
  return readJson(res, config);
}

export async function generate(
  provider: Provider,
  input: GenerateInput,
  config: ProviderConfig
): Promise<string> {
  const res = await send(provider.buildRequest(input, config), config.baseUrl);
  if (!res.ok) {
    throw new Error(describeProviderError(config.label, res.status, await res.text()));
  }
  return provider.parseResponse(await readJson(res, config));
}
