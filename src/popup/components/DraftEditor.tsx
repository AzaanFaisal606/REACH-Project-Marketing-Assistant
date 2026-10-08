import { useLayoutEffect, useRef } from "preact/hooks";
import { reddit, openSubmit, regeneratePost } from "../state";
import { TITLE_MAX } from "@/lib/reddit/submit-url";

// Grow the title box to fit its text (reset, then lock to scrollHeight).
function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  // border-box height, so add the borders back (offsetHeight − clientHeight).
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
}

export function DraftEditor() {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  // Refit when the title changes from outside (regenerate) and once the
  // self-hosted fonts load, since they change the line breaks.
  useLayoutEffect(() => autosize(titleRef.current), [reddit.draftTitle.value]);
  useLayoutEffect(() => { void document.fonts.ready.then(() => autosize(titleRef.current)); }, []);
  const titleLen = reddit.draftTitle.value.length;
  const tooLong = titleLen > TITLE_MAX;
  return (
    <div class="draft-editor">
      <label>
        Title <span class={tooLong ? "count over" : "count"}>{titleLen}/{TITLE_MAX}</span>
        {/* A textarea so long titles wrap; Reddit titles are one line, so line
            breaks are blocked and stripped from pastes. */}
        <textarea
          class="draft-title"
          rows={1}
          ref={titleRef}
          value={reddit.draftTitle.value}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            reddit.draftTitle.value = el.value.replace(/[\r\n]+/g, " ");
            autosize(el);
          }}
        />
      </label>
      <label>
        Body
        <textarea
          rows={10}
          value={reddit.draftBody.value}
          onInput={(e) => (reddit.draftBody.value = (e.target as HTMLTextAreaElement).value)}
        />
      </label>
      <div class="draft-actions">
        <button
          class="icon-btn"
          disabled={reddit.generating.value}
          onClick={regeneratePost}
          aria-label="Regenerate"
          title="Regenerate"
        >
          {reddit.generating.value ? "…" : "↻"}
        </button>
        <button class="primary" disabled={tooLong || !reddit.draftTitle.value} onClick={openSubmit}>
          Open Reddit submit page →
        </button>
      </div>
      {tooLong && <p class="error">Title exceeds Reddit's {TITLE_MAX}-char limit.</p>}
    </div>
  );
}
