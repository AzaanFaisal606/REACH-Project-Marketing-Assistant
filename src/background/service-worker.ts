// Filled in by the user after deploying the Worker (Task 13 setup):
const GITHUB_CLIENT_ID = "REPLACE_WITH_CLIENT_ID";
const WORKER_EXCHANGE_URL = "https://REPLACE_WITH_WORKER_SUBDOMAIN.workers.dev/exchange";

interface AuthMsg { type: "github-oauth"; }

chrome.runtime.onMessage.addListener((msg: AuthMsg, _sender, sendResponse) => {
  if (msg.type !== "github-oauth") return;
  void (async () => {
    try {
      const redirectUri = chrome.identity.getRedirectURL();
      const authUrl =
        `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}` +
        `&scope=repo&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const redirect = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
      if (!redirect) throw new Error("GitHub authorization was cancelled.");
      const code = new URL(redirect).searchParams.get("code");
      if (!code) throw new Error("No code returned from GitHub.");
      const res = await fetch(WORKER_EXCHANGE_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = (await res.json()) as { access_token?: string; error?: string };
      if (!data.access_token) throw new Error(data.error ?? "Token exchange failed.");
      sendResponse({ ok: true, token: data.access_token });
    } catch (e) {
      sendResponse({ ok: false, error: (e as Error).message });
    }
  })();
  return true; // async response
});
