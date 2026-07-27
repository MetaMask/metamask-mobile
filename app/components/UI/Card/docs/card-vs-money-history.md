# Card vs Money Account transaction history

## Current product rule

History must not appear twice for the same user.

- **Immersve** (no Money Account linking): Card home shows Transaction history.
- **Baanx + Money Account enabled for the user**: Money activity is the history surface; the Card home entry is hidden.
- **Baanx without Money Account**: Card home shows Transaction history.

Gating lives in `useShowCardTransactionHistoryEntry` (master flag + `supportsTransactionHistory` + Money-Account-is-history-surface). Routes stay registered either way.

## Money feed enrichment

When Money is the history surface, settled spends already appear via the Accounts API. Card provider data:

1. **Enriches** settled rows by on-chain hash (`AccountsApiActivity.hash` ↔ `fundingSources[].txHash`).
2. **Injects** declined rows (no on-chain settlement) into All / Purchases only.

## Open Design question

Should Money Account users eventually also get the richer Card history page (search, full details, report flow), or is the enriched Money feed sufficient?

If both surfaces ship later, decide whether they **merge** (one navigational destination) or **coexist** (Card history as a deep dive from Money). The current gate is a one-line flip when Design decides.
