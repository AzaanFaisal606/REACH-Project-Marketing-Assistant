import { getPreset } from "@/lib/providers/presets";

// First-run card. Shown on the main screen until an AI provider is set up,
// since nothing in REACH works without one.

function KeyLink({ id, text }: { id: string; text?: string }) {
  const p = getPreset(id)!;
  return <a href={p.keyUrl} target="_blank" rel="noreferrer">{text ?? p.label}</a>;
}

export function Welcome({ onSetup }: { onSetup: () => void }) {
  return (
    <section class="welcome">
      <h2>Hey, welcome to REACH</h2>
      <p>
        REACH writes your launch posts with an AI model you bring, so it needs one
        set up before it can do anything. Takes about a minute:
      </p>
      <ol>
        <li>
          Grab a key from <KeyLink id="claude" />, <KeyLink id="openai" />,{" "}
          <KeyLink id="gemini" /> (free tier) or <KeyLink id="openrouter" /> (one key, hundreds
          of models). Or run a model on your own computer with <KeyLink id="ollama" />{" "}
          or <KeyLink id="lmstudio" />.
        </li>
        <li>Open settings, pick the provider, paste the key, then click Allow access and confirm in Chrome.</li>
        <li>Come back here and drop in your repo or README.</li>
      </ol>
      <p class="hint">Your key stays on this device and only goes to the provider you pick.</p>
      <button class="primary" onClick={onSetup}>Set up my AI provider</button>
    </section>
  );
}
