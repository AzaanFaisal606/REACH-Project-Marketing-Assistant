import type { AdapterId } from "./types";
import { isChatModelId, isGeminiTextModel } from "./model-filters";

// Every provider REACH offers, as data. Adding one = adding an entry here.
// Provider quirks live in these fields, never in `if (id === …)` branches.

export type PresetGroup = "cloud" | "local" | "custom";

export interface ProviderPreset {
  id: string;
  group: PresetGroup;
  label: string;
  adapter: AdapterId;
  /** API root without a trailing slash. Empty only for Custom. Editable for local/custom. */
  baseUrl: string;
  key: "required" | "optional" | "none";
  /** Where to get a key (cloud) or the app (local). */
  keyUrl?: string;
  /** Only where we're confident it exists for every account. */
  defaultModel?: string;
  setupHint?: string;
  setupCommands?: { label: string; cmd: string }[];
  headers?: Record<string, string>;
  modelFilter?: (id: string) => boolean;
}

export const PRESETS: ProviderPreset[] = [
  // ── Cloud ──────────────────────────────────────────────────────────────────
  {
    id: "claude", group: "cloud", label: "Claude", adapter: "anthropic",
    baseUrl: "https://api.anthropic.com/v1", key: "required",
    keyUrl: "https://platform.claude.com/settings/keys", defaultModel: "claude-opus-5-5"
  },
  {
    id: "openai", group: "cloud", label: "OpenAI", adapter: "openai-compat",
    baseUrl: "https://api.openai.com/v1", key: "required",
    keyUrl: "https://platform.openai.com/api-keys", defaultModel: "gpt-5.4-mini",
    modelFilter: isChatModelId
  },
  {
    id: "gemini", group: "cloud", label: "Gemini", adapter: "openai-compat",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", key: "required",
    keyUrl: "https://aistudio.google.com/apikey", defaultModel: "gemini-3.5-flash",
    setupHint: "Has a free tier, handy for trying REACH out.",
    modelFilter: isGeminiTextModel
  },
  {
    id: "openrouter", group: "cloud", label: "OpenRouter", adapter: "openai-compat",
    baseUrl: "https://openrouter.ai/api/v1", key: "required",
    keyUrl: "https://openrouter.ai/settings/keys",
    setupHint: "One key for hundreds of models (Kimi, DeepSeek, Llama, Qwen, …).",
    headers: {
      "HTTP-Referer": "https://github.com/AzaanFaisal606/REACH-Project-Marketing-Assistant",
      "X-Title": "REACH"
    }
  },
  {
    id: "deepseek", group: "cloud", label: "DeepSeek", adapter: "openai-compat",
    baseUrl: "https://api.deepseek.com", key: "required",
    keyUrl: "https://platform.deepseek.com/api_keys"
  },
  {
    id: "kimi", group: "cloud", label: "Kimi (Moonshot)", adapter: "openai-compat",
    baseUrl: "https://api.moonshot.ai/v1", key: "required",
    keyUrl: "https://platform.kimi.ai/console/api-keys"
  },
  {
    id: "groq", group: "cloud", label: "Groq", adapter: "openai-compat",
    baseUrl: "https://api.groq.com/openai/v1", key: "required",
    keyUrl: "https://console.groq.com/keys"
  },
  {
    id: "xai", group: "cloud", label: "xAI (Grok)", adapter: "openai-compat",
    baseUrl: "https://api.x.ai/v1", key: "required",
    keyUrl: "https://console.x.ai"
  },
  {
    id: "mistral", group: "cloud", label: "Mistral", adapter: "openai-compat",
    baseUrl: "https://api.mistral.ai/v1", key: "required",
    keyUrl: "https://console.mistral.ai/api-keys"
  },
  {
    id: "ollama-cloud", group: "cloud", label: "Ollama Cloud", adapter: "openai-compat",
    baseUrl: "https://ollama.com/v1", key: "required",
    keyUrl: "https://ollama.com/settings/keys"
  },

  // ── Local ──────────────────────────────────────────────────────────────────
  {
    id: "ollama", group: "local", label: "Ollama", adapter: "openai-compat",
    baseUrl: "http://localhost:11434/v1", key: "none",
    keyUrl: "https://ollama.com/download",
    // Ollama rejects requests from extensions unless told to allow them.
    setupHint: "Ollama blocks browser extensions by default. Start it with:",
    setupCommands: [
      { label: "macOS / Linux", cmd: `OLLAMA_ORIGINS="chrome-extension://*" ollama serve` },
      { label: "PowerShell", cmd: `$env:OLLAMA_ORIGINS="chrome-extension://*"; ollama serve` }
    ]
  },
  {
    id: "lmstudio", group: "local", label: "LM Studio", adapter: "openai-compat",
    baseUrl: "http://localhost:1234/v1", key: "none",
    keyUrl: "https://lmstudio.ai",
    setupHint: "Load a model, then start the server in LM Studio's Developer tab."
  },
  {
    id: "llamacpp", group: "local", label: "llama.cpp", adapter: "openai-compat",
    baseUrl: "http://localhost:8080/v1", key: "optional",
    setupHint: "Start the server with:",
    setupCommands: [{ label: "Terminal", cmd: "llama-server -m model.gguf" }]
  },
  {
    id: "vllm", group: "local", label: "vLLM", adapter: "openai-compat",
    baseUrl: "http://localhost:8000/v1", key: "optional",
    setupHint: "Start the server with:",
    setupCommands: [{ label: "Terminal", cmd: "vllm serve <model>" }]
  },

  // ── Custom ─────────────────────────────────────────────────────────────────
  {
    id: "custom", group: "custom", label: "Custom (OpenAI-compatible)", adapter: "openai-compat",
    baseUrl: "", key: "optional",
    setupHint: "Any server that speaks the OpenAI chat API. The address usually ends in /v1."
  }
];

export const DEFAULT_PRESET_ID = "claude";

const BY_ID = new Map(PRESETS.map((p) => [p.id, p]));

export function getPreset(id: string): ProviderPreset | undefined {
  return BY_ID.get(id);
}
