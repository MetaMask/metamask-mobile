# Predict RC Manual Regression Checklist

> **Work in progress (WIP)** — Draft checklist for **manual** RC testing only. Agent
> automation is not set up yet. Task folder (checklist + README):
> `MetaMask/experimental-mm-qa-ai-tasks` → `tasks/predict-rc/`. No `prompt.md`,
> runbook, or mobile MCP exists for Predict RC at this time.

Run this checklist on every release candidate that includes the Predict (Polymarket)
experience. It covers in-app Predict surfaces, the full trade lifecycle (browse,
open, cash out, claim, deposit, withdraw), homepage and Explore integration,
feature gates, geo-blocking, and edge cases that are not fully protected by
automated E2E tests.

This checklist does not replace change-specific exploratory testing. If an RC
contains a Predict-specific change, add targeted cases for that change before
sign-off.

## Priority Labels

- `[Critical]` means the case belongs in the primary RC smoke run. The critical
  set is designed to fit in roughly 60–90 minutes when run with a funded Predict
  account on Polygon, an eligible region, and reused navigation knowledge.
- `[Non-critical]` means the case remains part of full RC regression,
  targeted-risk testing, or feature-flag-specific follow-up.
- In optional or environment-dependent sections, such as World Cup, crypto
  up/down, buy-with-any-token, PredictThePitch Rewards, and Deposit Wallet
  withdraw, treat `[Critical]` as conditional only when that surface is enabled
  or targeted by the RC.
- Standalone visibility checks are intentionally excluded. A case should verify
  user value, data correctness, state isolation, mutation, recovery, or a blocked
  unsafe action.

## Critical RC Smoke Run Order

Target runtime: 60–90 minutes on iOS or Android with a real or staging-backed
Predict account.

Recommended setup:

- Use an RC build with `predictTradingEnabled` enabled for the app version under
  test.
- Confirm remote feature flags match the RC matrix (especially
  `predictHomeRedesign`, `predictWithAnyToken`, `predictBottomSheet`, and
  `predictWorldCup`).
- Use an eligible account in an allowed region (not DE or RO; smoke E2E uses
  Portugal coordinates when geo must be forced eligible).
- Seed or use an account with:
  - Predict balance (pUSD) and Polygon network configured.
  - At least one open position.
  - At least one redeemable winning position (for claim flows).
  - At least one lost resolved position (claim button should not appear).
  - Deposit and withdrawal history in Activity → Predictions.
- Keep Basic Functionality enabled except for the explicit Basic Functionality
  regression case.
- Capture screenshots after Predict home/feed, market details, buy confirmation,
  cash out, claim, deposit, withdraw, and final wallet state.

Suggested order:

1. Entry, navigation, account switch, and lock/unlock: 8–10 minutes.
2. Feed browse and market details: 10–12 minutes.
3. Open position and balance update: 10–12 minutes.
4. Cash out and activity verification: 8–10 minutes.
5. Claim winnings (homepage and market details): 8–10 minutes.
6. Deposit and withdraw: 10–12 minutes.
7. Geo-blocking spot check, offline/retry, and layout sanity: 6–8 minutes.

Extract the critical smoke list:

```bash
rg -n "^- \\[ \\] \\[Critical\\] PREDICT-RC-" docs/predict/predict-rc-regression.md
```

Existing Detox smoke coverage (run before manual RC when possible):

```bash
yarn test:e2e:ios:debug:run tests/smoke/predict/
# or Android equivalent
```

## Prerequisites

- RC build with Predict enabled via remote flag `predictTradingEnabled` (version
  gate ≥ 7.60.0).
- Wallet on **Polygon mainnet** with bridged USDC/USDC.e decimals configured when
  testing withdraw encoding edge cases.
- Predict collateral is **pUSD** on Polygon; legacy Safe vs Deposit Wallet
  account types behave differently on withdraw.
- Use accounts covering:
  - Zero Predict balance (empty states, add funds paths).
  - Funded Predict balance with open positions.
  - Claimable winning positions and non-claimable lost positions.
  - Activity history including predicted, cashed out, and claimed entries.
