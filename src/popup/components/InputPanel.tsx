import { useState } from "preact/hooks";
import { runAnalysis, analyzing, appState, connectGithub } from "../state";
import { parseRepoUrl } from "@/lib/github/parse-url";
import { fetchRepoContext } from "@/lib/github/fetch-repo";
import { storage } from "@/lib/storage/storage";
import { readFileText } from "./read-file";
export { readFileText };

export function InputPanel() {
  const [repoUrl, setRepoUrl] = useState("");
  const [repoErr, setRepoErr] = useState("");
  // Staged README: held until the user clicks Analyze (not analyzed on pick).
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");

  const hasSource = !!fileText || !!repoUrl.trim();

  function clearFile() {
    setFileName("");
    setFileText("");
  }

  async function onAnalyze() {
    setRepoErr("");
    // Staged README wins if present.
    if (fileText) {
      await runAnalysis(fileText);
      return;
    }
    const ref = parseRepoUrl(repoUrl);
    if (!ref) { setRepoErr("Enter a valid GitHub URL or owner/repo."); return; }
    try {
      const token = await storage.getGithubToken();
      const ctx = await fetchRepoContext(ref, token || undefined);
      await runAnalysis(ctx);
    } catch (e) {
      setRepoErr((e as Error).message);
    }
  }

  async function onConnectGithub() {
    setRepoErr("");
    try {
      await connectGithub(); // sets appState.githubConnected → status line shows below
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
      setFileName(file.name);
      setFileText(text);
      setRepoUrl(""); // README is now the active source
      setRepoErr("");
    } catch (err) {
      appState.status.value = `Could not read file: ${(err as Error).message}`;
    } finally {
      input.value = ""; // allow re-selecting the same file to re-trigger onChange
    }
  }

  return (
    <div class="input-panel">
      <h2>Add your project</h2>
      <label class="file-picker">
        <span class="btn-like primary">Choose file</span>
        <span class="file-name">{fileName || "No README selected"}</span>
        <input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={onFile} />
      </label>
      {fileName && (
        <button class="link-clear" type="button" onClick={clearFile}>Remove README</button>
      )}
      <div class="or">— or —</div>
      <label class="repo-input">
        Repository URL
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            setRepoUrl(v);
            if (v && fileText) clearFile(); // typing a repo switches source off the README
          }}
        />
      </label>
      <button class="primary" disabled={!hasSource || analyzing.value} onClick={onAnalyze}>
        Analyze
      </button>
      <button class="secondary" disabled={analyzing.value} onClick={onConnectGithub}>
        {appState.githubConnected.value ? "Reconnect GitHub" : "Connect GitHub (for private repos)"}
      </button>
      {appState.githubConnected.value && <p class="connected">GitHub connected ✓</p>}
      {repoErr && <p class="error">{repoErr}</p>}
      {analyzing.value && <p class="status">Analyzing…</p>}
      {appState.status.value && <p class="status">{appState.status.value}</p>}
      {appState.summary.value && (
        <div class="summary-chip">✓ {appState.summary.value.valueProp}</div>
      )}
    </div>
  );
}
