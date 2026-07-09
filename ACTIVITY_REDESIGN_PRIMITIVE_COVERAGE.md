# Activity Redesign — Primitive Coverage & Pending Issues

**Date:** 2026-07-09 (last updated; original coverage pass 2026-06-26)
**Scope:** Maps every primitive in the Figma activity redesign against the actual
implementation across two layers — the **Activity List Item** (the row in the
scrollable list) and the **Transaction Details** screen (tapping a row) — and
consolidates the still-open gotchas/pending issues.
**Branch context:** `tmcu-702-perps-and-predict-activity-details` (PR #32405).
**Consolidated from:** `TRANSACTION_DETAILS_REDESIGN_FINDINGS.md` (Phase 1–3 plan,
now executed) and `TRANSACTION_DETAILS_UI_POLISH.md` (UI polish tracker) — both
historical architecture references; the live gotchas now live here.

## Source-of-truth files

| Concern                                                   | File                                                                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Kind taxonomy (`ActivityKind` union + `ActivityListItem`) | `app/util/activity-adapters/types.ts`                                                                                   |
| Details dispatch (type → template)                        | `app/components/Views/ActivityDetails/templates/TemplateLoader.tsx`                                                     |
| List row rendering + title resolver                       | `app/components/UI/ActivityListItemRow/ActivityListItemRow.tsx`                                                         |
| Tap routing (redesign vs legacy fallbacks)                | `app/components/Views/ActivityList/ActivityList.tsx` (`handleActivityItemPress`)                                        |
| EVM adapters (what _emits_ each kind)                     | `app/util/activity-adapters/adapters/api-evm-transactions.ts`, `.../local-transaction.ts`, `.../keyring-transaction.ts` |
| Perps adapter                                             | `app/util/activity-adapters/adapters/perps-transaction.ts`                                                              |
| Predict adapter                                           | `app/util/activity-adapters/adapters/predict-activity.ts`                                                               |

> A kind only renders a row if an **adapter emits it**, and only shows a
> redesigned details screen if `TemplateLoader` has a `case` for it (everything
> else falls to `DefaultDetails`, a minimal view).

---

## Verdict

- **Perps** and **Predict** are fully covered in both layers.
- **Standard** transactions are mostly covered. **This branch added Smart account
  upgrade and Earn/Staking deposit + claim + unstake** (both layers, lumped under
  the Transactions filter). Only remaining standard gap: **Ramp (buy & sell —
  owned by a co-worker)**. See the staking note for the unstake-amount caveat.

---

## Table 1 — Activity List Item (the row)

**Done** = dedicated kind + an adapter emits it + the row renders
title/icon/subtitle/amount.

### Standard

| #   | Primitive                                      | Kind                                                                     | Status                | Evidence / note                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ramp – sold                                    | `sell`                                                                   | ❌ Not done           | `sell` defined (`types.ts:19`) but **no adapter emits it** (only test fixtures). Ramp off-ramps surface as generic send / contractInteraction                                                                                                             |
| 2   | Ramp – bought / deposit                        | `buy`                                                                    | ❌ Not done (as ramp) | `buy` is emitted **only for NFT purchases** (`api-evm-transactions.ts:248-261` — NFT-in + native-out), not fiat on-ramp                                                                                                                                   |
| 3   | Send                                           | `send`                                                                   | ✅ Done               |                                                                                                                                                                                                                                                           |
| 4   | Swap                                           | `swap`                                                                   | ✅ Done               |                                                                                                                                                                                                                                                           |
| 5   | Bridge                                         | `bridge`                                                                 | ✅ Done               |                                                                                                                                                                                                                                                           |
| 6   | Receive                                        | `receive`                                                                | ✅ Done               |                                                                                                                                                                                                                                                           |
| 7   | Approve spending cap                           | `approveSpendingCap`                                                     | ✅ Done               |                                                                                                                                                                                                                                                           |
| 8   | Increase spending cap                          | `increaseSpendingCap`                                                    | ✅ Done               |                                                                                                                                                                                                                                                           |
| 9   | Smart contract interaction                     | `contractInteraction`                                                    | ✅ Done               |                                                                                                                                                                                                                                                           |
| 10  | Claimed mUSD bonus                             | `claimMusdBonus`                                                         | ✅ Done               |                                                                                                                                                                                                                                                           |
| 11  | Converted to mUSD                              | `convert`                                                                | ✅ Done               |                                                                                                                                                                                                                                                           |
| 12  | Earn (lending + staking deposit/claim/unstake) | `lendingDeposit` / `lendingWithdrawal` / `deposit` / `claim` / `unstake` | ✅ Done               | Lending (`local-transaction.ts:592`). Staking **deposit** → `deposit`, **claim** → `claim`, **unstake** → `unstake`. Native-ETH avatar; amount from tx value (deposit) / `enterExitQueue` calldata (unstake) — see staking note for the shares≈ETH caveat |
| 13  | Smart account upgrade                          | `smartAccountUpgrade`                                                    | ✅ Done               | Emitted via `txParams.authorizationList` (the canonical `isUpgrade` signal) in `local-transaction.ts`; row already existed                                                                                                                                |
| 14  | Non-EVM (Solana) swap                          | `swap`                                                                   | ✅ Done               | keyring adapter → `swap`                                                                                                                                                                                                                                  |

### Perps — all ✅ Done

Emitted by `perps-transaction.ts`; rendered with i18n title + position-size
subtitle + USD amount.

- Deposit (`perpsAddFunds`), Withdrawal (`perpsWithdraw`)
- Open Long / Close Long (`perpsOpenLong` / `perpsCloseLong` + `…Liquidated` / `…StopLoss` / `…TakeProfit`)
- Open Short / Close Short (`perpsOpenShort` / `perpsCloseShort` + `…Liquidated` / `…StopLoss` / `…TakeProfit`)
- Orders: `marketShort`, `marketCloseShort`, `stopMarketCloseShort`, `limitShort`, `limitCloseShort`
- Received / Paid funding fee (`perpsReceivedFundingFees` / `perpsPaidFundingFees`)

Status variants (canceled / filled / liquidated / stop-loss) are handled via a
status suffix + dedicated kinds, not generic fallbacks.

### Predict — all ✅ Done

- Funded account (`predictionsAddFunds`)
- Funding in-progress / failed (status variants of the above via tx status)
- Withdrawn (`predictionsWithdrawFunds`)
- Predicted (`predictionPlaced`)
- Cashed out (`predictionCashedOut`)
- Claimed earnings (`predictionClaimWinnings`)

---

## Table 2 — Transaction Details (the screen)

**Done** = `TemplateLoader` dispatches the type to a dedicated template.
Everything not in that switch falls to `DefaultDetails` (minimal).

### Standard

| #   | Primitive                  | Template                                                                   | Status                                                                                                    |
| --- | -------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Ramp – sold                | —                                                                          | ❌ Not done (no row to open; `sell` → DefaultDetails)                                                     |
| 2   | Ramp – bought              | —                                                                          | ❌ Not done — `buy` not in switch → `DefaultDetails`; no fiat rate / provider / total rows from the Figma |
| 3   | Send                       | `SendDetails`                                                              | ✅ Done                                                                                                   |
| 4   | Swap                       | `SwapDetails`                                                              | ✅ Done                                                                                                   |
| 5   | Bridge                     | `BridgeDetails`                                                            | ✅ Done · 🟡 in-progress/local bridge still routes to the **legacy** screen (`ActivityList.tsx:769-771`)  |
| 6   | Receive                    | `SendDetails`                                                              | ✅ Done                                                                                                   |
| 7   | Approve spending cap       | `ApprovalDetails`                                                          | ✅ Done                                                                                                   |
| 8   | Increase spending cap      | `ApprovalDetails`                                                          | ✅ Done                                                                                                   |
| 9   | Smart contract interaction | `ContractInteractionDetails`                                               | ✅ Done                                                                                                   |
| 10  | Claimed mUSD bonus         | `ClaimMusdBonusDetails`                                                    | ✅ Done                                                                                                   |
| 11  | Converted to mUSD          | `SwapDetails`                                                              | ✅ Done                                                                                                   |
| 12  | Earn                       | `SwapDetails` (lending) · `DepositDetails` (staking deposit/claim/unstake) | ✅ Done                                                                                                   |
| 13  | Smart account upgrade      | `SmartAccountUpgradeDetails`                                               | ✅ Done (account hero + metadata + network fee, no total)                                                 |
| 14  | Non-EVM Solana swap        | `SwapDetails`                                                              | ✅ Done                                                                                                   |

### Perps — all ✅ Done via `PerpsDetails` (flag-gated)

`app/components/Views/ActivityDetails/templates/PerpsDetails.tsx`

- **Funds branch** — deposit shows a steps timeline; withdrawal has none (by design).
- **Trade branch** — size / price / fees; P&L shown when filled.
- **Order branch** — MetaMask + Hyperliquid + total fee breakdown; "Try again" on canceled.
- **Funding branch** — received (green) / paid funding fee.

**Caveat:** gated by `selectIsTransactionsRedesignEnabled`. Flag OFF → legacy
`Routes.PERPS.POSITION_TRANSACTION` / `FUNDING_TRANSACTION` / `ORDER_TRANSACTION`.

### Predict — all ✅ Done via `PredictDetails` (flag-gated)

`app/components/Views/ActivityDetails/templates/PredictDetails/`

- `PredictFundsDetails` — deposit timeline; withdrawal has none (by design); handles in-progress / failed.
- `PredictProviderActivityDetails` — predicted / cashed-out (net P&L row) / claimed (claim breakdown).

**Caveat:** flag OFF → legacy `Routes.PREDICT.ACTIVITY_DETAIL`.

---

## What's actually "Not done"

1. **Ramp – sold** — no `sell` emission anywhere; no detail screen. _(owned by a co-worker)_
2. **Ramp – bought** — `buy` is NFT-purchase-only; no fiat-ramp row, and no
   rate / provider / total detail from the Figma. _(owned by a co-worker)_
3. **Bridge in-progress** (partial) — `BridgeDetails` exists, but live/local
   bridges still open the legacy screen.

> Staking (stake / unstake / claim) is now **done** on this branch — see the
> staking note for the unstake-amount caveat.

> Figma's last tile, _"Custom EVM networks,"_ is a block-explorer-copy note, not
> a transaction primitive.

### Staking (stake / unstake / claim) — design vs. legacy

- **Shipped feature** (`app/components/UI/Stake`, `app/components/UI/Earn`); the
  legacy activity list labels all three: **"Staked" / "Unstaked" / "Staking claim"**
  (`util/transactions/index.js` action-key maps).
- **The Figma redesign does _not_ include staking-specific screens** — it has a
  single generic **"Earn — Deposited USDC"** tile (no Stake / Unstake / Staking-claim
  tiles). So there's no design to match; unstake was built for **legacy parity**.
- **Redesign status (done):** `deposit` → "Deposited", `claim` → "Claimed",
  `unstake` → "Unstaked", all via `DepositDetails`, lumped under the
  **Transactions** type filter (`ActivityScreen/types.ts`). Pooled staking is
  native ETH, so the row/hero resolve the **native ETH** avatar — not the
  staking-contract address (which has no token metadata → the old "?" avatar).
- **⚠️ Unstake-amount caveat (shares ≈ ETH, not exact):** the unstaked amount is
  the **`shares`** value parsed from the `enterExitQueue(shares, …)` calldata (the
  unstake tx has `value: 0`, so the amount lives in the calldata). Shares are
  **≈ ETH but not exact** — the MetaMask staking vault's exchange rate drifts above
  1.0 as rewards accrue, so shares slightly **understate** the ETH received. Exact
  ETH would need the vault exchange rate **at tx time**, which isn't available
  historically in the adapter (`EarnController` only exposes the _current_ rate).
  Deposit amount **is** exact (the tx `value`); claim has no amount in the tx
  (ETH is received via the contract). Follow-up: apply the exchange rate (accepting
  it'll be the current rate) or label the unstake amount as approximate.

---

## Gotchas & Pending Issues (still relevant)

> Verified live on 2026-06-26 against the branch. Items confirmed resolved are in
> the next section so they aren't re-flagged.

### A. Deferred engineering follow-ups

1. **Perps order fees are a live re-quote, not the fee paid.** `OrderDetails`
   derives MetaMask / Hyperliquid / Total from `usePerpsOrderFees` — a
   forward-looking order-entry estimator (current VIP tier, live Rewards
   discount, assumed taker) — because the `order` record carries no fee field.
   It's a 1:1 port of legacy `PerpsOrderTransactionView`. Cleanup applied:
   non-filled (canceled/failed) orders pass `amount: '0'` to skip the live fetch.
   **Follow-up:** source real historical fees (e.g. from the associated fill)
   and/or label the rows as estimated — across **both** the redesigned and legacy
   screens. _(verified live: `PerpsDetails.tsx:180`)_
2. **Perps funds-movement fees + "Account funded" Total row absent.** Figma shows
   Network / Bridge / Total on deposit/withdrawal; HyperLiquid returns **no fee**
   for funds movements. A gas-join spike failed because a perps deposit is a
   **cross-chain bridge** (e.g. mainnet → Arbitrum) — the gas-paying source tx
   and HL's Arbitrum settlement record **share no key**. The correct source (per
   extension `perps-deposit-details.tsx`) is the local `TransactionMeta`'s
   pre-computed `metamaskPay.{targetFiat,networkFeeFiat,bridgeFeeFiat,totalFiat}`.
   **Open question gating feasibility:** does mobile's Perps deposit (MetaMask
   Pay) flow actually **populate** `metamaskPay.*Fiat`? (Mobile only reads
   `metamaskPay.chainId/tokenAddress/isPostQuote` today.) If yes → add a `perps*`
   case to `local-transaction.ts`, or resolve the local `TransactionMeta` by hash
   inside `FundsDetails` (keyed to the **source MetaMask Pay tx**, not HL's
   Arbitrum hash — the keying that broke the spike). Accept the extension's limit:
   only on-device MetaMask Pay deposits show fees. _(verified absent in `PerpsDetails.tsx`)_
