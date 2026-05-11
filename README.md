# [WIP] Receipt Ledger

Receipt tracker for Moldova MEV receipts.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/andyp1xe1/receipts)

## Two modes

- **Local**: receipts stay in your browser. No server, no account. Pick "Use locally on this device" on the login screen.
- **Synced**: single-user account on Cloudflare D1 + Better Auth, with optional TOTP. Sign-up is gated by a one-time setup token; only one admin account can exist.

Both share the same UI, importers, and exports.

## Importing receipts

- Paste or scan an MEV receipt URL: the server fetches and parses it, preserving the original `source_url`.
- Or enter a receipt manually at `/receipts/new`.
- Export filtered subsets to CSV, JSON, or PDF.

## Local development

```bash
bun install
cp .dev.vars.example .dev.vars   # then fill in BETTER_AUTH_SECRET and SETUP_TOKEN
bun run db:migrate:local
bun run dev
```

Sync mode requires both vars. Local-only mode works without them.

## Deploy to Cloudflare

Use the button above. Cloudflare provisions a fresh D1 for the deployment and fills in the binding.

After deploy, set the two secrets from the Cloudflare dashboard under Workers → your worker → Settings → Variables and Secrets. Both are write-only — keep your own copy.

- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `SETUP_TOKEN` — anything long and random

Then open `/setup`, enter the setup token, and create the admin account.

## Schema

Drizzle schema is in `src/lib/server/db/schema.ts`. After changing it:

```bash
bun run db:generate         # writes SQL into migrations/
bun run db:migrate:local    # or :remote
```

## Tests

```bash
bun run test
```

Live MEV invariants stay out of git. Drop a private corpus at `tests/private/receipt_urls.json` (see `tests/receipt_urls.example.json` for the shape), or point `MEV_PRIVATE_RECEIPT_LIST` at one, then `bun run test:mev-live`.