- Use markets covering:
  - Binary yes/no (politics or trending).
  - Sports game market with scoreboard (live or scheduled).
  - Multi-outcome market (Outcomes tab present).
  - Crypto up/down market when `predictUpDown` is enabled.
- Use a geo-blocked region or mocked ineligible state for compliance cases (DE,
  RO, or provider-blocked country).
- Watch device logs and network during testing. No case should leave endless
  spinners, stuck pending transactions, uncaught exceptions, or stale balances
  after foreground refresh.

## Feature Gates, Navigation, and Session State

- [ ] [Non-critical] PREDICT-RC-001: With Predict disabled by remote flag or
      version gate, the Trade actions Predict entry, homepage Predictions
      section, and direct Predict routes are hidden or safely unreachable.
- [ ] [Critical] PREDICT-RC-002: With Basic Functionality off, Predict blocks
      data loading for trade actions and routes the user to Privacy settings
      when they choose to fix the setting.
- [ ] [Critical] PREDICT-RC-003: Lock and unlock the app from a Predict route.
      The app returns without stale data, crashes, or broken navigation.
- [ ] [Critical] PREDICT-RC-004: Switch between accounts with different Predict
      states. Balances, positions, claim CTAs, and activity refresh for the
      selected account only.
- [ ] [Non-critical] PREDICT-RC-005: Background the app for at least 30 seconds
      on a Predict screen and return. Balances and positions refresh without
      duplicate toasts or stuck loading.
- [ ] [Critical] PREDICT-RC-006: Use hardware back and in-app back from Predict
      market list, generic feed, market details, buy preview, sell preview,
      positions, and activity detail. Each path lands on the expected prior
      route.
- [ ] [Non-critical] PREDICT-RC-007: Open supported Predict deep links while
      unlocked:
      `https://link.metamask.io/predict`,
      `https://link.metamask.io/predict?market=<id>`,
      `https://link.metamask.io/predict?tab=crypto`,
      `https://link.metamask.io/predict?q=bitcoin`,
      `https://link.metamask.io/predict?feed=world-cup&tab=live`,
      `https://link.metamask.io/predict?feed=sports&tab=basketball&filter=live`
      (generic feed links require `predictHomeRedesign`).
- [ ] [Non-critical] PREDICT-RC-008: Open a Predict deep link while locked.
      After unlock, the user lands on the intended Predict route or a safe
      fallback to market list.
- [ ] [Non-critical] PREDICT-RC-009: Open a Predict deep link with an invalid
      market id, unknown feed, or invalid tab. The app falls back safely without
      a blank screen.
- [ ] [Non-critical] PREDICT-RC-010: Open a Predict deep link with
      `utm_source=campaign`. Analytics entry point reflects the appended source
      (for example `deeplink_campaign`).
- [ ] [Critical] PREDICT-RC-011: Enter Predict from Trade actions (+) → Predict.
      Market list or redesigned home loads with balance card and feed content.
- [ ] [Non-critical] PREDICT-RC-012: Enter Predict from homepage Predictions
      section "View all" and verify the same account balance and positions context
      carries into the in-feature view.

## Homepage and Wallet Integration

- [ ] [Critical] PREDICT-RC-013: Homepage Predictions section shows available
      balance, open positions, and claim CTA when claimable winnings exist.
- [ ] [Critical] PREDICT-RC-014: Tapping an open position on the homepage opens
      the correct market details screen for that position.
- [ ] [Critical] PREDICT-RC-015: Tapping available balance on the homepage opens
      Predict with the expected balance displayed.
- [ ] [Non-critical] PREDICT-RC-016: Homepage trending markets or featured
      carousel (when shown) navigates to the correct market details.
- [ ] [Non-critical] PREDICT-RC-017: Homepage World Cup discovery rows (bracket,
      championship, NBA champion when enabled) navigate to World Cup or the
      intended market feed.
- [ ] [Non-critical] PREDICT-RC-018: Homepage empty Predict state shows the empty
      CTA and navigates into Predict without dead ends.
