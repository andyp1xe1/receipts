# Receipt Ledger notes

- Current app stack is `bun + SvelteKit + Cloudflare Workers + D1`.
- The active product plan is in `docs/mvp-plan.md`.
- Canonical receipt identity remains the extracted tuple: `ecc_id`, `url_total`, `url_receipt_number`, `url_date`.
- Receipt parsing and invariant coverage live in the TypeScript app and Vitest suite.
