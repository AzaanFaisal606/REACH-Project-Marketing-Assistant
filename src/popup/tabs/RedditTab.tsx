import { appState, reddit, findCommunities, selectSubreddit, generatePost } from "../state";
import { SubredditCard } from "../components/SubredditCard";
import { DraftEditor } from "../components/DraftEditor";

export function RedditTab() {
  if (!appState.summary.value) {
    return <p class="gate">Add a project above to find communities.</p>;
  }
  return (
    <div class="reddit-tab">
      <button class="primary" disabled={reddit.finding.value} onClick={findCommunities}>
        {reddit.finding.value ? "Finding communities…" : "Find communities"}
      </button>
      {reddit.error.value && <p class="error">{reddit.error.value}</p>}

      {reddit.candidates.value.length > 0 && (
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

      {reddit.selected.value && (
        <div class="selected-panel">
          {reddit.rules.value.length > 0 && (
            <details class="rules">
              <summary>r/{reddit.selected.value} rules ({reddit.rules.value.length})</summary>
              <ul>{reddit.rules.value.map((r) => <li>{r.name}</li>)}</ul>
            </details>
          )}
          <p class="caution">⚠ Many subs enforce karma/account-age minimums via automod. Check before posting.</p>
          <button class="primary" disabled={reddit.generating.value} onClick={generatePost}>
            {reddit.generating.value ? "Generating…" : `Generate post for r/${reddit.selected.value}`}
          </button>
          {(reddit.draftTitle.value || reddit.draftBody.value) && <DraftEditor />}
        </div>
      )}
    </div>
  );
}