- [ ] [Critical] PREDICT-RC-019: Homepage batch claim CTA opens claim
      confirmation, completes successfully, removes resolved positions from the
      UI, and updates balance.
- [ ] [Non-critical] PREDICT-RC-020: After a successful claim from homepage, claimed
      positions appear under Activity → Predictions with correct amounts.

## Predict Home and Feed Discovery

Applies to legacy `PredictFeed` when `predictHomeRedesign` is off, and to
`PredictHome` + `PredictFeedView` when it is on.

- [ ] [Critical] PREDICT-RC-021: Predict entry shows available balance, add
      funds affordance, and withdraw when balance exists. Values match controller
      state after refresh.
- [ ] [Critical] PREDICT-RC-022: Trending feed loads market cards with title,
      prices, and navigable Yes/No or card tap targets without permanent
      skeletons.
- [ ] [Critical] PREDICT-RC-023: Switch across primary category tabs (trending,
      new, sports, crypto, politics; plus hot/world-cup when enabled). Each tab
      loads a distinct, scrollable market set.
- [ ] [Non-critical] PREDICT-RC-024: Ending-soon tab (legacy feed) shows markets
      ordered for near-term resolution and remains scrollable.
- [ ] [Non-critical] PREDICT-RC-025: Hot tab (when `predictHotTab` enabled)
      loads markets matching remote query params and remains navigable.
- [ ] [Non-critical] PREDICT-RC-026: Featured carousel or featured list variant
      (when enabled) navigates to market details and respects A/B variant
      assignment.
- [ ] [Non-critical] PREDICT-RC-027: Portfolio module on legacy feed (when
      `predictPortfolio` enabled) shows balance, PnL, claim/deposit/withdraw
      actions, and positions badge navigation.
- [ ] [Critical] PREDICT-RC-028: Redesigned home (`predictHomeRedesign`) shows
      portfolio summary, Live Now, Categories, Popular Today, and Trending
      sections with working navigation into feeds and market details.
- [ ] [Non-critical] PREDICT-RC-029: Category tiles on redesigned home open the
      correct generic feed (`sports`, `politics`, `crypto`, `live`,
      `trending`, `popular-today`).
- [ ] [Critical] PREDICT-RC-030: Generic feed view sports sub-tabs (basketball,
      tennis, soccer, baseball, football) and All/Live filter chips return
      expected market sets when redesign is enabled.
- [ ] [Non-critical] PREDICT-RC-031: Politics and crypto generic feeds load with
      dynamic related-tag filters and remain searchable.
- [ ] [Non-critical] PREDICT-RC-032: Live generic feed shows live-tagged markets
      and respects live filter semantics.
- [ ] [Non-critical] PREDICT-RC-033: Pull-to-refresh or explicit retry on feed
      error reloads markets without duplicate cards or stale prices.
- [ ] [Non-critical] PREDICT-RC-034: Infinite scroll loads additional pages until
      end-of-list without jank or duplicated items.
- [ ] [Non-critical] PREDICT-RC-035: Tapping Yes/No directly from a feed card
      opens buy flow for the selected outcome without wrong-market binding.

## World Cup

Run when `predictWorldCup` remote config enables banner, tab, or dedicated
screen.

- [ ] [Critical] PREDICT-RC-036: World Cup main-feed banner (when enabled) opens
      the World Cup screen or configured destination.
- [ ] [Critical] PREDICT-RC-037: World Cup dedicated screen loads stage tabs
      (all, live, props, configured stages) and market cards for the active tab.
- [ ] [Non-critical] PREDICT-RC-038: World Cup deeplink
      `?feed=world-cup&tab=live` opens the correct initial tab when the screen
      is enabled; falls back to market list when disabled.
- [ ] [Non-critical] PREDICT-RC-039: Explore/Trending World Cup feed navigates to
      the World Cup screen with expected entry point.
- [ ] [Non-critical] PREDICT-RC-040: World Cup offline/error state shows retry
      and recovers when connectivity returns.

## Market Details

- [ ] [Critical] PREDICT-RC-041: Opening a binary market from the feed lands on
      market details with correct title, price chart, volume, and About tab
      content.
