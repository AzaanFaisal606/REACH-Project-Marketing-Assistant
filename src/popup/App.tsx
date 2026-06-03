import { useState, useEffect } from "preact/hooks";
import { hydrate } from "./state";
import { Settings } from "./components/Settings";
import { InputPanel } from "./components/InputPanel";

export function App() {
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => { hydrate(); }, []);

  return (
    <div class="app">
      <header class="app-header">
        <span class="brand">REACH</span>
        <button class="gear" onClick={() => setShowSettings((s) => !s)} aria-label="Settings">
          ⚙
        </button>
      </header>
      {showSettings ? (
        <Settings />
      ) : (
        <main class="body">
          <InputPanel />
          <section class="reddit-slot">Reddit tab goes here</section>
        </main>
      )}
    </div>
  );
}
