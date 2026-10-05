import { appState, reddit, findCommunities, selectSubreddit, generatePost } from "../state";
import { SubredditCard } from "../components/SubredditCard";
import { DraftEditor } from "../components/DraftEditor";
import { WaveDivider } from "../components/WaveDivider";

export function RedditTab() {
  if (!appState.summary.value) {
    return <p class="gate">Add a project above to find communities.</p>;
  }
  const hasResults = reddit.candidates.value.length > 0;
  return (
    <div class="reddit-tab">
      <button
        class="primary"
        disabled={reddit.finding.value}
        onClick={() => findCommunities(hasResults)}
      >
        {reddit.reranking.value
          ? "Ranking by fit…"
          : reddit.finding.value
            ? "Finding communities…"
            : hasResults
              ? "Find more communities"
              : "Find communities"}
      </button>
      {reddit.error.value && (
        <p class={`alert-box${reddit.rateLimited.value ? " danger" : ""}`}>
          {reddit.error.value}
        </p>
      )}

      {hasResults && (
        <div class="sub-list">
          {reddit.candidates.value.map((sub) => (
            <SubredditCard
              sub={sub}
              selected={reddit.selected.value === sub.name}
              onSelect={() => selectSubreddit(sub.name)}
            />
          ))}
        </div>
      )}

      {/* Sub-specific details only appear once a subreddit is highlighted. */}
      {reddit.selected.value && (
        <div class="selected-details">
          {reddit.rules.value.length > 0 && (
            <details class="rules">
              <summary>r/{reddit.selected.value} rules ({reddit.rules.value.length})</summary>
              <ul>{reddit.rules.value.map((r) => <li>{r.name}</li>)}</ul>
            </details>
          )}
          {reddit.restrictsPromo.value && (
            <p class="caution danger">
              ⚠ This subreddit restricts self-promotion — post at your own risk.
            </p>
          )}
          <p class="caution">⚠ Many subs enforce karma/account-age minimums via automod. Check before posting.</p>
        </div>
      )}

      {/* Generate + optional prompt are ALWAYS available. With no subreddit
          highlighted the post is generic (no sub name / rules attached). */}
      <div class="selected-panel">
        <WaveDivider />
        <textarea
          class="user-prompt"
          rows={2}
          placeholder="User Prompt (Optional)"
          value={reddit.userPrompt.value}
          onInput={(e) => (reddit.userPrompt.value = (e.target as HTMLTextAreaElement).value)}
        />
        <button class="primary" disabled={reddit.generating.value} onClick={generatePost}>
          {reddit.generating.value
            ? "Generating…"
            : reddit.selected.value
              ? `Generate post for r/${reddit.selected.value}`
              : "Generate post"}
        </button>
        {(reddit.draftTitle.value || reddit.draftBody.value) && <DraftEditor />}
      </div>
    </div>
  );
}
