import { reddit, openSubmit, regeneratePost } from "../state";
import { TITLE_MAX } from "@/lib/reddit/submit-url";

export function DraftEditor() {
  const titleLen = reddit.draftTitle.value.length;
  const tooLong = titleLen > TITLE_MAX;
  return (
    <div class="draft-editor">
      <label>
        Title <span class={tooLong ? "count over" : "count"}>{titleLen}/{TITLE_MAX}</span>
        <input
          value={reddit.draftTitle.value}
          onInput={(e) => (reddit.draftTitle.value = (e.target as HTMLInputElement).value)}
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
        <button class="secondary" disabled={reddit.generating.value} onClick={regeneratePost}>
          {reddit.generating.value ? "…" : "↻ Regenerate"}
        </button>
        <button class="primary" disabled={tooLong || !reddit.draftTitle.value} onClick={openSubmit}>
          Open Reddit submit page →
        </button>
      </div>
      {tooLong && <p class="error">Title exceeds Reddit's {TITLE_MAX}-char limit.</p>}
    </div>
  );
}
