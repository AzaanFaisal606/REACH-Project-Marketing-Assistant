import { runAnalysis, analyzing, appState } from "../state";

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}

export function InputPanel() {
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
      {analyzing.value && <p class="status">Analyzing…</p>}
      {appState.status.value && <p class="status">{appState.status.value}</p>}
      {appState.summary.value && (
        <div class="summary-chip">✓ {appState.summary.value.valueProp}</div>
      )}
    </div>
  );
}
