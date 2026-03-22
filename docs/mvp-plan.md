# Expense Tracker MVP

## Product direction

- Build a receipts-first expense tracker for Moldova MEV receipts.
- Keep the scanned QR URL as provenance and store the parsed receipt payload for later exports.
- Optimize for one fast habit: paste a receipt URL, save it, classify it, and review spending.

## MVP features

- Ingest a receipt from a scanned MEV URL.
- Parse the receipt server-side and store a normalized record in D1.
- Show recent expenses, monthly totals, and category breakdowns.
- Allow adding and editing category and note metadata.
- Show a receipt detail page with line items, taxes, payments, and the ASCII receipt view.

## Stack

- `bun`
- `SvelteKit`
- `Cloudflare Workers`
- `Cloudflare D1`

## Data model

- immutable receipt identity: `ecc_id`, `url_total`, `url_receipt_number`, `url_date`
- provenance: `source_url`
- app metadata: `category`, `note`
- payload storage: `raw_json`

## Build order

1. Move current parser research into a dedicated `research/` area.
2. Build a SvelteKit UI and server routes for ingest and review.
3. Port the proven parser logic from Python into TypeScript for Workers.
4. Add D1 schema, queries, tests, and deployment config.
5. Deploy to Andriesh's Cloudflare account.
