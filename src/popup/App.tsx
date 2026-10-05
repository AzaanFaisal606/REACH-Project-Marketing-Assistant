import { useState, useEffect } from "preact/hooks";
import { hydrate, appState, providerReady, currentPreset } from "./state";
import type { TabId } from "./state";
import { Settings } from "./components/Settings";
import { Welcome } from "./components/Welcome";
import { InputPanel } from "./components/InputPanel";
import { RedditTab } from "./tabs/RedditTab";
import { XTab } from "./tabs/XTab";
import { LinkedInTab } from "./tabs/LinkedInTab";
import logoUrl from "/icons/icon-128.png"; // 128 → crisp when the browser scales it to the 28px header slot (incl. hi-DPI)

const TABS: { id: TabId; label: string }[] = [
  { id: "reddit", label: "Reddit" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" }
];

export function App() {
  const [showSettings, setShowSettings] = useState(false);
  // Wait for stored settings before deciding to show the first-run card, or it
  // flashes on every open.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { hydrate().then(() => setHydrated(true)); }, []);

  return (
    <div class="app">
      <header class="app-header">
        <div class="brand-group">
          <img class="brand-logo" src={logoUrl} alt="" width="30" height="30" />
          <div class="brand-text">
            <div class="brand-line">
              <span class="brand">REACH</span>
              <span class="beta-tag">beta</span>
            </div>
            <span class="brand-tagline">launch assistant</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {providerReady() && appState.providerAccess.value && (
            <span class="provider-chip">{currentPreset().label} ✓</span>
          )}
          <button class="gear" onClick={() => setShowSettings((s) => !s)} aria-label="Settings">⚙</button>
        </div>
      </header>

      {showSettings ? (
        <Settings />
      ) : (
        <main class="body">
          {hydrated && !providerReady() && <Welcome onSetup={() => setShowSettings(true)} />}
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
          {appState.tab.value === "x" && <XTab />}
          {appState.tab.value === "linkedin" && <LinkedInTab />}
        </main>
      )}
    </div>
  );
}
