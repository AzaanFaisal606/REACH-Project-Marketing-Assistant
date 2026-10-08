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
        <div class="header-actions">
          {providerReady() && appState.providerAccess.value && (
            <span class="provider-chip">{currentPreset().label} ✓</span>
          )}
          <button class="gear" onClick={() => setShowSettings((s) => !s)} aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
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
