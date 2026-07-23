# Phase 6: UI Migration by Product Slice

> **Track status:** incremental post-service work, not a Kalshi launch prerequisite as a whole. Kalshi builds only the views required by each active vertical slice and may reuse venue-neutral legacy presentation or app design-system modules.

## Goal

Move product surfaces to canonical hooks/views when doing so reduces coupling or unlocks a Venue. Do not rebuild every Predict primitive before shipping Kalshi, and do not require a complete screen rewrite merely because its data capability migrated.

## Rules

- one routed surface uses one coherent data/workflow path,
- hooks and route params carry explicit `venueId` or `PredictAccountScope`,
- UI branches on product capability metadata, not Venue names,
- Account Setup, Claim, Settlement, Immediate/Resting Order, and funding affordances follow capability structure,
- services own idempotency/retry/workflow transitions,
- sensitive setup input stays view-local and is never persisted/logged,
- use the app design system first,
- extract/reuse a primitive only when at least two real callers justify it,
- every migrated behavior has component-view coverage.

## Kalshi Vertical Views

Build in delivery order:

1. **Account Setup / Readiness**
   - canonical setup-step renderer,
   - new/link paths,
   - pending/rejected/resume states,
   - no sensitive state persistence.
2. **Deposit / Balance**
   - amount and validated Funding Plan,
   - app-native transaction confirmation,
   - indication/reconciling/resume state,
   - no manual transaction-hash input.
3. **Markets / Immediate Order**
   - Venue-qualified Event/detail reads,
   - preview expiry and explicit Deposit-first policy,
   - no open/cancel/amend UI when Resting Orders are disabled.
4. **Portfolio / Activity**
   - Balance, Positions, Fill and Settlement Activity,
   - no Claim affordance for automatic Settlement.
5. **Withdraw**
   - side-effect-free preview,
   - explicit confirmation,
   - honest submitted/processing state and support reference.

A separate/flagged Kalshi surface is the fastest default. If product requires a merged feed/portfolio, implement a Venue aggregation module and per-Venue account state first; do not switch one global adapter underneath mixed UI.

## Long-Term UI Organization

The three-tier organization remains useful when real reuse exists:

- `components/` — pure Predict primitives,
- `widgets/` — hook-connected product sections,
- `views/` — routed surfaces.

Potential modules include EventCard, OutcomeButton, PositionCard, EventFeed, PortfolioSection, OrderForm, PredictHome, EventDetails, and TransactionsView. This is an organizational target, not a required file inventory.

`EventDisplayModel` may provide a stable presentation interface where feed/detail/card variants genuinely share rendering. Avoid a wide prop surface and avoid extracting it before two callers prove the seam.

## Polymarket UI Strangling

After Kalshi stabilizes, switch Polymarket surfaces capability by capability:

1. public Event feed/detail reads,
2. portfolio sections,
3. Order flow,
4. Deposit/Withdraw/Claim,
5. live/sports/crypto specializations,
6. external embeds/deeplinks.

A migrated view may reuse existing venue-neutral presentational modules while replacing its data/workflow path. Do not import legacy provider/controller/hooks into PredictNext.

## Hook Requirements

Canonical hooks remain organized by domain:

- events: `useEventList`, `useEventDetail`, `usePrices`, optional search/series/crypto hooks,
- portfolio: `usePositions`, `useBalance`, `useActivity`, optional `usePnL`; add `useOrders` only with a Resting-Order product slice,
- imperative: `useTrading`, `useTransactions`, optional `useLiveData`,
- navigation/guard: `usePredictNavigation`, `usePredictGuard`.

Each query hook triggers one descriptor-owned query. Event hooks include `venueId`; portfolio/workflow hooks include `PredictAccountScope`.

## Verification

For each slice:

- component-view preset/renderer/test,
- capability absence scenarios,
- loading/empty/degraded/error states,
- operation resume after remount for committed writes,
- accessibility and sensitive-data behavior,
- performance comparison where replacing an existing surface,
- route/flag rollback.

Standalone hook/component tests are added only for behavior not better covered at the view or pure-function seam.

## External Consumers

Switch Homepage, Wallet actions, Browser, deeplinks, and route types only when the exported canonical surface they need is stable. External imports come from the PredictNext public entrypoint, not internal widgets/services/adapters.

## Acceptance Criteria per Slice

- explicit Venue/account scope,
- no Venue protocol or credential logic in UI,
- no duplicate workflow/retry/idempotency policy,
- capability-correct affordances,
- no sensitive setup values in persisted state/logs,
- passing component-view coverage,
- independent feature-flag rollback,
- equal or better user/performance behavior.
