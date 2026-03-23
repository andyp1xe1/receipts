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

## Private live parser tests

Concrete MEV receipt URLs stay out of git.

- Put a private corpus in `tests/private/receipt_urls.json` or `tests/private/receipt_urls.local.json`
- Or set `MEV_PRIVATE_RECEIPT_LIST=/absolute/path/to/receipt_urls.json`
- Use `tests/receipt_urls.example.json` as the shape reference

Run the normal suite with `bun run test` or only the live invariant suite with `bun run test:mev-live`.

## Production

- app: `https://your-workers-app.workers.dev`
- database binding and account config live in `wrangler.jsonc`

Deploy with:

```bash
bun run deploy
```

The parser and invariants now live entirely in the TypeScript app and Vitest suite.