- [ ] [Critical] PREDICT-RC-042: Positions tab lists only positions for the
      current market and account, with correct side, size, and cash-out actions
      for open positions.
- [ ] [Non-critical] PREDICT-RC-043: Outcomes tab appears on multi-outcome
      markets and lists all outcomes with correct prices and selection behavior.
- [ ] [Critical] PREDICT-RC-044: Sports/game market details show scoreboard,
      team logos, game status (scheduled, live, final), and game bet Yes/No
      actions when applicable.
- [ ] [Non-critical] PREDICT-RC-045: Live sports scoreboard updates during an in-
      progress game when `predictLiveSports` leagues include the market's league.
- [ ] [Non-critical] PREDICT-RC-046: Crypto up/down market details (when
      `predictUpDown` enabled) show target price, time slot selector, chart, and
      buy actions for Up/Down outcomes.
- [ ] [Non-critical] PREDICT-RC-047: Switching chart timeframe on market details
      updates the chart and persists when navigating away and back.
- [ ] [Non-critical] PREDICT-RC-048: Share on market details opens the native
      share sheet and does not crash on cancel or success.
- [ ] [Non-critical] PREDICT-RC-049: Resolved market details hide inappropriate
      trade actions and show claim or final-state copy correctly.
- [ ] [Critical] PREDICT-RC-050: Market details for an open position opened from
      homepage or positions list matches the tapped position's market and shows
      cash-out for that position only.

## Open Position (Buy Flow)

Covers legacy `PredictBuyPreview`, bottom sheet mode, and `PredictBuyWithAnyToken`.

- [ ] [Critical] PREDICT-RC-051: From market details, start a buy on Yes (or
      chosen outcome). Betslip shows market, outcome, share price, fee summary,
      and amount entry.
- [ ] [Critical] PREDICT-RC-052: Enter a valid USD amount with keypad, confirm,
      and place bet using Predict balance. Success returns to market details or
      feed with updated balance and new open position.
- [ ] [Critical] PREDICT-RC-053: Open position from feed Yes/No shortcut follows
      the same buy path and records the position under Activity → Predictions.
- [ ] [Non-critical] PREDICT-RC-054: Amount validation blocks empty, zero,
      below-minimum, and over-balance amounts without submitting.
- [ ] [Non-critical] PREDICT-RC-055: Dismiss buy preview via back, swipe, or
      hardware back without placing an order. No phantom pending state remains.
- [ ] [Non-critical] PREDICT-RC-056: With `predictBottomSheet` enabled, buy flow
      opens as overlay sheet instead of full-screen route and completes
      successfully.
- [ ] [Non-critical] PREDICT-RC-057: With `predictWithAnyToken` enabled, buy flow
      supports pay-with-external-token path: token picker, fee summary, swap
      initiated state, deposit-and-order chaining, and success toast/state.
- [ ] [Non-critical] PREDICT-RC-058: Insufficient pay-token balance in any-token
      flow blocks submission with clear validation.
- [ ] [Non-critical] PREDICT-RC-059: Partial fill / FAK behavior (when
      `predictFakOrders` enabled) shows retry sheet and allows successful retry
      without duplicate positions.
- [ ] [Non-critical] PREDICT-RC-060: Fee collection flag displays MetaMask and
      provider fees in summary when enabled; waived markets respect waiveList.
- [ ] [Critical] PREDICT-RC-061: Rapidly tapping place bet does not create
      duplicate orders or duplicate on-chain transactions.

## Cash Out (Sell Flow)

- [ ] [Critical] PREDICT-RC-062: From market details on an open sports position,
      tap cash out. Sell preview shows position, proceeds estimate, and confirm
      action.
- [ ] [Critical] PREDICT-RC-063: Confirm cash out successfully. Position
      disappears or updates, balance increases, and Activity → Predictions shows
      "Cashed out" with correct value.
- [ ] [Non-critical] PREDICT-RC-064: Cash out from positions/portfolio list (not
      only market details) completes with the same balance and activity updates.
