# TAT-3016 — HyperLiquid Balance Incident: Clarity Brief

> Last updated: 2026-04-23 · Owner: Arthur Breton (@abretonc7s)
>
> Purpose: a single page any team member can read in under 3 minutes to know
> what happened, what shipped, what's still open, and how much we trust each
> claim. No code, no bandages, no new PRs get opened off the back of this
> document.

## 1. The Incident

Over the weekend of **2026-04-18**, HyperLiquid users holding their
collateral as **spot USDC** started seeing **$0** perps balance in MetaMask
Mobile — even though their funds were clearly on HyperLiquid and tradable
on HL's own web app / Phantom.

Root cause: the streamed and standalone account-state paths inside
`HyperLiquidSubscriptionService` / `HyperLiquidProvider` never fetched
`spotClearinghouseState`; only the full-fetch path did. Two unrelated
changes made a long-standing omission user-visible:

1. **#27898** _(2026-04-11)_ — "disk-backed cold-start cache" flipped
   `usePerpsLiveAccount` to seed first render from the in-memory stream
   snapshot. The stream snapshot has always been spot-less.
2. **HL Portfolio Margin alpha** _(shipped 2026-04-18 network upgrade)_ —
   pushed more users toward holding collateral as spot USDC rather than
   inside the perps clearinghouse.

