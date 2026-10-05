import type { AdapterId, Provider } from "../types";
import { anthropic } from "./anthropic";
import { openaiCompat } from "./openai-compat";

export const ADAPTERS: Record<AdapterId, Provider> = {
  anthropic,
  "openai-compat": openaiCompat
};