- [ ] [Non-critical] PREDICT-RC-065: With `predictBottomSheet` enabled, cash out
      uses overlay sell preview and completes successfully.
- [ ] [Non-critical] PREDICT-RC-066: Cash-out failure or provider error shows an
      actionable error and preserves the open position.
- [ ] [Critical] PREDICT-RC-067: After cash out, returning to homepage Predictions
      section reflects updated balance without requiring app restart.

## Claim Winnings

- [ ] [Critical] PREDICT-RC-068: With claimable winnings, homepage or portfolio
      claim CTA shows correct claimable amount and opens claim confirmation.
- [ ] [Critical] PREDICT-RC-069: Confirm batch claim successfully. Balance
      updates, resolved won and lost positions are removed from UI, and claim
      button disappears when nothing remains claimable.
- [ ] [Critical] PREDICT-RC-070: Claim from winning market details opens claim
      confirmation for that market's winnings and completes without showing claim
      on non-claimable open or lost positions.
- [ ] [Non-critical] PREDICT-RC-071: Lost resolved position market details do not
      show claim winnings action.
- [ ] [Non-critical] PREDICT-RC-072: Reject or cancel claim confirmation. User
      returns without stuck pending claim state.
- [ ] [Non-critical] PREDICT-RC-073: Claim failure shows error toast and preserves
      prior claimable state.
- [ ] [Critical] PREDICT-RC-074: Claimed positions appear in Activity →
      Predictions with correct titles and USD amounts.

## Deposit (Add Funds)

- [ ] [Critical] PREDICT-RC-075: Tap Add funds from Predict balance card. Deposit
      confirmation opens with USD amount entry and Predict deposit context.
- [ ] [Critical] PREDICT-RC-076: Confirm a valid deposit. Pending and success
      states display, Predict balance updates, and activity records the deposit.
- [ ] [Non-critical] PREDICT-RC-077: Add funds sheet (non-auto-deposit path)
      explains deposit and opens confirmation when user continues.
- [ ] [Non-critical] PREDICT-RC-078: Deposit amount validation blocks empty,
      zero, below-minimum ($0.01), over-wallet-balance, and insufficient-gas
      cases.
- [ ] [Non-critical] PREDICT-RC-079: Reject or cancel deposit confirmation. User
      returns to Predict without stuck pending deposit state.
- [ ] [Non-critical] PREDICT-RC-080: Failed deposit shows error and leaves balance
      unchanged after refresh.
- [ ] [Non-critical] PREDICT-RC-081: Auto-deposit path from buy-with-any-token
      skips redundant add-funds sheet when configured and chains into deposit
      confirmation correctly.

## Withdraw

- [ ] [Critical] PREDICT-RC-082: Tap Withdraw from Predict balance. Withdraw
      confirmation opens with available balance, fee estimate, and amount entry.
- [ ] [Critical] PREDICT-RC-083: Confirm a valid withdrawal (legacy Safe path).
      User returns to Predict, balance decreases, and withdrawal is recorded.
- [ ] [Non-critical] PREDICT-RC-084: Amount validation blocks empty, zero,
      invalid, below-minimum, and over-balance withdrawals.
- [ ] [Non-critical] PREDICT-RC-085: 25%, 50%, 75%, and Max controls populate
      expected withdrawal amounts when present.
- [ ] [Non-critical] PREDICT-RC-086: Withdrawal on Deposit Wallet account shows
      withdraw-unavailable sheet instead of broken confirmation flow.
- [ ] [Non-critical] PREDICT-RC-087: Reject or cancel withdraw confirmation.
      User returns without stuck pending withdraw state.
- [ ] [Non-critical] PREDICT-RC-088: Withdrawal submission failure shows error,
      clears loading state, and allows retry.

## Portfolio and Positions

- [ ] [Critical] PREDICT-RC-089: Positions screen lists open positions with
      correct market title, outcome, value, and PnL indicators.
- [ ] [Non-critical] PREDICT-RC-090: Positions history tab lists past predicted,
      cashed out, and claimed activity consistent with Activity tab.
- [ ] [Non-critical] PREDICT-RC-091: Empty positions state offers paths to browse
      markets or add funds without dead ends.
