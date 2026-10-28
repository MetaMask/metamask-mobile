# EventMarketList

[PRED-1417](https://consensyssoftware.atlassian.net/browse/PRED-1417) delivers this complete composition in isolation. [PRED-1418](https://consensyssoftware.atlassian.net/browse/PRED-1418) owns mounting it in `PredictEventScreen` and removing the superseded screen-owned list logic. This is an Event Screen-local API, not a PredictNext external export.

## Interface

Import `EventMarketList` and `EventMarketListProps` through this directory's `index.ts`.

- `event: PredictEvent`: the complete, current canonical Event, including live-projected Markets. Do not prefilter winner Markets or alternate lines.
- `onOrder(market, outcome)`: the displayed canonical Market and Outcome, including the current quote and selected alternate. The screen/workflow owns buy intent, readiness, navigation, Preview, and Commit.
- `onRulesPress(market)`: the displayed canonical Market. The screen owns the rules sheet and resolves its current data by Market identity.
- `onCashOut(position)`: the selected canonical Position unchanged. The existing screen/workflow resolves its Market/Outcome and sell limits; the list does not quote, round shares, or submit an Order.
- `children?`: static header composition above the tab row, inside the same vertical list. It may contain independently interactive screen-owned header/chart controls; it does not supply tabs or panel state.
- `testID?`: overrides the list root test ID.

```tsx
import { EventMarketList } from './internal/EventMarketList';

<EventMarketList
  event={liveEvent}
  onOrder={handleMarketOrder}
  onRulesPress={handleMarketRulesPress}
  onCashOut={handlePositionCashOut}
>
  {eventHeader}
</EventMarketList>;
```

## Owned behavior

- All Event Markets are projected through the existing grouping/cards into one tab. Its label is **Game Lines** only when `getEventGame(event)` returns a Game snapshot, matching `PredictEventCard`; otherwise it is **Outcome**, including Sports context without a Game. Winner/Moneyline Markets use `MarketStandardCard`. There are no Player Props or Team Props tabs.
- Nonempty available Event holdings add **Positions** before the Market tab. Initial/invalid selection uses the first available tab. Late holdings, prices, labels, and count changes preserve a valid selected identity. Removing Positions immediately falls back to Markets; changing Venue/Event identity resets panel and alternate selection.
- Content-tab selection and Market-group alternate selection are independent. Only the selected panel supplies rows to one `MarketList`/`FlatList`; Positions are individual virtualized rows. Do not wrap this component in another vertical scrollable or retain an eager Positions header map.
- `useEventPositions` owns the existing venue-wide `usePositions(event.venueId, { limit: PORTFOLIO_PAGE_LIMIT })` read. Its query key, cache, service invalidation, and retry ownership are unchanged. Filtering matches Venue and **every** canonical Event Market ID, including composed siblings; it does not use `position.context.eventId`. First-occurrence Venue/Market/side deduplication supplies availability, badge, and rows together.
- Discovery is serial, stops after five total pages of 20 or the first failed next page, and does not cancel an in-flight shared refresh. Already-cached pages beyond five are still consumed. Missing/failed/incomplete discovery never blocks Markets; cached holdings remain usable on refresh failure. Known offline transport disables initial and imperative next-page work; unknown transport is not offline.
- The numeric badge counts **available deduplicated holdings**, including after failure or the cap; it is not a guaranteed complete Event total. Zero holdings remove Positions. At the badge helper seam, omitted count has no badge, explicit zero displays `0`, and more than 99 displays `99+`.
- Privacy comes from `selectPrivacyMode` inside the list; `EventPositionRow` retains the existing shares/SensitiveText/Cash Out presentation. The old `EventPositionsSection` reuses that row without changing its current screen behavior.
- Reuse the existing shared `TabsBar` as-is, including its selection, underline, scrolling, accessibility, and animation behavior. The Positions badge uses its existing `endAccessory` prop. No custom tab component or shared Tabs implementation, type, or test change is included.
- LOW hardware with a known transport uses FlatList limits `6 / 6 / 5` (initial rows / batch / window). Other cohorts, including unknown network, use `10 / 10 / 21`. These limits never truncate the semantic row set; known offline transport disables fetching. The shared `TabsBar` does not expose a motion override. No Event/history/live subscription, polling, prefetch, or financial write is added.

## PRED-1418 integration handoff

PRED-1418's Jira description predates this interface. Reconcile its caller-built tabs, Sports-context classification, completeness-gated badge, and prop-tab wording against the engineer-approved behavior above before integration. Do not recreate an `EventTabBar`, `EventTabList`, or `EventTabbedContent` owner.

When mounting the list:

1. Pass the existing `liveEvent` and existing Order, Market rules, and Position Cash Out handlers. Preserve Event identity; do not pass a winner-filtered Event.
2. Keep Event querying/live projection, chart/history/timeframe state, winner quotes, fixed footer, rules sheet, navigation, loading/error/retry, Order workflow, and screen measurement with their current owners. Panel presses must not change chart selection or create per-panel subscriptions.
3. Put the screen-owned header/chart composition in `children`, above the tabs in this list's scrolling surface. Keep screen chrome/fixed footer and the rules sheet outside. Confirm the final header/chart/footer arrangement against Figma; displaying winner Markets here is not authorization to remove or redesign chart/footer controls.
4. Remove the screen's `positionsQuery`, `heldPositions` filtering, automatic Positions page-walk effect and its page constants, privacy plumbing used only by the old section, and the `EventPositionsSection` header mount. Keeping those beside this component creates duplicate query/discovery owners.
5. Replace the old `MarketList` mount and screen-owned row renderer, content alternate-selection map/handler, and list-only style/key helpers. Audit `marketProjection`, `firstProjectedMarket`, `historyMarket`, and measurement dependencies before deleting them: chart fallback and trace meaning must remain explicit, not accidentally change with list ownership.
6. Preserve the existing component-view screen journeys and add integration-specific coverage for both Game and standard compositions. Reuse the shared PredictNext fixtures/renderer; keep isolated discovery/panel contracts with this component rather than copying them into a second screen harness.

No backend/mobile contract, dependency, external Predict API, legacy Polymarket behavior, or PRED-1421 work is included.

## Verification and isolated stories

`EventMarketList.view.test.tsx` owns real-query async/cache/offline/pagination/panel/privacy/action journeys through the shared component-view framework. Focused hook/helper tests cover canonical-object, deduplication, reference-stability, badge, and device-policy contracts. Shared Tabs and Market-card/projection tests retain their existing contracts and remain unchanged.

The `PredictNext / EventMarketList` Storybook group includes standard and Game Events, empty/cached/delayed Positions, count changes, a 320-point viewport, and 120 Markets/holdings across six cached pages. Stories use parser-validated synthetic data, the real Positions hook, and an isolated messenger-backed query client. Actions only update explanatory text; **Load Positions** resolves the delayed read; count controls update the shared-query shape. Unmount resolves pending story data and clears the isolated cache. Set actual system text scaling and both themes rather than treating the narrow story as a large-text simulation.

Run with `yarn storybook`, then `yarn start:ios` or `yarn start:android`; regenerate registration with `yarn storybook-generate` after moving/adding stories. See the repository [Storybook guide](../../../../../../../../docs/readme/storybook.md).

### Native/design verification still required

Figma remains the visual source: [Kalshi x Predict, frame 166-6886](https://www.figma.com/design/qAufXbVW0zwasY3JfO5teW/Kalshi-x-Predict?node-id=166-6886&m=dev). Exact spacing, badge placement, single-tab treatment, final screen placement, real horizontal/vertical scrolling, largest supported text, both themes, VoiceOver, and TalkBack have **not** been verified on-device. Jest and story registration are not evidence for these checks.

On Android, record the build/device, hardware/network matrix cell, actual Market/holding counts, baseline and changed panel-switch/scroll latency, FPS/render evidence, and memory after repeated switches using the large cached story. Include the power-user wallet context (approximately 30 accounts/90 assets) where available. No performance improvement or native accessibility result is claimed without those measurements.
