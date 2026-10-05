import { useState, useEffect, useRef } from "preact/hooks";
import {
  appState,
  saveProvider,
  saveApiKey,
  saveBaseUrl,
  saveModel,
  providerConfig,
  currentAdapter,
  currentPreset
} from "../state";
import { PRESETS, type PresetGroup } from "@/lib/providers/presets";
import { requestAccess, hostOf, isValidAddress } from "@/lib/providers/permissions";
import { fetchModelsJson } from "@/lib/providers/types";
import { loadModelList } from "../model-list";
import { SearchableSelect } from "./SearchableSelect";
import type { SelectOption } from "./select-filter";

const GROUPS: { id: PresetGroup; label: string }[] = [
  { id: "cloud", label: "Cloud" },
  { id: "local", label: "Local (your computer)" },
  { id: "custom", label: "Custom" }
];

export function Settings() {
  const [models, setModels] = useState<SelectOption[] | null>([]);
  const [modelsError, setModelsError] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [allowMsg, setAllowMsg] = useState("");
  // What's in the address box while typing. Kept apart from the saved value so
  // it can be cleared; an empty address falls back to the preset's default.
  const [addressDraft, setAddressDraft] = useState<string | null>(null);
  const access = appState.providerAccess.value; // null = not checked yet

  const providerId = appState.providerId.value;
  const preset = currentPreset();
  const config = providerConfig();
  const savedKey = appState.providerSettings.value.apiKeys[providerId] ?? "";
  const savedModel = appState.providerSettings.value.models[providerId] ?? "";
  const address = addressDraft ?? appState.providerSettings.value.baseUrls[providerId] ?? preset.baseUrl;

  // Each refresh gets a number; a result that comes back after a newer refresh
  // started (e.g. the user switched provider mid-load) is dropped.
  const lastRefresh = useRef(0);

  /** Re-check host access, then load the model list if we can. */
  async function refresh() {
    const mine = ++lastRefresh.current;
    setModelsError("");
    setTestMsg("");
    setModels(null);
    const res = await loadModelList(appState.providerId.value);
    if (mine !== lastRefresh.current) return;
    appState.providerAccess.value = res.access;
    setModels(res.models.map((m) => ({ id: m.id, label: m.label })));
    setModelsError(res.error);
  }

  useEffect(() => {
    setAddressDraft(null);
    setAllowMsg("");
    refresh();
  }, [providerId]);

  async function onAllow() {
    setAllowMsg("");
    // Must run straight from the click: Chrome only shows the prompt for a user gesture.
    try {
      const granted = await requestAccess(config.baseUrl);
      appState.providerAccess.value = granted;
      if (granted) refresh();
      else setAllowMsg("Chrome didn't grant access. Click Allow access to try again.");
    } catch (e) {
      setAllowMsg(`Couldn't ask Chrome for access: ${(e as Error).message}`);
    }
  }

  async function onTest() {
    setTesting(true);
    setTestMsg("");
    try {
      // Same checks as the model list: HTTP errors, unreachable server, and a
      // 200 that isn't JSON (an HTML page from a wrong address) all fail here.
      await fetchModelsJson(config, currentAdapter().testRequest(config));
      setTestMsg("Connected ✓");
    } catch (e) {
      setTestMsg((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  async function copy(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      // clipboard access denied — ignore
    }
  }

  // Model options: "Default (…)" first when the preset has one, then the live list.
  const modelOptions: SelectOption[] | null = models === null ? null : [
    ...(preset.defaultModel
      ? [{ id: "", label: `Default (${models.find((m) => m.id === preset.defaultModel)?.label ?? preset.defaultModel})` }]
      : []),
    ...models
  ];
  // Testing only needs the server and key, not a picked model.
  const canTest = access === true && isValidAddress(config.baseUrl) && !(preset.key === "required" && !config.apiKey);
  // Fall back to typing a model name when the server is reachable but its list failed or came back empty.
  const showModelText = access === true && models !== null && models.length === 0 &&
    !(preset.key === "required" && !config.apiKey);

  return (
    <div class="settings">
      <label>
        Provider
        <select value={providerId} onChange={(e) => saveProvider((e.target as HTMLSelectElement).value)}>
          {GROUPS.map((g) => (
            <optgroup label={g.label}>
              {PRESETS.filter((p) => p.group === g.id).map((p) => <option value={p.id}>{p.label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      {preset.group !== "cloud" && (
        <label>
          Server address
          <input
            type="text"
            value={address}
            placeholder="http://localhost:5000/v1"
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value;
              setAddressDraft(v);
              saveBaseUrl(v.trim());
            }}
            onBlur={() => { setAddressDraft(null); refresh(); }}
          />
        </label>
      )}

      {preset.key !== "none" && (
        <label>
          {preset.key === "optional" ? "API key (only if your server needs one)" : "API key"}
          <input
            type="password"
            value={savedKey}
            placeholder="Paste your key"
            onInput={(e) => saveApiKey((e.target as HTMLInputElement).value)}
            onBlur={() => refresh()}
          />
        </label>
      )}
      {preset.group === "cloud" && preset.keyUrl && (
        <a class="hint" href={preset.keyUrl} target="_blank" rel="noreferrer">Get a {preset.label} key ↗</a>
      )}

      {(preset.setupHint || preset.setupCommands) && (
        <div class="setup-hint">
          {preset.setupHint && <p class="hint">{preset.setupHint}</p>}
          {preset.setupCommands?.map(({ label, cmd }) => (
            <div class="setup-cmd-row">
              <code class="setup-cmd"><span class="setup-cmd-os">{label}</span>{cmd}</code>
              <button class="setup-copy" title={`Copy ${label} command`} onClick={() => copy(cmd)}>Copy</button>
            </div>
          ))}
          {preset.group === "local" && preset.keyUrl && (
            <a class="hint" href={preset.keyUrl} target="_blank" rel="noreferrer">Get {preset.label} ↗</a>
          )}
        </div>
      )}

      {access === false && (
        <div class="access-row">
          <p>REACH needs your permission to talk to {hostOf(config.baseUrl)}.</p>
          <button class="primary" onClick={onAllow}>Allow access</button>
          <p class="hint">If this window closes when Chrome asks, reopen REACH after you allow it.</p>
        </div>
      )}
      {allowMsg && <p class="error">{allowMsg}</p>}

      {showModelText ? (
        <label>
          Model
          <input
            type="text"
            value={savedModel}
            placeholder={preset.defaultModel ?? "Model name, e.g. qwen3:8b"}
            onInput={(e) => saveModel((e.target as HTMLInputElement).value)}
          />
        </label>
      ) : (
        <div class="model-row">
          <SearchableSelect
            label="Model"
            options={modelOptions}
            value={savedModel}
            placeholder={preset.key === "required" && !config.apiKey ? "Add your key first" : "Pick a model"}
            onChange={(id) => saveModel(id)}
          />
          <button class="model-refresh" title="Refresh model list" disabled={models === null} onClick={() => refresh()}>↻</button>
        </div>
      )}
      {modelsError && <p class="error">{modelsError}{access === true && " You can still type a model name."}</p>}

      {preset.key !== "none" && (
        <p class="hint">
          Keys are stored on this device only (obfuscated, not encrypted) and are only
          sent to the provider you pick.
        </p>
      )}

      <button class="primary" disabled={testing || !canTest} onClick={onTest}>
        {testing ? "Testing…" : "Test connection"}
      </button>
      {testMsg && <p class="test-msg">{testMsg}</p>}
    </div>
  );
}
