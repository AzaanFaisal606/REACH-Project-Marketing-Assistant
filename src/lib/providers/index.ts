import type { Provider, ProviderId } from "./types";
import { claude } from "./claude";
import { gpt } from "./gpt";
import { gemini } from "./gemini";
import { ollama } from "./ollama";

export const PROVIDERS: Record<ProviderId, Provider> = { claude, gpt, gemini, ollama };
export function getProvider(id: ProviderId): Provider { return PROVIDERS[id]; }
export const PROVIDER_LIST: Provider[] = [claude, gpt, gemini, ollama];
export * from "./types";
