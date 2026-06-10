import { useState, useEffect } from "preact/hooks";
import { hydrate, appState, providerReady } from "./state";
import type { TabId } from "./state";
import { PROVIDERS } from "@/lib/providers";
import { Settings } from "./components/Settings";
import { InputPanel } from "./components/InputPanel";
import { RedditTab } from "./tabs/RedditTab";
import { ComingSoonTab } from "./tabs/ComingSoonTab";
import logoUrl from "/icons/icon-128.png"; // 128 → crisp when the browser scales it to the 28px header slot (incl. hi-DPI)

const TABS: { id: TabId; label: string }[] = [
  { id: "reddit", label: "Reddit" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" }
];

export function App() {
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => { hydrate(); }, []);

  return (
    <div class="app">
      <header class="app-header">
        <div class="brand-group">
          <img class="brand-logo" src={logoUrl} alt="" width="28" height="28" />
          <span class="brand">REACH</span>
          <span class="beta-tag">beta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {providerReady() && (
            <span class="provider-chip">{PROVIDERS[appState.providerId.value].label} ✓</span>
          )}
          <button class="gear" onClick={() => setShowSettings((s) => !s)} aria-label="Settings">⚙</button>
        </div>
      </header>

      {showSettings ? (
        <Settings />
      ) : (
        <main class="body">
          <InputPanel />
          <nav class="tab-bar">
            {TABS.map((t) => (
              <button
                class={`tab${appState.tab.value === t.id ? " active" : ""}`}
                onClick={() => (appState.tab.value = t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {appState.tab.value === "reddit" && <RedditTab />}
          {appState.tab.value === "x" && <ComingSoonTab platform="X" />}
          {appState.tab.value === "linkedin" && <ComingSoonTab platform="LinkedIn" />}
        </main>
      )}
    </div>
  );
}
