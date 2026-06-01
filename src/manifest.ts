import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "REACH",
  version: "0.1.0",
  description: "Turn your repo or README into a Reddit launch post.",
  action: { default_popup: "index.html" },
  background: { service_worker: "src/background/service-worker.ts", type: "module" },
  permissions: ["storage", "identity"],
  host_permissions: [
    "https://api.github.com/*",
    "https://www.reddit.com/*",
    "https://api.anthropic.com/*",
    "https://api.openai.com/*",
    "https://generativelanguage.googleapis.com/*"
  ]
});
