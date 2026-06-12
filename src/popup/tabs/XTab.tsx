import { appState, x, effectiveXFormat, generateXHooksAction, generateXPost } from "../state";
import { ToneProfileDropdown } from "../components/ToneProfileDropdown";
import { FormatModeControl } from "../components/FormatModeControl";
import { HookPicker } from "../components/HookPicker";
import { XDraftEditor } from "../components/XDraftEditor";

export function XTab() {
  if (!appState.summary.value) {
    return <p class="gate">Add a project above to generate an X post.</p>;
  }

  const format = effectiveXFormat();
  const hasDraft = !!(x.draft.value && x.draft.value.length > 0);
  const hasHooks = !!(x.hooks.value && x.hooks.value.length > 0);
  // Thread flow shows the hook picker before a draft exists; tweet flow generates directly.
  const showHookStep = format === "thread" && !hasDraft;

  return (
    <div class="x-tab">
      <ToneProfileDropdown />
      <FormatModeControl />
      <textarea
        class="user-prompt"
        rows={2}
        placeholder="User Prompt (Optional) — e.g. target audience, angle, or emphasis"
        value={x.userPrompt.value}
        onInput={(e) => (x.userPrompt.value = (e.target as HTMLTextAreaElement).value)}
      />

      {showHookStep ? (
        hasHooks ? (
          <HookPicker />
        ) : (
          <button class="primary" disabled={x.hooksLoading.value} onClick={generateXHooksAction}>
            {x.hooksLoading.value ? "Generating hooks…" : "Generate hooks"}
          </button>
        )
      ) : (
        !hasDraft && (
          <button class="primary" disabled={x.generating.value} onClick={generateXPost}>
            {x.generating.value ? "Generating…" : "Generate tweet"}
          </button>
        )
      )}

      {x.error.value && <p class="alert-box">{x.error.value}</p>}
      {hasDraft && <XDraftEditor />}
    </div>
  );
}
