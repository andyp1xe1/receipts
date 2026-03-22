# Receipt Ledger

Receipt tracker for Moldova MEV receipts.

## What it does

- imports a scanned MEV receipt URL
- fetches and parses the receipt server-side
- preserves the original `source_url`
- stores canonical receipt identity in D1
- lets you review receipts, categories, notes, and monthly totals

## Local development

```bash
bun install
bun run db:migrate:local
bun run check
bun run test
bun run dev
```

## Production

- app: `https://your-workers-app.workers.dev`
- database binding and account config live in `wrangler.jsonc`

Deploy with:

```bash
bun run deploy
```

## Research archive

The earlier Python parser experiments, live URL tests, and MEV research notes live under `research/mev-python/`.
