import { useState } from "preact/hooks";
import { appState, saveProvider, saveApiKey } from "../state";
import { PROVIDER_LIST, getProvider } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers/types";

export function Settings() {
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);

  async function testKey() {
    setTesting(true);
    setTestMsg("");
    try {
      const provider = getProvider(appState.providerId.value);
      const res = await fetch(provider.testRequest(appState.apiKey.value));
      setTestMsg(res.ok ? "Key works ✓" : `Failed: ${res.status}`);
    } catch (e) {
      setTestMsg(`Failed: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div class="settings">
      <label>
        Provider
        <select
          value={appState.providerId.value}
          onChange={(e) => saveProvider((e.target as HTMLSelectElement).value as ProviderId)}
        >
          {PROVIDER_LIST.map((p) => (
            <option value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>
      <label>
        API key
        <input
          type="password"
          value={appState.apiKey.value}
          placeholder="Paste your key"
          onInput={(e) => saveApiKey((e.target as HTMLInputElement).value)}
        />
      </label>
      <button class="primary" disabled={testing || !appState.apiKey.value} onClick={testKey}>
        {testing ? "Testing…" : "Test key"}
      </button>
      {testMsg && <p class="test-msg">{testMsg}</p>}
      <p class="hint">
        Your key is stored on this device only (obfuscated, not encrypted) and is sent
        only to your chosen provider.
      </p>
    </div>
  );
}
