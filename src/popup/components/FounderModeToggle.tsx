import { linkedin, setFounderMode } from "../state";

export function FounderModeToggle() {
  const on = linkedin.founderMode.value;
  return (
    <div class="founder-toggle-row">
      <button
        type="button"
        class={`founder-toggle${on ? " on" : ""}`}
        role="switch"
        aria-checked={on}
        onClick={() => setFounderMode(!on)}
      >
        <span class="founder-knob" />
        Founder Story Mode
      </button>
      <span class="founder-info" tabIndex={0} aria-label="What is Founder Story Mode?">
        ⓘ
        <span class="hovercard" role="tooltip">
          Frames the post as your founder story — the problem, the fix, the
          lesson. Story-led posts beat product announcements on LinkedIn.
        </span>
      </span>
    </div>
  );
}
