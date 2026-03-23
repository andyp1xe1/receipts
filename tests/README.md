# Private receipt test corpus

Live receipt URLs are intentionally not tracked in git.

Create one of these private files:

- `tests/private/receipt_urls.json`
- `tests/private/receipt_urls.local.json`

Or point to a private file with:

- `MEV_PRIVATE_RECEIPT_LIST=/absolute/path/to/receipt_urls.json`

Expected format:

```json
[
  {
    "source_url": "https://...",
    "kind": "four_part"
  }
]
```
