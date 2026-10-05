import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  // Pins the extension ID to knkbfnicnkmcfpanenhaoiaflgmanphf so the GitHub OAuth
  // redirect URI (https://<id>.chromiumapp.org/) stays stable across machines/reloads.
  // Before publishing, swap in the public key from the Chrome Web Store dashboard
  // (Package tab) so the store build keeps one ID too, and update the GitHub
  // OAuth App's callback URL to match.
  key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiG0WVM/rPZgwlWBcPn8uknx0srFS4aQgxAcGOlm+ltxEbQeJoA7rrW3ib1+qARgGhphfKU7oc7+zGklLqbHQq+u8FccUj815MOoq30+I/50XEM2ouBE/DCJN5r8GhUukEV5NLHoHVe0EpfBCs47qamARlpPmMSUJ4lOlw3maxSZ5ZVPFVn6nvv6qgy//I3GymOPBx6MNJk2PE+oOWKcQzLW9upW8PAq8KE6IhXFn8RZAOLpPEd5gvzbhIR1N9MzKGvIEkcrn7TIzDmMLCyTkptoQaNnB8lCQJw0nfFMjTJnqNREEH1c3nXtMqD7f3A7lhms1rb4sjETqlTi0VU6kdwIDAQAB",
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
  host_permissions: ["https://api.github.com/*", "https://www.reddit.com/*"],
  // AI providers (cloud, local and custom addresses) are granted per provider at
  // runtime from Settings, so install asks for nothing beyond GitHub and Reddit.
  optional_host_permissions: ["https://*/*", "http://*/*"]
});
