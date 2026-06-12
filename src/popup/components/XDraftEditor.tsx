import { useState } from "preact/hooks";
import { x, regenerateXPost, regenerateTweet, effectiveXFormat } from "../state";
import { TWEET_MAX } from "@/lib/x/generate";

export function XDraftEditor() {
  const [copied, setCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const tweets = x.draft.value ?? [];
  const isThread = effectiveXFormat() === "thread";

  function setTweet(i: number, value: string) {
    const next = tweets.slice();
    next[i] = value;
    x.draft.value = next;
  }

  // Grow the textarea to fit its content: reset to auto, then lock to scrollHeight.
  // Runs on every input and via the ref callback on mount/regen so the box always
  // matches the tweet length — no inner scrollbar, no manual resize handle needed.
  function autosize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
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

  async function copyTweet(i: number) {
    try {
      await navigator.clipboard.writeText(tweets[i]);
      setCopiedIndex(i);
      setTimeout(() => setCopiedIndex((cur) => (cur === i ? null : cur)), 1500);
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
                  <>
                    <button
                      class="x-tweet-regen"
                      onClick={() => copyTweet(i)}
                      aria-label="Copy this tweet"
                      title="Copy this tweet"
                    >
                      {copiedIndex === i ? "✓" : "⧉"}
                    </button>
                    <button
                      class="x-tweet-regen"
                      disabled={x.regenIndex.value === i}
                      onClick={() => regenerateTweet(i)}
                      aria-label="Regenerate this tweet"
                      title="Regenerate this tweet"
                    >
                      {x.regenIndex.value === i ? "…" : "↻"}
                    </button>
                  </>
                )}
              </span>
            </div>
            <textarea
              ref={autosize}
              value={t}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                setTweet(i, el.value);
                autosize(el);
              }}
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