- [ ] [Non-critical] PREDICT-RC-092: Portfolio module claim/deposit/withdraw
      actions match standalone balance card behavior.
- [ ] [Non-critical] PREDICT-RC-093: Privacy mode masks sensitive balance, PnL,
      and position values on portfolio and positions surfaces.

## Activity and History

- [ ] [Critical] PREDICT-RC-094: Wallet Activity → Predictions tab lists recent
      predict, cash out, and claim entries for the selected account.
- [ ] [Critical] PREDICT-RC-095: Tapping a predict activity row opens activity
      detail with correct market title, type, and amount.
- [ ] [Non-critical] PREDICT-RC-096: In-feature Predict activity/history view
      matches wallet Activity → Predictions after new trade, cash out, claim,
      deposit, and withdraw.
- [ ] [Non-critical] PREDICT-RC-097: Activity empty, loading, and error states
      recover when data becomes available again.

## Search and Explore

- [ ] [Critical] PREDICT-RC-098: Open search from Predict feed or home, enter a
      query, and tap a result. User lands on the correct market details.
- [ ] [Non-critical] PREDICT-RC-099: Clearing search restores the prior feed state
      without stale overlay.
- [ ] [Non-critical] PREDICT-RC-100: Search with no results stays recoverable and
      returns to browse after clearing the query.
- [ ] [Non-critical] PREDICT-RC-101: Search offline/error state shows retry and
      recovers when connectivity returns.
- [ ] [Non-critical] PREDICT-RC-102: Explore/Trending predictions carousel and
      category rows navigate to Predict list tab or World Cup with expected
      content.

## Geo-Blocking and Compliance Gating

Provider: Polymarket geoblock API plus local overrides for DE and RO.

- [ ] [Critical] PREDICT-RC-103: Ineligible user can browse Predict feeds and
      market details but blocked actions show unavailable modal for buy from
      feed, cash out, add funds, claim, and withdraw as applicable.
- [ ] [Critical] PREDICT-RC-104: Dismissing unavailable modal returns to prior
      safe view without stuck overlay.
- [ ] [Non-critical] PREDICT-RC-105: Unavailable modal exposes Polymarket Terms
      link and opens it correctly.
- [ ] [Non-critical] PREDICT-RC-106: PredictThePitch Rewards opt-in CTA reflects
      geo restriction when Predict is ineligible.
- [ ] [Non-critical] PREDICT-RC-107: Foreground refresh re-evaluates eligibility
      after region or VPN change without requiring app reinstall.

## Streaming, Refresh, and Resilience

- [ ] [Critical] PREDICT-RC-108: Initial feed and market details load without
      permanent skeletons when network is healthy.
- [ ] [Critical] PREDICT-RC-109: Market prices and sports scoreboards update on
      live markets without requiring manual refresh.
- [ ] [Non-critical] PREDICT-RC-110: Navigate away from Predict during a pending
      deposit, withdraw, or claim and return. Transaction toasts/status reconcile
      correctly (note: toast hooks mount in Predict tab view; verify cross-tab
      behavior).
- [ ] [Non-critical] PREDICT-RC-111: Feed offline state (`PredictOffline`) shows
      retry and reloads markets successfully.
- [ ] [Non-critical] PREDICT-RC-112: Switch EVM network away from Polygon while
      in Predict. Trade actions fail safely or prompt network correction without
      corrupting controller state.

## Onboarding and Education

- [ ] [Non-critical] PREDICT-RC-113: First-time user with `predictGtmOnboardingModalEnabled`
      sees GTM "What's new" modal once on wallet home load.
- [ ] [Non-critical] PREDICT-RC-114: Engage on GTM modal navigates to Predict;
      Not now dismisses and does not auto-reopen in the same session.
- [ ] [Non-critical] PREDICT-RC-115: GTM completion state persists across app
      restart for the same install.

## Rewards — PredictThePitch Campaign

Run when campaign is active in Rewards.

- [ ] [Non-critical] PREDICT-RC-116: Campaign details screen loads rules, prize
      pool, and opt-in state correctly.
