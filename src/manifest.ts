import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "REACH",
  version: "0.1.0",
  description: "Turn your repo or README into a Reddit launch post.",
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  action: {
    default_popup: "index.html",
    default_icon: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png"
    }
  },
  background: { service_worker: "src/background/service-worker.ts", type: "module" },
  permissions: ["storage", "identity", "tabs"],
  host_permissions: [
    "https://api.github.com/*",
    "https://www.reddit.com/*",
    "https://api.anthropic.com/*",
    "https://api.openai.com/*",
    "https://generativelanguage.googleapis.com/*",
    "http://localhost/*"
  ]
});
