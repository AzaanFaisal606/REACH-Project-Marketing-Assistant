import { useState } from "preact/hooks";
import { runAnalysis, analyzing, appState } from "../state";
import { parseRepoUrl } from "@/lib/github/parse-url";
import { fetchRepoContext } from "@/lib/github/fetch-repo";
import { readFileText } from "./read-file";
export { readFileText };

export function InputPanel() {
  const [repoUrl, setRepoUrl] = useState("");
  const [repoErr, setRepoErr] = useState("");

  async function onRepo() {
    setRepoErr("");
    const ref = parseRepoUrl(repoUrl);
    if (!ref) { setRepoErr("Enter a valid GitHub URL or owner/repo."); return; }
    try {
      const ctx = await fetchRepoContext(ref);
      await runAnalysis(ctx);
    } catch (e) {
      setRepoErr((e as Error).message);
    }
  }

  async function onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      await runAnalysis(text);
    } catch (err) {
      appState.status.value = `Could not read file: ${(err as Error).message}`;
    } finally {
      input.value = ""; // allow re-selecting the same file to re-trigger onChange
    }
  }

  return (
    <div class="input-panel">
      <h2>Add your project</h2>
      <label class="file-drop">
        Upload README (.md / .txt)
        <input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={onFile} />
      </label>
      <div class="or">— or —</div>
      <label class="repo-input">
        Public GitHub repo
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onInput={(e) => setRepoUrl((e.target as HTMLInputElement).value)}
        />
      </label>
      <button disabled={!repoUrl || analyzing.value} onClick={onRepo}>Analyze repo</button>
      {repoErr && <p class="error">{repoErr}</p>}
      {analyzing.value && <p class="status">Analyzing…</p>}
      {appState.status.value && <p class="status">{appState.status.value}</p>}
      {appState.summary.value && (
        <div class="summary-chip">✓ {appState.summary.value.valueProp}</div>
      )}
    </div>
  );
}