- [ ] [Non-critical] PREDICT-RC-117: Opted-in active campaign "Predict Now" CTA
      navigates to World Cup screen with `entry_point=rewards`.
- [ ] [Non-critical] PREDICT-RC-118: Leaderboard, portfolio, stats, and winning
      views load campaign data without crashes.
- [ ] [Non-critical] PREDICT-RC-119: Winning outcome auto-navigation (when
      configured) lands on the expected Rewards or Predict surface.

## Account, Network, and Environment Boundaries

- [ ] [Critical] PREDICT-RC-120: Predict trade and fund flows require Polygon
      mainnet. Attempting actions on wrong network prompts correction or fails
      safely.
- [ ] [Non-critical] PREDICT-RC-121: Switch accounts during buy preview updates or
      blocks the form safely for the newly selected account.
- [ ] [Non-critical] PREDICT-RC-122: Per-account active order state in any-token
      flow does not leak between accounts after switch.

## Theme, Accessibility, and Presentation

- [ ] [Critical] PREDICT-RC-123: Predict surfaces render correctly in light and
      dark theme without illegible text or broken charts.
- [ ] [Non-critical] PREDICT-RC-124: Long market titles, large balances, negative
      PnL, and small share prices truncate or wrap without layout breakage on
      small phone sizes.
- [ ] [Non-critical] PREDICT-RC-125: VoiceOver/TalkBack reaches primary actions
      on market cards, betslip, claim, deposit, and withdraw confirmations.

## Analytics and Telemetry

Run when QA has access to MetaMetrics capture or E2E analytics expectations.

- [ ] [Non-critical] PREDICT-RC-126: `Predict Market Details Opened` fires with
      `entry_point` and `market_details_viewed` tab context.
- [ ] [Non-critical] PREDICT-RC-127: `Predict Feed Viewed` fires with feed tab,
      session timing, and entry point on feed exit or background.
- [ ] [Non-critical] PREDICT-RC-128: `Predict Trade Transaction` fires initiated →
      succeeded/failed for buy, sell, deposit, withdraw, and claim without
      sensitive key leakage.
- [ ] [Non-critical] PREDICT-RC-129: `Predict Geo Blocked Triggered` fires with
      `attempted_action` for blocked buy, cash out, deposit, claim, and withdraw.
- [ ] [Non-critical] PREDICT-RC-130: `Predict Search Interacted` fires for open,
      query, and result click when search is used.
- [ ] [Non-critical] PREDICT-RC-131: `Share Action` and `Predict Betslip Dismissed`
      fire on share and dismiss paths respectively.

## Known Automation Gap

Predict has Detox smoke coverage for open position, cash out, batch/market claim,
withdraw (legacy Safe), and geo-blocking on buy/cash out/add funds. Performance
specs cover deposit navigation, market details load, and balance display timing.

There are **no** predict specs under `tests/regression/`. Smoke tests explicitly
disable `predictBottomSheet` and `predictWithAnyToken`. Treat this RC checklist
as the primary end-to-end safety net for:

- Redesigned home and generic feeds
- World Cup and crypto up/down
- Buy-with-any-token and bottom-sheet betslip
- Search, Explore, GTM onboarding, and Rewards campaign flows
- Deposit Wallet withdraw-unavailable path
- Cross-tab transaction toasts and account-switch edge cases

## Open Questions for QA and Product

- Which RC matrix defines the default flag combo: legacy feed vs
  `predictHomeRedesign`, and should both layouts get a full pass each RC?
- Should buy-with-any-token and bottom-sheet modes be `[Critical]` once GA, given
  current smoke tests force them off?
- What is the source-of-truth account fixture for claimable winnings, lost
  positions, Deposit Wallet vs legacy Safe, and geo-blocked users?
- Should PredictThePitch Rewards campaign screens be in every Predict RC or only
  when a campaign is active?
- Should cross-tab transaction toasts (deposit/claim/withdraw completing while user
  is on Wallet or Activity) be release blockers?
- When is crypto up/down expected to be enabled in production RC builds?
