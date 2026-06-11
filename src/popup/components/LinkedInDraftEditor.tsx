import { useState } from "preact/hooks";
import { linkedin, regenerateLinkedInPost } from "../state";
import { LINKEDIN_MAX } from "@/lib/linkedin/generate";

export function LinkedInDraftEditor() {
  const [copied, setCopied] = useState(false);
  const post = linkedin.draft.value ?? "";
  const len = post.length;
  const over = len > LINKEDIN_MAX;

  async function copy() {
    try {
      await navigator.clipboard.writeText(post);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      linkedin.error.value = "Couldn't copy to clipboard — select the text and copy manually.";
    }
  }

  function openLinkedIn() {
    chrome.tabs.create({ url: "https://www.linkedin.com/feed/" });
  }

  return (
    <div class="li-draft-editor">
      <label>
        Post <span class={over ? "count over" : "count"}>{len}/{LINKEDIN_MAX}</span>
        <textarea
          rows={14}
          value={post}
          onInput={(e) => (linkedin.draft.value = (e.target as HTMLTextAreaElement).value)}
        />
      </label>
      {over && <p class="error">Post exceeds LinkedIn's {LINKEDIN_MAX}-char limit.</p>}
      <div class="draft-actions">
        <button class="secondary" disabled={linkedin.generating.value} onClick={regenerateLinkedInPost}>
          {linkedin.generating.value ? "…" : "↻ Regenerate"}
        </button>
        <button class="secondary" onClick={openLinkedIn}>Open LinkedIn →</button>
        <button class="primary" disabled={!post} onClick={copy}>
          {copied ? "Copied ✓" : "Copy post"}
        </button>
      </div>
    </div>
  );
}
