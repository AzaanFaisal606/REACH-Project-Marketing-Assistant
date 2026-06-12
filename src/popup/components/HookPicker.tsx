import { x, selectHook, generateXPost } from "../state";

const ANGLES = ["Curiosity", "Stat / claim", "Story"];

export function HookPicker() {
  const hooks = x.hooks.value;
  if (!hooks || hooks.length === 0) return null;
  return (
    <div class="hook-picker">
      <p class="hook-prompt">Pick an opening hook:</p>
      {hooks.map((hook, i) => (
        <button
          key={hook}
          type="button"
          class={`hook-card${x.selectedHook.value === hook ? " selected" : ""}`}
          onClick={() => selectHook(hook)}
        >
          <span class="hook-angle">{ANGLES[i] ?? `Option ${i + 1}`}</span>
          <span class="hook-text">{hook}</span>
        </button>
      ))}
      <button
        class="primary"
        disabled={!x.selectedHook.value || x.generating.value}
        onClick={generateXPost}
      >
        {x.generating.value ? "Generating…" : "Generate thread"}
      </button>
    </div>
  );
}
