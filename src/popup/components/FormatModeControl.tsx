import { x, appState, setXFormatMode, effectiveXFormat } from "../state";

export function FormatModeControl() {
  const mode = x.format.value;
  const auto = mode === "auto";
  const summary = appState.summary.value;
  const decided = effectiveXFormat();
  const reason = summary?.xFormatReason;

  return (
    <div class="format-control">
      <div class="format-row">
        <button
          type="button"
          class={`format-auto${auto ? " on" : ""}`}
          role="switch"
          aria-checked={auto}
          onClick={() => setXFormatMode(auto ? decided : "auto")}
        >
          <span class="format-knob" />
          Auto
        </button>
        <button
          type="button"
          class={`format-btn${mode === "tweet" ? " active" : ""}`}
          disabled={auto}
          onClick={() => setXFormatMode("tweet")}
        >
          Tweet
        </button>
        <button
          type="button"
          class={`format-btn${mode === "thread" ? " active" : ""}`}
          disabled={auto}
          onClick={() => setXFormatMode("thread")}
        >
          Thread
        </button>
      </div>
      {auto && (
        <p class="format-decision">
          Auto → <strong>{decided}</strong>{reason ? ` — ${reason}` : ""}
        </p>
      )}
    </div>
  );
}
