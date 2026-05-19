# Predict Staleness Filter Plan

## Goal

Prevent stale or effectively settled prediction markets from occupying Predict discovery surfaces while keeping pagination and data fetching behavior unchanged.

This plan covers:

- Trending tab and other Predict feed tabs
- TrendingView prediction sections
- Homepage prediction sections
- Featured carousel
- Predict search results
- Dedicated World Cup feed hook

Market details pages remain fetchable by ID so deep links, existing positions, and history flows continue to work.

## Agreed Rules

### Probability Thresholds

Use a shared inclusive threshold:

- Dead high probability: `probability >= 0.95`
- Dead low probability: `probability <= 0.05`

Canonical probability is `outcome.tokens[0].price`, because that is the probability already used by current feed cards, search rows, and homepage cards.

### Outcome Filtering

- Filter the full `market.outcomes` list before any card-specific display limit is applied.
- Preserve the original order of surviving outcomes.
- Invalid or missing `tokens[0].price` makes that outcome non-displayable.
- If no displayable outcomes remain, hide the market.
- Keep `market.outcomeGroups` synchronized with the filtered `outcomes`, including nested groups.

### Formal Status

Visible discovery markets require `market.status === 'open'`.

This applies even to highlighted markets. Closed or resolved markets should not appear in discovery surfaces.

### Time Expiry

Hard-hide:

- Markets with `market.game?.status === 'ended'`
- Daily markets where `market.recurrence === Recurrence.DAILY` and `endDate <= now`

Apply a ranking penalty, not a hide:

- For daily/game markets where `0 < hoursUntilEnd <= 1`, apply `0.5x`

Do not broadly hide all non-daily markets with past `endDate`; status and probability layers cover those more safely.

### Ranking Penalty

There is no dedicated client ranking score today, so use current API order as the base rank.

Implementation rule:

- `baseScore = markets.length - index`
- `score = baseScore * probabilityPenalty * timePenalty`
- Sort descending by score.
- Preserve original API order for ties.

Probability penalty:

- No penalty when max visible probability is below `0.95`.
- For max visible probability above `0.95`, decay linearly and clamp to `0.1x`.

### Highlighted Markets

Highlighted markets are curated exceptions.

- Add optional metadata to `PredictMarket`, for example `isHighlighted?: boolean`.
- Mark markets fetched from `PredictController.getMarkets` highlight config.
- Highlighted markets bypass probability filtering, time filtering, and ranking penalties.
- Highlighted markets still require `market.status === 'open'`.
- Highlighted markets remain pinned first, preserving configured highlight order.
- Non-highlighted markets are filtered and ranked behind highlighted markets.
- Search does not add highlight behavior. If `isHighlighted` is present generically, the shared utility can honor it, but search should not fetch or mark highlights.

### Pagination

Do not backfill.

Filtering happens after the intended page has been fetched. Do not fetch additional pages to replace filtered markets, and do not alter cursors, page size, or `hasMore` behavior.

### Analytics

Do not add new analytics or telemetry in the first implementation.

Existing rendered item counts and section visibility behavior will naturally reflect the cleaned feed.

### Feature Flags

Do not add a new feature flag.

The filter is always-on discovery hygiene, with behavior controlled by isolated utilities and tests.

## Integration Points

### Shared Utility

Create a pure, isolated module under:

`app/components/UI/Predict/utils/marketStaleness.ts`

Suggested public API:

- `isPredictOutcomeDead(outcome)`
- `filterVisibleMarketOutcomes(market, options?)`
- `getVisiblePredictMarket(market, options?)`
- `getVisiblePredictMarkets(markets, options?)`
- `rankPredictMarketsByStaleness(markets, options?)`

The utility should accept `now` as an injectable option for deterministic tests.

### Feed Hooks

Apply the utility at hook/view-model boundaries:

- `app/components/UI/Predict/hooks/usePredictMarketData.tsx`
- `app/components/UI/Predict/hooks/usePredictSearchMarketData.tsx`
- `app/components/UI/Predict/hooks/useFeaturedCarouselData.ts`
- `app/components/UI/Predict/hooks/usePredictWorldCup.ts`

Keep existing fetch calls and pagination state unchanged.

### Highlight Metadata

Update:

- `app/components/UI/Predict/types/index.ts`
- `app/components/UI/Predict/controllers/PredictController.ts`

When `getMarkets` fetches highlighted markets, annotate those fetched markets with `isHighlighted: true` after the existing open-status filter.

