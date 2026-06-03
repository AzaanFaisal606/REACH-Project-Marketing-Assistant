# REACH OAuth Worker

GitHub OAuth token exchange for private-repo access. Keeps the client secret off the extension.

## Setup
1. Register a GitHub OAuth App: https://github.com/settings/developers
   - Authorization callback URL: `https://<extension-id>.chromiumapp.org/`
2. `npm install`
3. `wrangler secret put GITHUB_CLIENT_ID`
4. `wrangler secret put GITHUB_CLIENT_SECRET`
5. `npm run deploy` -> note the deployed URL.
6. Put the deployed URL + client ID into the extension (see `src/background/service-worker.ts` constants).
