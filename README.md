# Receipt Ledger

Receipt tracker for Moldova MEV receipts.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/andyp1xe1/receipts)

## What it does

- imports a scanned MEV receipt URL
- fetches and parses the receipt server-side
- preserves the original `source_url`
- stores canonical receipt identity in D1
- lets you review receipts, categories, notes, and monthly totals

## Local development

```bash
bun install
export BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
export SETUP_TOKEN="replace-with-a-long-random-bootstrap-token"
bun run db:generate
bun run db:migrate:local
bun run check
bun run test
bun run dev
```

Then open `/setup` once, enter the bootstrap token, and create the single admin account. After the first account exists, new signups are blocked and the app requires sign-in.

## Deploy to Cloudflare

- the repo is set up for a Deploy to Cloudflare button flow
- Cloudflare provisions a fresh D1 database for each deployment and fills in the binding metadata during setup
- provide `BETTER_AUTH_SECRET` and `SETUP_TOKEN` during deployment, or from a `.dev.vars` file for local development
- after deploy, open `/setup`, enter the bootstrap token, and create the admin account

## Security model

- single-user by default; no public registration flow
- password auth backed by Better Auth and D1
- optional TOTP two-factor authentication with backup codes
- all app pages, actions, and export routes require a session

## Auth configuration

- required secret: `BETTER_AUTH_SECRET`
- required first-run bootstrap token: `SETUP_TOKEN`
- optional public origin override: `BETTER_AUTH_URL`
- on Cloudflare, store the secret with `wrangler secret put BETTER_AUTH_SECRET`
- store the bootstrap token with `wrangler secret put SETUP_TOKEN`
- for local development, exporting the variables in your shell or copying `.dev.vars.example` to `.dev.vars` is enough

## Database workflow

- Drizzle schema lives in `src/lib/server/db/schema.ts`
- generate SQL into `migrations/` with `bun run db:generate`
- apply local migrations with `bun run db:migrate:local`
- apply remote migrations with `bun run db:migrate:remote`

## Private live parser tests

Concrete MEV receipt URLs stay out of git.

- Put a private corpus in `tests/private/receipt_urls.json` or `tests/private/receipt_urls.local.json`
- Or set `MEV_PRIVATE_RECEIPT_LIST=/absolute/path/to/receipt_urls.json`
- Use `tests/receipt_urls.example.json` as the shape reference

Run the normal suite with `bun run test` or only the live invariant suite with `bun run test:mev-live`.

## Production

- app: `https://your-workers-app.workers.dev`
- database binding and account config live in `wrangler.jsonc`
- set `BETTER_AUTH_SECRET` and `SETUP_TOKEN` in your deployment environment before first boot

Deploy with:

```bash
bun run deploy
```