### Card Cleanup

Replace or remove ad hoc card-level filtering in:

- `app/components/UI/Predict/components/PredictMarketMultiple/PredictMarketMultiple.tsx`

The current exact `0` or `1` filter should not be the primary stale-market guard after hook-level filtering is added.

## Commit Plan

### Commit 1: `test(predict): cover market staleness policy`

Add focused tests for the pure staleness policy.

Test cases:

- `0.95` and above is dead.
- `0.05` and below is dead.
- Values between thresholds remain live.
- Invalid or missing probabilities are non-displayable.
- A market with all dead outcomes is hidden.
- A market with some dead outcomes keeps only live outcomes.
- Outcome order is preserved.
- Nested `outcomeGroups` stay synchronized.
- `status !== open` hides the market.
- Ended games are hidden.
- Expired daily markets are hidden.
- Last-hour daily/game markets receive a `0.5x` time penalty.
- Probability and time penalties multiply.
- Ranking is stable for ties.
- Highlighted open markets bypass staleness and remain pinned first.
- Highlighted closed/resolved markets are hidden.

### Commit 2: `feat(predict): add isolated market staleness utilities`

Implement the pure utility module and export the agreed API.

Keep this commit free of hook/controller integration so the policy remains reviewable on its own.

### Commit 3: `feat(predict): preserve highlighted market metadata`

Add `isHighlighted?: boolean` to `PredictMarket`.

Update `PredictController.getMarkets` to annotate fetched highlighted markets after existing `status === 'open'` filtering and before merging them into the returned list.

Update controller tests to verify:

- Highlighted markets are annotated.
- Closed/resolved highlighted markets are still excluded.
- Highlighted ordering remains configured order.
- Regular market order remains unchanged before hook-level ranking.

### Commit 4: `feat(predict): filter stale markets in feed hooks`

Apply `getVisiblePredictMarkets` at hook/view-model boundaries:

- `usePredictMarketData`
- `usePredictSearchMarketData`
- `useFeaturedCarouselData`

Behavior:

- No fetch changes.
- No cursor changes.
- No backfill.
- Highlighted markets remain first.
- Non-highlighted markets are filtered and ranked.

### Commit 5: `feat(predict): filter stale markets in World Cup feed`

Apply the same shared utility in `usePredictWorldCupMarkets`.

Keep this separate because World Cup bypasses `usePredictMarketData` and has its own query path.

### Commit 6: `test(predict): cover staleness integration points`

Update hook and controller tests.

Suggested targets:

- `app/components/UI/Predict/hooks/usePredictMarketData.test.tsx`
- `app/components/UI/Predict/hooks/usePredictSearchMarketData.test.tsx`
- `app/components/UI/Predict/hooks/useFeaturedCarouselData.test.ts`
- `app/components/UI/Predict/hooks/usePredictWorldCup.test.ts`
- `app/components/UI/Predict/controllers/PredictController.test.ts`

Test integration behavior:

- Stale markets disappear from hook results.
- Partially stale markets keep live outcomes.
- Search results are filtered.
- Carousel data is filtered.
- World Cup hook output is filtered.
- Highlighted markets bypass staleness but not formal status.
- Pagination metadata is untouched.

### Commit 7: `refactor(predict): remove ad hoc resolved outcome filtering`

Clean up card-level stale filtering that only checks exact `0` or `1`.

If a local guard still makes sense defensively, switch it to the shared helper rather than keeping separate threshold logic.

## Verification Commands

Run targeted tests first:

```bash
yarn jest app/components/UI/Predict/utils/marketStaleness.test.ts
yarn jest app/components/UI/Predict/hooks/usePredictMarketData.test.tsx
yarn jest app/components/UI/Predict/hooks/usePredictSearchMarketData.test.tsx
yarn jest app/components/UI/Predict/hooks/useFeaturedCarouselData.test.ts
yarn jest app/components/UI/Predict/hooks/usePredictWorldCup.test.ts
yarn jest app/components/UI/Predict/controllers/PredictController.test.ts
```

Then run broader Predict checks if the targeted set is stable:

```bash
yarn jest app/components/UI/Predict
```

## Non-Goals For First Pass

- No server-side API changes.
- No Polymarket request query changes.
- No auto-backfill.
- No new analytics.
- No new feature flag.
- No blocking or filtering of market details pages.
- No broad date expiry for all market types.