3. **Just-submitted local tx: captured id orphaned once the hash lands — FIXED
   (2026-07-09).** `useActivityDetailsItem` keyed local resolution on `hash`
   only. A freshly-submitted tx has no on-chain hash for a brief (~sub-second)
   window, so the row falls back to `hash = primaryTransaction.id` (the internal
   id) and navigation captures that id; once the tx is broadcast,
   `useLocalActivityItems` re-keys the item by its real hash, orphaning the
   captured id → the details screen flipped to "Transaction details are
   unavailable" until reopened. Repro: submit a send and tap into details within
   the hashless window. **Fix:** additionally index local items by their internal
   tx id(s) — `primaryTransaction.id` / `initialTransaction.id` /
   `transactions[].id` via `buildLocalItemsById` — so a captured id keeps
   resolving after the hash arrives. (Same identifier-flip class as
   speed-up/cancel — TMCU-1036 — which is handled separately by the
   return-to-list dismiss on the details screen.)
4. **Staking unstake amount is `shares`, not exact ETH.** Parsed from the
   `enterExitQueue` calldata; the vault exchange rate (>1.0) makes shares slightly
   understate the ETH received, and the historical rate isn't available in the
   adapter. **Follow-up:** apply the (current) exchange rate or label it
   approximate. Full detail in the Staking note above.
