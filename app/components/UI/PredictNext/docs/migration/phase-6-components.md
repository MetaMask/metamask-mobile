# Phase 6: Components

## Goal

Build the reusable PredictNext component system with seven Tier 1 primitives and five Tier 2 widgets, using compound components and the MetaMask design system.

## Prerequisites

- Phase 1 complete.
- This phase can run in parallel with Phases 2-5.

## Deliverables

- Seven Tier 1 primitives in `app/components/UI/PredictNext/components/`
- Five Tier 2 widgets in `app/components/UI/PredictNext/widgets/`
- Component barrels and canonical prop types

## Step-by-Step Tasks

1. Build the Tier 1 primitive set under `app/components/UI/PredictNext/components/`.
   - Create these directories:
     - `EventCard/`
     - `OutcomeButton/`
     - `PositionCard/`
     - `PriceDisplay/`
     - `Scoreboard/`
     - `Chart/`
     - `Skeleton/`
   - Each primitive should use the compound component pattern where it improves readability, for example:
     - `EventCard.Root`
     - `EventCard.Header`
     - `EventCard.Markets`
     - `EventCard.Footer`

2. Use the design system as the base layer.
   - Prefer:
     - `Box`
     - `Text`
     - `ButtonBase`
     - `Icon`
     - `useTailwind`
   - Reuse `app/component-library` only when the design system lacks a needed building block, such as bottom sheets, tabs, or skeleton loaders.
   - Do not create new raw `View`/`Text` based abstractions.

3. Build `EventCard` from current feed/detail card variants.
   - Source old implementation ideas from:
     - `app/components/UI/Predict/components/PredictMarketSingle/`
     - `app/components/UI/Predict/components/PredictMarketMultiple/`
     - `app/components/UI/Predict/components/PredictMarketSportCard/`
     - `app/components/UI/Predict/components/PredictMarketRowItem/`
     - `app/components/UI/Predict/components/FeaturedCarousel/FeaturedCarouselCard.tsx`
     - `app/components/UI/Predict/components/FeaturedCarousel/FeaturedCarouselSportCard.tsx`
   - Normalize them around the new `PredictEvent` and `PredictMarket` props.

4. Build `OutcomeButton` and `PriceDisplay` as low-level trading primitives.
   - Source from:
     - `PredictMarketSingle`
     - `PredictMarketMultiple`
     - `PredictNewButton`
     - price display fragments embedded across buy and details screens.
   - Ensure state variants exist for selected, disabled, resolved, loading, and live-price update states.

5. Build `PositionCard`, `Scoreboard`, and `Chart` from the detail and portfolio surfaces.
   - Source from:
     - `app/components/UI/Predict/components/PredictPosition/`
     - `app/components/UI/Predict/components/PredictPositionResolved/`
     - `app/components/UI/Predict/components/PredictActivity/`
     - `app/components/UI/Predict/components/PredictGameDetailsContent/`
     - `app/components/UI/Predict/views/PredictMarketDetails/components/*`
   - `Scoreboard` should absorb sports/crypto result presentation without leaking old terminology.

6. Build the Tier 2 widgets under `app/components/UI/PredictNext/widgets/`.
   - Create:
     - `EventFeed/`
     - `FeaturedCarousel/`
     - `PortfolioSection/`
     - `OrderForm/`
     - `ActivityList/`
   - These widgets should compose Tier 1 primitives and the new hooks, but remain non-routed.

7. Rebuild the order entry widget carefully.
   - `OrderForm` should replace the view-specific buy flow composition currently spread across:
     - `app/components/UI/Predict/views/PredictBuyWithAnyToken/components/*`
     - `app/components/UI/Predict/components/PredictKeypad/`
     - `app/components/UI/Predict/components/PredictFeeBreakdownSheet/`
     - `app/components/UI/Predict/components/PredictAddFundsSheet/`
     - `app/components/UI/Predict/components/PredictOrderRetrySheet/`
   - Keep the widget reusable between buy and sell flows where feasible.

8. Build widgets without standalone unit tests.
   - Skip unit tests for these components.
   - Their verification path is the component view testing added in Phase 7.

9. Add barrels and package-local component exports.
   - Add `index.ts` files per component/widget directory.
   - Update `app/components/UI/PredictNext/index.ts` when exports are stable enough for external consumption.

## Files Created

| File path                                                  | Description                            | Estimated lines |
| ---------------------------------------------------------- | -------------------------------------- | --------------: |
| `app/components/UI/PredictNext/components/EventCard/*`     | Canonical event card primitive         |         120-220 |
| `app/components/UI/PredictNext/components/OutcomeButton/*` | Outcome selection primitive            |          80-140 |
| `app/components/UI/PredictNext/components/PositionCard/*`  | Position summary primitive             |         100-160 |
| `app/components/UI/PredictNext/components/PriceDisplay/*`  | Price and delta presentation primitive |          60-100 |
| `app/components/UI/PredictNext/components/Scoreboard/*`    | Sports/crypto scoreboard primitive     |         100-160 |
| `app/components/UI/PredictNext/components/Chart/*`         | Event chart primitive                  |          80-140 |
| `app/components/UI/PredictNext/components/Skeleton/*`      | Predict loading-state components       |          60-100 |
| `app/components/UI/PredictNext/widgets/EventFeed/*`        | Feed widget composed from EventCard    |         120-180 |
| `app/components/UI/PredictNext/widgets/FeaturedCarousel/*` | Featured event carousel widget         |         100-160 |
| `app/components/UI/PredictNext/widgets/PortfolioSection/*` | Portfolio widget                       |         120-180 |
| `app/components/UI/PredictNext/widgets/OrderForm/*`        | Buy/sell/deposit form widget           |         180-260 |
| `app/components/UI/PredictNext/widgets/ActivityList/*`     | Activity feed widget                   |         100-160 |

## Files Affected in Old Code

| File path                                                             | Expected change                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `app/components/UI/Predict/components/**/*`                           | None in this phase; old components remain reference implementations |
| `app/components/UI/Predict/views/PredictBuyWithAnyToken/components/*` | None in this phase                                                  |
| `app/components/UI/Predict/views/PredictMarketDetails/components/*`   | None in this phase                                                  |

## Acceptance Criteria

- Seven Tier 1 primitives and five Tier 2 widgets exist under `PredictNext/`.
- Components are built with design-system primitives and canonical `PredictNext` types.
- Old card variants and duplicated buy-flow UI fragments have identifiable replacements in the new component system.
- No routed screen has switched yet, but the UI building blocks are ready for Phase 7.

## Estimated PRs

- 5-7 PRs total.
  1. Feed primitives: `EventCard`, `OutcomeButton`, `PriceDisplay`.
  2. Portfolio primitives: `PositionCard`, `Skeleton`.
  3. Rich presentation primitives: `Scoreboard`, `Chart`.
  4. Feed widgets: `EventFeed`, `FeaturedCarousel`.
  5. Portfolio widgets: `PortfolioSection`, `ActivityList`.
  6. OrderForm widget.
  7. Optional export cleanup/alignment PR.
