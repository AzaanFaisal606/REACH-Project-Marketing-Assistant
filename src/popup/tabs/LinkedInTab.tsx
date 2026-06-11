import { appState, linkedin, generateLinkedInPostAction } from "../state";
import { FounderModeToggle } from "../components/FounderModeToggle";
import { LinkedInDraftEditor } from "../components/LinkedInDraftEditor";

export function LinkedInTab() {
  if (!appState.summary.value) {
    return <p class="gate">Add a project above to generate a LinkedIn post.</p>;
  }
  const hasDraft = !!(linkedin.draft.value && linkedin.draft.value.length > 0);
  return (
    <div class="linkedin-tab">
      <FounderModeToggle />
      <textarea
        class="user-prompt"
        rows={2}
        placeholder="User Prompt (Optional) — e.g. target audience, angle, or tone"
        value={linkedin.userPrompt.value}
        onInput={(e) => (linkedin.userPrompt.value = (e.target as HTMLTextAreaElement).value)}
      />
      <button
        class="primary"
        disabled={linkedin.generating.value}
        onClick={generateLinkedInPostAction}
      >
        {linkedin.generating.value
          ? "Generating…"
          : hasDraft
            ? "Regenerate LinkedIn post"
            : "Generate LinkedIn post"}
      </button>
      {linkedin.error.value && <p class="alert-box">{linkedin.error.value}</p>}
      {hasDraft && <LinkedInDraftEditor />}
    </div>
  );
}