Jira: [TAT-3016](https://consensyssoftware.atlassian.net/browse/TAT-3016).
Known follow-ups: TAT-3047 (contract reshape), TAT-3050 (pay-with leak).

## 2. Account Under Test

- Address: `0x316BDE155acd07609872a56Bc32CcfB0B13201fA` (shared Trading fixture)
- Mode: **Unified** (spot-only collateral, `withdrawable = 0`)
- HL web reference values observed: total ≈ **$109.77**, available ≈ **$99.54**

## 3. PR Map

| PR                                                               | Title                                                                          | Author      | Base branch                           | State                                  | Shipped to                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------- | ------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| [#29089](https://github.com/MetaMask/metamask-mobile/pull/29089) | fix: include spot balances in streamed perps total balance                     | @geositta   | `main`                                | CLOSED (superseded by #29110)          | —                                                    |
| [#29110](https://github.com/MetaMask/metamask-mobile/pull/29110) | fix(perps): complete spot-balance parity cp-7.72.2                             | @abretonc7s | `main`                                | **MERGED 2026-04-21**                  | `main` + cp-7.72.2 via #29145 + cp-7.74.0 via #29168 |
| [#29145](https://github.com/MetaMask/metamask-mobile/pull/29145) | cherry-pick of #29110 → `release/7.72.2`                                       | runway-bot  | `release/7.72.2`                      | MERGED 2026-04-21                      | **OTA hotfix shipped to users (7.72.2)**             |
| [#29168](https://github.com/MetaMask/metamask-mobile/pull/29168) | cherry-pick of #29110 → `release/7.74.00`                                      | runway-bot  | `release/7.74.00`                     | MERGED 2026-04-22                      | Next release train                                   |
| [#29150](https://github.com/MetaMask/metamask-mobile/pull/29150) | fix(perps): default spot-funded order entry to perps balance cp-7.72.2         | @geositta   | `main`                                | **OPEN**                               | not yet merged                                       |
| [#29171](https://github.com/MetaMask/metamask-mobile/pull/29171) | refactor: simplify TAT-3016 payment-token inference + agentic cycle validation | @abretonc7s | `perps/fix-avail-balance-order-entry` | MERGED 2026-04-22 into #29150's branch | folded into #29150                                   |
| [#29217](https://github.com/MetaMask/metamask-mobile/pull/29217) | fix: Perps/refresh hl live account cache                                       | @geositta   | `perps/fix-avail-balance-order-entry` | **OPEN (current branch)**              | not yet merged                                       |

Parent chain for the open work: `main ← #29150 ← #29217`.

## 4. What Each Step Actually Did

- **#29110 (merged to main + OTA 7.72.2)** — Folds `spot.total`
  (USDC + USDH allowlist) into `AccountState.totalBalance` across all three
  account-state paths (streamed, standalone, full-fetch). Gates the
  "Add Funds" CTA on `totalBalance`. Adds a race-free `#spotStateGeneration`
  guard in `HyperLiquidSubscriptionService`. **Deliberately leaves
  `availableBalance = clearinghouseState.withdrawable`** — so order entry
  still reads `$0 available` for Unified / spot-USDC users.
- **#29150 (open)** — Introduces a new optional field
  `AccountState.availableToTradeBalance = withdrawable + (spotTotal − spotHold)`.
  Order-entry surfaces (market-details balance row, Long/Short vs Add-Funds
  CTA, order-form submit gate) switch to
  `availableToTradeBalance ?? availableBalance`. **Withdraw path is
  deliberately left on `availableBalance`** (non-regression: spot fold
  must never be offered as withdrawable). Adds `getExchangeClient()`
  escape hatch used by the agentic validation flow.
- **#29171 (folded into #29150)** — Pure refactor. Strips the
  `SelectedPaymentTokenSource` state machine, inlines the simpler
  payment-token inference, adds `hl-balance-validation` +
  `hl-provision-fixture` agentic flows.
- **#29217 (open, current branch)** — Adds an optional
  `refreshLiveAccountState()` method to `PerpsProvider`. HL implementation
  forces a fresh `spotClearinghouseState` fetch and re-emits through the
  existing account stream. `TradingService` calls it fire-and-forget after
  every successful mutation: `placeOrder`, `cancelOrder(s)`,
  `closePosition(s)`, `updateMargin`, `flipPosition`. Purpose: close the
  "tradeable balance doesn't refresh automatically after a mutation" gap.

## 5. What Production Ships Today (main + OTA 7.72.2)

| Symptom on a Unified / spot-USDC account                 | Pre-fix                  | Today (with #29110)           |
| -------------------------------------------------------- | ------------------------ | ----------------------------- |
| `totalBalance` in perps header                           | `$0`                     | **Correct (e.g. $109.77)** ✅ |
| "Add Funds" CTA wrongly shown                            | Yes                      | **Hidden** ✅                 |
| `availableBalance` / "Available to trade" in order entry | `$0`                     | Still `$0` ❌                 |
| Can place an order from MetaMask                         | No                       | **Still no** ❌               |
| Tradeable balance refreshes after place/cancel/close     | Only via WS push cadence | Only via WS push cadence ❌   |

Order-entry fix is gated on **#29150** merging.
Refresh fix is gated on **#29217** merging on top.

## 6. What HL's Own Docs Say the Math Should Be

(source files in this repo: `docs/perps/hyperliquid/account-abstraction-modes.md`,
`margining.md`, `portfolio-margin.md`)

- **Standard mode** — per-DEX `clearinghouseState.withdrawable` matters;
  spot and perps are separate pools. User manually transfers between them.
- **Unified mode** _(our test account)_ — quoting HL directly:
  > "For API users, unified account and portfolio margin shows all
  > balances and holds in the spot clearinghouse state. Individual perp
  > dex user states are not meaningful."
  > Authoritative available-to-trade per collateral token is
  > `spot.total − spot.hold`. Adding `withdrawable` on top is noise on this
  > mode.
- **Portfolio Margin (alpha)** — LTV-weighted buying power:
  `token_balance * borrow_oracle_price * ltv`. USDC `borrow_cap = 1000`,
  HYPE `LTV = 0.5`. **Not implemented** in the app; explicitly deferred
  per #29110.

Implication: our current `availableToTradeBalance = withdrawable + (spotTotal − spotHold)`
happens to be correct on this account only because `withdrawable = 0`. For
a general Unified account it is noise-adding (not breaking); for a PM
account it is fundamentally wrong. Good enough for this hotfix, worth
documenting as a known limitation in the PR body rather than shipping
silently.

## 7. Confidence Matrix

| Question                                                      | Confidence           | Evidence                                                                                           |
| ------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| What each merged PR does?                                     | HIGH                 | PR bodies + diff + git log                                                                         |
| What ships in OTA 7.72.2?                                     | HIGH                 | #29145 merged into `release/7.72.2`                                                                |
| Does #29150 fix the "$0 available" order-entry display?       | HIGH                 | Matches HL Unified-mode spec                                                                       |
| Does #29217 fully stop stale balance flicker after mutations? | MEDIUM               | Refresh is fire-and-forget with empty `.catch`-logger; single failed refresh is silently swallowed |
| Do our displayed totals match HL web?                         | LOW until recipe run | §8                                                                                                 |
| Is our formula correct on Standard / PM accounts too?         | LOW                  | §6 — PM math not implemented                                                                       |

## 8. Open Questions (need one agentic recipe run to close)

1. What exactly is HL web's "Available to trade" row reading —
   `spot.total − spot.hold`, `marginSummary.accountValue`, or a PM
   buying-power number?
2. Are any of the accounts currently reported as "broken on main"
   actually in **Portfolio Margin** mode? If yes, #29150 alone will not
   fix them — they need PM buying-power.
3. Is the cross-account `selectedPaymentToken` leak (TAT-3050) affecting
   any of the user reports, or is everything purely a balance issue?

Recipe to answer all three in one run: compose from
`hl-balance-validation` (already added by #29150) + raw HL REST capture
via `HyperLiquidProvider.getExchangeClient()`, then diff the three
MetaMask paths against the REST-derived expected values for the same
account at the same moment in time.

## 9. Decisions Needed

(Not resolved here — filed for the next team sync.)

- Merge order: **#29150 → #29217 → main**, or squash both into one PR?
- OTA path: cherry-pick #29150 to `cp-7.72.2` as a second hotfix, or ship
  in the next release train?
- Portfolio Margin buying-power — file a dedicated ticket, owner + timing
  (likely post-PM-GA).
- Contract reshape `availableBalance → spendableBalance /
withdrawableBalance` — already tracked as [TAT-3047](https://consensyssoftware.atlassian.net/browse/TAT-3047).

## 10. Architectural Critique — Is the Stack Actually Solving the Right Problem?

> Triggered by the observation that balances still do not update
> automatically after a trade, and that #29217 has to manually call a
> refresh method. If WebSockets worked, we would not need to.

### 10.1 HL DOES push spot state over WebSocket — we're just not subscribed

Full HL subscription list (source: `docs/perps/hyperliquid/subscriptions.md`)
includes:

- **`spotState`** _(line 80-83)_ — `{ "type": "spotState", "user": "<address>",
"isPortfolioMargin": bool }`. Data format `WsSpotState { user, spotState:
{ balances: Array<{ coin, token, hold, total, entryNtl }> } }` _(line 380-395)_.
  **This is the exact data our UI needs, pushed in real time.**
  The `isPortfolioMargin` flag even lets HL tailor the payload to the
  account's mode.
- `allDexsClearinghouseState` _(line 84-86)_ — push of perps state across
  all HIP-3 DEXs in one sub.
- `allDexsAssetCtxs` _(line 87-89)_ — push of asset contexts across DEXs.
- `userEvents`, `userFills`, `userFundings`, `userNonFundingLedgerUpdates`,
  `orderUpdates`, `clearinghouseState`, `webData3`, `activeAssetData`, ...

Our current code (`HyperLiquidSubscriptionService.ts`):

- ✅ Subscribes to `webData2` (HIP-3 off) / `webData3` (HIP-3 on) — perps
  only.
- ✅ Subscribes to `userFills` (line 2261) — fill events.
- ❌ **Does NOT subscribe to `spotState`.**
- Comment on line 1521 literally reads _"webData2 doesn't include
  spotState"_ — correct observation, wrong remediation. The remediation
  is to subscribe to `spotState`, not to REST-fetch it manually.

### 10.2 This makes #29217 structurally wrong

The premise of #29217 — _"spot must be pulled via REST because HL doesn't
push it"_ — is not what HL's API offers. HL **does** push it. We built
a refresh pipeline because we didn't read past page 1 of the subs list.

Consequences of the current approach:

- Trades executed from another HL client (HL web, Phantom, API bot) — our
  balance stays stale until the user triggers something in our app.
- Hourly funding settlements.
- Liquidations.
- Deposits / withdrawals.
- `usdClassTransfer` (spot ↔ perps moves) done outside our app.
- Genesis events, rewards claims.

A `spotState` subscription covers **all** of these automatically, because
it's HL's server pushing the new spot balances whenever they change —
regardless of which client caused the change.

### 10.3 The actual architectural fix

Current flow (after #29217):

```
TradingService.placeOrder() → success
    → provider.refreshLiveAccountState()
        → infoClient.spotClearinghouseState(user)   [REST]
            → aggregate with perps → re-emit
```

Recommended flow (HL-native):

```
At connect time:
  subscriptionClient.spotState({ user, isPortfolioMargin? }, handler)

handler(spotState):
  merge spotState into #cachedAccount → notify subscribers

  (no REST, no TradingService coupling, fires on ALL spot changes)
```

Immediate gains:

- Covers all sources of spot change, not just our mutations.
- `refreshLiveAccountState()` interface method + `TradingService`
  callsites + empty `.catch`-logger all removed.
- Balance updates become truly real-time (pushed on each HL block where
  the user's spot state changes), matching HL web.
- Portfolio Margin-aware via the `isPortfolioMargin` flag — when HL
  graduates PM from alpha, we get the correct payload without changing
  our code.

### 10.4 `activeAssetData` is an even better option for order entry

`WsActiveAssetData` (per `subscriptions.md:268-274`) pushes per-user /
per-coin data including:

```typescript
interface WsActiveAssetData {
  user: string;
  coin: string;
  leverage: Leverage;
  maxTradeSzs: [number, number];
  availableToTrade: [number, number]; // ← server-computed, per side
}
```

This is **HL's own authoritative "available to trade" number**, already
adjusted for account-abstraction mode (Standard / Unified / PM) and for
the specific market. If we subscribe to `activeAssetData` while the user
is on an order-entry screen, we can display HL's own value and skip the
client-side `withdrawable + (spotTotal − spotHold)` formula entirely.

That would directly resolve the §6 concern about our formula being mode-
incorrect for Standard and Portfolio Margin accounts — HL computes it,
we just render it.

### 10.5 Is #29150's formula correct?

Our current math: `availableToTradeBalance = withdrawable + (spot.total − spot.hold)`.

| Account mode             | What HL docs say                                                                                       | Our formula                    | Verdict                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unified                  | Trust spot clearinghouse; individual perp-dex user state "not meaningful"                              | `withdrawable + (spot − hold)` | Correct _only_ when `withdrawable = 0`, which is the common Unified case. Any non-zero `withdrawable` on Unified double-counts. Bounded error in practice. |
| Standard                 | Per-DEX `withdrawable` matters; spot and perps are separate pools (requires manual `usdClassTransfer`) | `withdrawable + (spot − hold)` | **Over-reports** — user cannot actually combine pools to place a single order.                                                                             |
| Portfolio Margin (alpha) | LTV-weighted: `token_balance * borrow_oracle_price * ltv`                                              | `withdrawable + (spot − hold)` | Fundamentally wrong; ignores LTV, borrow caps, min_borrow_offset.                                                                                          |

So #29150 ships a **convenience approximation** that happens to be correct
on the specific account that triggered the incident, acceptable on other
Unified accounts, wrong on Standard, and wrong on PM. It closes the
incident by making order-entry _trust something instead of 0_ — but the
"something" is a derived number we computed, not HL's own number.

Replacing the formula with `activeAssetData.availableToTrade` during
order entry would be correct in every mode, and fully reactive.

### 10.6 Recommendation (for discussion, not merge)

Short-term (unblock TAT-3016 users — already shipping):

- #29110 stays (it's the correct `totalBalance` fold and is already in
  OTA 7.72.2).
- #29150 as-is is acceptable as a **temporary** shim to unblock order
  entry. The formula is mode-incorrect (§10.5) but close enough for
  the incident cohort.

Medium-term (the architectural fix — should replace #29217):

- Add `spotState` to the WebSocket subscriptions already set up in
  `HyperLiquidSubscriptionService`. Wire its handler to merge the pushed
  `balances` into `#cachedAccount` and notify subscribers exactly like
  the existing `webData2/3` path does for perps.
- Delete `refreshLiveAccountState()` from the `PerpsProvider` interface,
  from `HyperLiquidProvider`, from `AggregatedPerpsProvider`, and from
  every `TradingService` callsite. The fire-and-forget refresh goes away.
- Close #29217 or reshape it into "subscribe to spotState" — the current
  diff is the wrong solution to a real problem.

Long-term (kill the derived formula too):

- Subscribe to `activeAssetData` on order-entry screens.
- Render HL's own `availableToTrade` directly; fall back to our derived
  field only for providers that don't expose one (MYX).
- Portfolio Margin buying-power comes from HL, not us.

None of this is a code change for this session — it's the shape of the
follow-up tickets we should file instead of merging #29217 as-is.

## 11. Glossary

- **`withdrawable`** — Field on `clearinghouseState`. Amount freely
  withdrawable from the perps clearinghouse _right now_. On Unified mode
  with spot-only collateral this is `0` by construction.
- **`spot.total`** — Field on `spotClearinghouseState.balances[coin]`.
  User's total holding of that spot coin.
- **`spot.hold`** — Portion of `spot.total` locked as margin for open
  positions and open orders.
- **`availableBalance`** — Our `AccountState` field. Currently =
  `withdrawable` (HL's withdrawable). Used by the withdraw path.
- **`availableToTradeBalance`** — New field introduced by #29150. =
  `withdrawable + (spot.total − spot.hold)`. Used by order entry.
- **`totalBalance`** — Our `AccountState` field. Since #29110 this =
  `withdrawable + spot.total (USDC + USDH only)`.
- **Account abstraction modes** — Standard / Unified / Portfolio Margin /
  DEX abstraction (the last being deprecated). See
  `docs/perps/hyperliquid/account-abstraction-modes.md`.
- **OTA** — Over-the-air release branch (here: `cp-7.72.2`, shipped to
  users as 7.72.2).
