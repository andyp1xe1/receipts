# Receipt Ledger notes

- Current app stack is `bun + SvelteKit + Cloudflare Workers + D1`.
- for package scripts use bun, for tests `bun run test`, and for deployments see the "private" ones in the package.json.
- Canonical receipt identity remains the extracted tuple: `ecc_id`, `url_total`, `url_receipt_number`, `url_date`.
- Receipt parsing and invariant coverage live in the TypeScript app and Vitest suite.
