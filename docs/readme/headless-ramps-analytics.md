# Headless Ramps Analytics

Analytics guidance for the headless Money / "Add funds" deposit funnel (TRAM-3623). Client emitters live in `app/components/UI/Ramp/hooks/useFiatFunnelMetrics.ts` and are wired into MetaMask Pay via `useFiatFunnelMetricsAdapter`.

## Funnel events (HEADLESS)

| Event | When it fires | `amount_destination` |
| ----- | ------------- | -------------------- |
| `RAMPS_SCREEN_VIEWED` | Amount-input screen mounts | — |
| `RAMPS_ORDER_PROPOSED` | User commits fiat amount (Done on amount input), **before** quote returns | **Placeholder `0`** (see below) |
| `RAMPS_ORDER_SELECTED` | Provider quote arrives | Quote `amountOut` |
| `RAMPS_CONTINUE_BUTTON_CLICKED` | User taps Continue / Add Funds | — |
| `RAMPS_TRANSACTION_CONFIRMED` | Checkout completes (headless host) | Quote `amountOut` |

Filter headless rows with `ramp_type = 'HEADLESS'` and slice by `ramp_surface` (`money_account`, `perps`, `prediction`).

## `amount_destination = 0` on `RAMPS_ORDER_PROPOSED` (TRAM-3658)

### Decision: Option A (shipped)

Keep `amount_destination` **required** in the Segment schema (`ramps-order-proposed.yaml`) and send a best-effort **`0`** from the client when the event fires at amount-commit time, before the provider quote returns.

Option B (make `amount_destination` optional in the schema) was declined to avoid another Segment-schema edit. The client already sends `0`, which validates against both `required: true` and `required: false`.

### Semantics

On the headless surface, `RAMPS_ORDER_PROPOSED` fires when the user commits a fiat amount (`trackAmountCommitted` in `useFiatFunnelMetrics`). At that instant:

- `amount_source` — known (committed fiat in)
- `payment_method_id`, `region`, `chain_id`, `currency_destination`, `currency_source`, `is_authenticated` — known
- `amount_destination` — **not yet known**; no quote has returned

The client sends `amount_destination: 0` as a **sentinel meaning "quote pending"**, not "user will receive zero crypto."

If a quote is already cached when the user commits (e.g. re-commit after editing amount), the emitter may send the cached `amountOut` instead. Treat **`0` on `ramp_type = 'HEADLESS'`** as the canonical pre-quote placeholder.

### Analyst query guidance

Do **not** use `amount_destination` from `RAMPS_ORDER_PROPOSED` for:

- Averages or sums of crypto received
- Revenue / volume in destination asset
- Exchange-rate math (use `exchange_rate` on `RAMPS_ORDER_SELECTED` instead)

**Recommended patterns:**

1. **Funnel volume (fiat in):** use `amount_source` on `RAMPS_ORDER_PROPOSED` or `RAMPS_ORDER_SELECTED`.
2. **Crypto out / fees / rate:** use `RAMPS_ORDER_SELECTED`, `RAMPS_TRANSACTION_CONFIRMED`, or terminal transaction events.
3. **Exclude placeholder rows:** `amount_destination > 0` OR `event = 'Ramps Order Selected'` when aggregating crypto-out.
4. **Proposed → Selected conversion:** count events; do not join on `amount_destination`.

### Native DEPOSIT comparison

The legacy native Deposit flow fires `RAMPS_ORDER_PROPOSED` later in the journey (after quote / auth steps), so `amount_destination` is usually populated. Headless is intentionally earlier (amount-commit) to measure upstream drop-off (see TRAM-3623 funnel analysis).

## Schema reference

- Segment event: `libraries/events/metamask-mobile-ramps/deposit/ramps-order-proposed.yaml`
- Schema PR (HEADLESS / `ramp_surface`): Consensys/segment-schema#621
- Funnel implementation: MetaMask/metamask-mobile#31716

## Open item

Analytics-owner sign-off (Amitabh Aggarwal): confirm documented `0` placeholder is acceptable for Preset / Mixpanel funnels and that downstream dashboards filter correctly.
