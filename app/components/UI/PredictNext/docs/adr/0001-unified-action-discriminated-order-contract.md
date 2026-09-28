# One Order workflow: action-discriminated buy/sell contract with quantity-based sell intent

One Preview/Commit route pair, one durable Order operation, and one canonical Order Receipt serve both buy and sell, discriminated by an `action: 'buy' | 'sell'` field, rather than growing separate sell endpoints. A sell intent (Cash Out) is expressed in whole contracts, bounded by the Position being reduced, not a USD spend: Positions are share-denominated, the venue matches whole contracts, and integer contract quoting mirrors the buy's integer-cent quote math. Action-specific fields are absent rather than null — a sell carries Proceeds fields and no debit/payout fields, and a buy the reverse — so `payoutExposure` stays semantically clean and the mobile `PredictOrderService` remains action-agnostic: quotes and Commits pass through unchanged, and buy and Cash Out cannot drift into separate orchestration modules.

Status: accepted, 2026-09-28 (PRED-1195).

## Considered options

- **Separate sell endpoints with their own DTOs and operation tables.** Rejected: it duplicates the preview TTL, durable `client_order_id`, reconciliation, and verified-absence machinery, and the PRED-1195 acceptance criteria require "Buy and Cash Out share one Order workflow rather than separate orchestration modules."
- **Renaming all fields direction-neutral in place** (e.g. `totalDebit` → generic `totalMovement`). Rejected: it breaks the accepted PRED-1194 buy contract for no consumer need.

## Consequences

- Mobile Preview/Receipt parsers branch on `action` and fail closed on cross-action fields (a sell receipt carrying `totalDebit`-shaped fields is invalid).
- The backend stores one `order_previews`/`order_operations` pair with an `action` column plus nullable sell columns, not new tables.
- Kalshi submission and Reconciliation identity checks become action-aware: sell Yes submits an `ask` on the YES leg, sell No submits a `bid` on the YES leg at 1 − p, and the looked-up order's book side must match the approved action and side.
- [`../interface-ledger.md`](../interface-ledger.md) remains the wire source of truth; the sell extension is documented there in the backend PR.
