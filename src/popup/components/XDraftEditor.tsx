import { useState } from "preact/hooks";
import { x, regenerateXPost, regenerateTweet, effectiveXFormat } from "../state";
import { TWEET_MAX } from "@/lib/x/generate";

export function XDraftEditor() {
  const [copied, setCopied] = useState(false);
  const tweets = x.draft.value ?? [];
  const isThread = effectiveXFormat() === "thread";

  function setTweet(i: number, value: string) {
    const next = tweets.slice();
    next[i] = value;
    x.draft.value = next;
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(tweets.join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      x.error.value = "Couldn't copy to clipboard — select the text and copy manually.";
    }
  }

  function openX() {
    chrome.tabs.create({ url: "https://x.com/compose/post" });
  }

  return (
    <div class="x-draft-editor">
      {tweets.map((t, i) => {
        const over = t.length > TWEET_MAX;
        return (
          <div key={i} class="x-tweet">
            <div class="x-tweet-head">
              <span class="x-tweet-num">{isThread ? `${i + 1}/${tweets.length}` : "Tweet"}</span>
              <span class="x-tweet-meta">
                <span class={over ? "count over" : "count"}>{t.length}/{TWEET_MAX}</span>
                {isThread && (
                  <button
                    class="x-tweet-regen"
                    disabled={x.regenIndex.value === i}
                    onClick={() => regenerateTweet(i)}
                    aria-label="Regenerate this tweet"
                    title="Regenerate this tweet"
                  >
                    {x.regenIndex.value === i ? "…" : "↻"}
                  </button>
                )}
              </span>
            </div>
            <textarea
              rows={isThread ? 3 : 5}
              value={t}
              onInput={(e) => setTweet(i, (e.target as HTMLTextAreaElement).value)}
            />
            {over && <p class="error">Over the {TWEET_MAX}-char limit.</p>}
          </div>
        );
      })}
      <div class="draft-actions">
        <button
          class="icon-btn"
          disabled={x.generating.value}
          onClick={regenerateXPost}
          aria-label="Regenerate all"
          title="Regenerate all"
        >
          {x.generating.value ? "…" : "↻"}
        </button>
        <button class="secondary" onClick={openX}>X →</button>
        <button class="primary" disabled={tweets.length === 0} onClick={copyAll}>
          {copied ? "Copied ✓" : isThread ? "Copy thread" : "Copy tweet"}
        </button>
      </div>
    </div>
  );
}
