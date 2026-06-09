import { useState, useEffect } from "preact/hooks";
import {
  appState,
  saveProvider,
  saveApiKey,
  saveOllamaBaseUrl,
  saveOllamaModel,
  providerConfig,
  providerReady
} from "../state";
import { PROVIDER_LIST, getProvider } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers/types";
import { describeProviderError } from "@/lib/providers/errors";
import { listOllamaModels } from "@/lib/providers/ollama";

// Same env var, two shells. PowerShell sets the var as a separate statement;
// bash/zsh uses an inline prefix. Cross-platform users need the right one.
const CORS_COMMANDS = [
  { label: "PowerShell", cmd: `$env:OLLAMA_ORIGINS="chrome-extension://*"; ollama serve` },
  { label: "macOS / Linux", cmd: `OLLAMA_ORIGINS="chrome-extension://*" ollama serve` }
];

export function Settings() {
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);

  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(appState.providerId.value === "ollama");
  const [modelsError, setModelsError] = useState("");

  const isOllama = appState.providerId.value === "ollama";

  async function fetchModels(baseUrl: string) {
    setLoadingModels(true);
    setModelsError("");
    setModels([]);
    try {
      const list = await listOllamaModels(baseUrl);
      setModels(list);
      // If saved model is no longer in list, clear selection
      if (appState.ollamaModel.value && !list.includes(appState.ollamaModel.value)) {
        await saveOllamaModel("");
      }
    } catch (e) {
      setModelsError((e as Error).message);
    } finally {
      setLoadingModels(false);
    }
  }

  // Fetch models on mount if already on Ollama, and when switching to Ollama
  useEffect(() => {
    if (appState.providerId.value === "ollama") {
      fetchModels(appState.ollamaBaseUrl.value);
    }
  }, [appState.providerId.value]);

  async function handleProviderChange(id: ProviderId) {
    await saveProvider(id);
    setTestMsg("");
  }

  async function handleTest() {
    setTesting(true);
    setTestMsg("");
    try {
      const provider = getProvider(appState.providerId.value);
      const res = await fetch(provider.testRequest(providerConfig()));
      const successMsg = isOllama ? "Connected ✓" : "Key works ✓";
      setTestMsg(
        res.ok
          ? successMsg
          : describeProviderError(provider.label, res.status, await res.text())
      );
    } catch (e) {
      setTestMsg(`Failed: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  async function copyCommand(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      // clipboard access denied — silently ignore
    }
  }

  const testDisabled = testing || !providerReady();
  const testLabel = testing ? "Testing…" : isOllama ? "Test connection" : "Test key";

  return (
    <div class="settings">
      <label>
        Provider
        <select
          value={appState.providerId.value}
          onChange={(e) => handleProviderChange((e.target as HTMLSelectElement).value as ProviderId)}
        >
          {PROVIDER_LIST.map((p) => (
            <option value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>

      {isOllama ? (
        <>
          <label>
            Server URL
            <input
              type="text"
              value={appState.ollamaBaseUrl.value}
              placeholder="http://localhost:11434"
              onInput={(e) => saveOllamaBaseUrl((e.target as HTMLInputElement).value)}
              onBlur={(e) => fetchModels((e.target as HTMLInputElement).value)}
            />
          </label>

          <label>
            Model
            <div class="ollama-model-row">
              <select
                value={appState.ollamaModel.value}
                disabled={loadingModels}
                onChange={(e) => saveOllamaModel((e.target as HTMLSelectElement).value)}
              >
                {loadingModels ? (
                  <option value="">Loading models…</option>
                ) : models.length === 0 ? (
                  <option value="">— pick a model —</option>
                ) : (
                  <>
                    <option value="">— pick a model —</option>
                    {models.map((m) => (
                      <option value={m}>{m}</option>
                    ))}
                  </>
                )}
              </select>
              <button
                class="ollama-refresh"
                title="Refresh model list"
                disabled={loadingModels}
                onClick={() => fetchModels(appState.ollamaBaseUrl.value)}
              >
                ↻
              </button>
            </div>
          </label>

          {modelsError && (
            <p class="error">{modelsError}</p>
          )}
          {!modelsError && !loadingModels && models.length === 0 && (
            <p class="hint">No models installed — run <code>ollama pull &lt;model&gt;</code> first.</p>
          )}

          <div class="ollama-cors-hint">
            <p class="hint">
              Local models run on your machine. Ollama must allow the extension to
              connect — start it with (use the line for your shell):
            </p>
            {CORS_COMMANDS.map(({ label, cmd }) => (
              <div class="ollama-cmd-row">
                <code class="ollama-cmd">
                  <span class="ollama-cmd-os">{label}</span>
                  {cmd}
                </code>
                <button class="ollama-copy" title={`Copy ${label} command`} onClick={() => copyCommand(cmd)}>
                  Copy
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <label>
            API key
            <input
              type="password"
              value={appState.apiKey.value}
              placeholder="Paste your key"
              onInput={(e) => saveApiKey((e.target as HTMLInputElement).value)}
            />
          </label>
          <p class="hint">
            Your key is stored on this device only (obfuscated, not encrypted) and is
            sent only to your chosen provider.
          </p>
        </>
      )}

      <button class="primary" disabled={testDisabled} onClick={handleTest}>
        {testLabel}
      </button>
      {testMsg && <p class="test-msg">{testMsg}</p>}
    </div>
  );
}