5. **Staking recognised only from the typed local copy.** Confirmed staking
   renders correctly because the typed local row wins over the backend's generic
   contract-call copy (dedup protection). A staking tx that exists **only** as the
   backend copy (pruned / cross-device) still reads "Smart contract interaction" —
   fixing that needs stake-sdk contract/method detection on the API path.
6. **Swaps degrade to `swapIncomplete` → `DefaultDetails` (no dual-amount hero, no
   fees, From/To instead of Account).** _(verified live 2026-06-29 — a confirmed
   ETH→mUSD swap rendered as bare "Swapped" with the generic layout instead of the
   "Swapped ETH to mUSD" + "You sent / You received" design.)_ Two stacked causes:
   - **Classification.** `getSwapTokenEnrichment` (`useLocalActivityItems.ts:166`)
     reads **only legacy SwapsController fields** — `sourceTokenSymbol` /
     `destinationTokenSymbol` / `swapMetaData.token_from|token_to`. Swaps routed
     through the **unified Swap/Bridge flow** don't carry those, so both symbols
     resolve `undefined`; the adapter then emits **`swapIncomplete`**
     (`local-transaction.ts:551`, gated on `destinationToken?.symbol`). And
     `swapIncomplete` has **no case** in `TemplateLoader` (only `swap`/`wrap`/
     `unwrap` → `SwapDetails`), so it hits `default → DefaultDetails`
     (`showFeesAndTotal={false}`, generic metadata) — hence the bare title,
     From/To rows, and missing hero/fees.
   - **Amounts (latent).** Even when symbols resolve, the enrichment builds tokens
     as `{ direction, symbol }` with **no `amount`/`decimals`**
     (`useLocalActivityItems.ts:184`), so the design's `-0.01 ETH` / `+33.93 mUSD`
     amounts and the fiat **Network fee / Total** stay blank for local swaps.
     **Follow-up:** (a) resolve source/dest **symbol + amount + decimals** from the
     modern swap fields (e.g. `sourceTokenAmount`/`destinationTokenAmount`, quote /
     `transferInformation`, bridge history) so swaps classify as `swap` and carry
     amounts — confirm which controller field current (unified) swaps populate; and
     (b) cheap safety net — route `swapIncomplete` → `SwapDetails` so a partially
     resolved swap keeps the swap layout instead of the generic fallback. Pre-existing
     gap from the redesign (PR #32291 / enrichment hook from #31016) — **not** from
     the staking/upgrade/Tx-ID branch.
   - **Update (PR #32678, TMCU-977):** safety-net (b) shipped — `swapIncomplete`
     now routes to `SwapDetails`, and `useActivityDetailsItem` prefers a matching
     API `swap` over a local `swapIncomplete` (so the list's rich copy wins), plus
     From/To → single **Account** row for swaps. The classification data gap (a) —
     local `getSwapTokenEnrichment` still reads only legacy Swaps fields — remains
     for local-only (no API copy) unified swaps.

7. **"Swap again" fixes (PR #32678, TMCU-977) overlap Patryk's Bridge PR
   (#32582, TMCU-957) — reconcile after both land.** #32678 fixes the "Swap again"
   hollow-token bug on the **ActivityDetails side**: `toBridgeToken` hydrates
   source/dest from held tokens (`useTokensWithBalance` → icon + balance + fiat),
   normalizes Polygon native `0x…1010 → 0x0` (`isSameBridgeToken` /
   `normalizeTokenAddress`), opens with an **empty amount** (drops `sourceAmount`)
   and clears the stale Bridge `sourceAmount`. #32582 solves the same UX from the
   **Bridge side**: deferred content loading + `displaySourceToken` /
   `latestSourceBalance` + route fallbacks (`useBridgeViewRouteFallbacks`), keeping
   the route source token / dest / **amount** visible during the Redux handoff.
   - **No git conflict** — disjoint files (theirs `UI/Bridge/**`, ours
     `Views/ActivityDetails/**`).
   - **Redundant hydration** — both resolve the source token's balance/icon. After
     both merge, decide which side owns it: their Bridge-side `latestSourceBalance`
     may make our ActivityDetails-side balance-hydration moot, but our
     Polygon-native address normalization still matters if their balance lookup
     keys on the passed address.
   - **Opposite amount intent** — they preserve/display the route `sourceAmount`;
     we intentionally blank it. Mechanically compatible (we pass none → their
     fallback shows empty), but confirm the desired behavior (empty vs prefilled).
   - **Action:** coordinate with Patryk (2nd overlapping PR in this area after the
     TMCU-951 nav commit); whoever merges second rebases + dedups the hydration and
     settles the amount behavior.

### B. Product / design decisions needed (POLISH G1–G7)

- **G1 — Gas-station "Pay With" / non-native gas token.** Adapters emit only the
  **native** base fee (`gasUsed × effectiveGasPrice`); they don't read
  `selectedGasFeeToken` / `gasFeeTokens`. The fee-value UI already renders a token
  avatar+symbol, so it's a **data-layer** gap. **Decision:** inline token in the
  Network fee row (per the design _screenshot_) **vs** a separate **"Pay With"**
  row (per the design _thread_) — these conflict. Multi-tx gas breakdown is a
  bigger follow-up. _(verified: no `gasFeeTokens` in `activity-adapters`)_
- **G2 — `$0` total / missing fee row.** On some sends (e.g. aEthUSDC): no
  Network fee row + "Total amount $0" (no `gasUsed` in receipt, and/or token fiat
  rounds to `$0.00`). **Decision:** show a `<$0.01` floor or fall back to the
  token amount instead of "$0"? (Display-only.)
- **G3 — Account-style avatar for contract addresses.** Contract-interaction hero
  uses an address-derived maskicon, so a contract reads like an EOA. Confirm vs a
  token logo (when `data.token` known) or a distinct "contract" glyph.
- **G4 — Tx-ID row.** Renders the shortened hash only. Confirm whether design
  wants a copy affordance / tappable hash.
- **G5 — Non-EVM (Solana / Bitcoin).** Routes into the new screen but renders via
  generic templates (Solana swap → `SwapDetails`; others generic). Confirm the
  generic pass is acceptable vs dedicated non-EVM templates later.
- **G6 — Network vs account row icon spacing.** Account rows use `gap-1`; the
  Network row still uses `gap-2`. Confirm whether they should be pixel-matched.
- **G7 — Redundant network badge on native-asset hero/fee avatars.** For a
  native-asset tx (e.g. ETH on Ethereum, TRX on Tron) the token glyph and the
  overlaid network badge are the same → redundant. A blanket "non-EVM → no badge"
  was tried and **reverted** (wrongly strips badges from non-native non-EVM
  tokens — SPL/TRC-20). **Decision:** if design wants it gone, gate the badge on
  the token being the chain's **native asset** (`assetId` ⇒ `slip44:` namespace),
  uniformly across EVM + non-EVM. _(verified: no native-asset gating yet)_

### C. Known template gaps (cross-ref "What's actually Not done")

- Generic fallback (`DefaultDetails`) has **no "do it again" CTA** (per-type targets only).
- **No Detox/e2e coverage for the Activity filter bar (TMCU-951).** Unit + view
  tests cover the Type/Network/Perps chips and the Perps sub-filter sheet, but
  there is **no Activity e2e page object** to extend (grep of `e2e/` finds no
  Activity-filter selectors). A smoke/regression test for the Perps sub-filter
  (`PERPS_FILTER_CHIP`/`SHEET` selectors exist) is a follow-up once an Activity
  e2e harness is stood up — it needs a build to author/run, out of scope here.

### D. Visual-QA backlog (renders, not yet design-verified — POLISH tracker)

Swap-family **Convert / Wrap / Unwrap / Lending**, **Bridge**, **NFT mint**,
**Claim mUSD bonus**, single **amount header** (send/receive), **Non-EVM** generic
render. (Perps/Predict were added after that tracker and are covered above.)

---

## Resolved on this branch — do not re-flag

- **Smart account upgrade (EIP-7702)** → new end-to-end: emitted via
  `txParams.authorizationList` (after the specific early-returns, so a batch that
  also performs a recognised action keeps its label) → new
  `SmartAccountUpgradeDetails` (account hero + metadata + network fee, no total).
- **Earn/Staking deposit + claim + unstake** → new `DepositDetails` (amount +
  network fee + total); `stakingDeposit`→`deposit`, `stakingClaim`→`claim`,
  `stakingUnstake`→new `unstake` kind. Pooled staking resolves the **native ETH**
  avatar/amount (deposit from tx `value`, unstake from `enterExitQueue` calldata
  shares — see caveat). Typed local staking rows are protected from confirmed-copy
  dedup (added to `localDomainKindHashes`), and staking is lumped under the
  **Transactions** type filter. `TemplateLoader` routes `deposit` / `claim` /
  `unstake` / `smartAccountUpgrade`.
- **Predict sell "Net P&L" fallback** → fixed: row only renders when `netPnlUsd`
  is supplied (`hasNetPnl` gate); never substitutes the gross notional. Regression
  test added.
- **`fees` / `ActivityFee`** restored to the types; base **Network fee** populated
  in the adapter and **fiat Total** rendered (converted at render time).
- **`DualAmountHeader` + `BridgeExplorerButtons`** are now wired (swap / bridge),
  no longer unused kit.
- **"Do it again" CTA** → action-specific "Swap again" / "Bridge again".
- **Provider-backed hand-off** (Perps/Predict): the stale-preload bug is fixed via
  a unique per-navigation `preloadKey` (serializable param) + capture-once `useRef`
  in `ActivityDetails`; store is bounded.
- **UI polish:** status row icon removed (color label only); account-row spacing
  `gap-1`; footer device-aware (`SafeAreaView` additive); Tron duplicate
  "Network fee" labels disambiguated (Bandwidth/Energy).

---

## Architecture notes (for future work)

- **Two gates to "done":** a kind must be (a) emitted by an adapter, and (b)
  present in the `TemplateLoader` switch. A kind can exist in `types.ts` and even
  render a row, yet still have no details screen (e.g. `buy`, `sell`,
  `contractDeployment`, `swapIncomplete` still fall to `DefaultDetails`).
- **Redesign is flag-gated** via `selectIsTransactionsRedesignEnabled`
  (= `tmcuActivityRedesignEnabled` && `tmcuTransactionsRedesignEnabled`, both
  `productionDefault: false`). With the flag OFF, every row uses its legacy
  screen/sheet.
- **Re-resolve by identifier, don't pass the item** (Phase 2 rule, mirrors the
  extension): `useActivityDetailsItem` re-resolves the `ActivityListItem` by
  `hash` from local → non-EVM → API with precedence (categorized API item wins
  over a generic local `contractInteraction`). The **exception** is provider-backed
  Perps/Predict rows, which can't be re-resolved by hash and are handed off via
  `preloadedActivityItemStore` (serializable `preloadKey` only).
- **To add a missing primitive end-to-end:** (1) emit the kind in the relevant
  adapter, (2) add an `ActivityListItemRow` title/icon mapping, (3) add a
  `TemplateLoader` `case` → template, (4) ensure `useActivityDetailsItem` can
  re-resolve it (or hand it off via the preload store).
