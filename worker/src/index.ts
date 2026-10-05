interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type"
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

    let code = "";
    try { code = ((await req.json()) as { code?: string }).code ?? ""; } catch { /* ignore */ }
    if (!code) return new Response(JSON.stringify({ error: "missing code" }), {
      status: 400, headers: { ...CORS, "content-type": "application/json" }
    });

    const ghRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    let data: unknown;
    try {
      data = await ghRes.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid response from GitHub." }), {
        status: 502, headers: { ...CORS, "content-type": "application/json" }
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...CORS, "content-type": "application/json" }
    });
  }
};
