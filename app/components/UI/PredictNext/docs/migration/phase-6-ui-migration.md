# Phase 6: UI Migration (Vertical Slices)

## Goal

Replace the old Predict UI one screen at a time. Each vertical slice includes new hooks, new components/widgets, and a new view for that screen. The data stack is already fully proven in production from Phases 2-5, so UI migration is purely a presentation concern.

## Prerequisites

- Phase 5 (New Controller) complete.
- Design system components (@metamask/design-system-react-native) and Tailwind preset are available.
- Component view test framework is ready in `tests/component-view/`.

## Deliverables

- New granular hooks in `app/components/UI/PredictNext/hooks/`.
- New primitive components in `app/components/UI/PredictNext/components/`.
- New widgets in `app/components/UI/PredictNext/widgets/`.
- New views in `app/components/UI/PredictNext/views/`.
- Component view tests for every migrated view.
- Updated route registration in `app/components/UI/PredictNext/routes/`.

## Step-by-Step Tasks

### 1. Hook Organization and Implementation

- Implement granular data hooks in domain folders:
  - `hooks/events/`: `useEventFeed`, `useFeaturedEvents`, `useEvent`, `usePriceHistory`.
  - `hooks/portfolio/`: `usePositions`, `useBalance`, `useActivity`.
  - `hooks/trading/`: `useOrderPreview`, `useTrading`.
  - `hooks/transactions/`: `useTransactions`, `useClaim`.
  - `hooks/live-data/`: `useLiveData`.
  - `hooks/navigation/`: `usePredictNavigation`.
  - `hooks/guard/`: `useEligibilityGuard`.
- **Rule**: Each data hook triggers exactly one query or subscription.
- **Rule**: Use barrel exports in each folder for clean imports.
- **Rule**: Deep imperative hooks (trading, transactions) manage complex stateful workflows.

### 2. Component Tier Implementation

- Follow the 3-tier component architecture:
  - **Primitives**: Pure components with no hooks. Use design system primitives (`Box`, `Text`, `ButtonBase`).
    - Examples: `EventCard`, `OutcomeButton`, `PositionCard`, `PriceDisplay`, `Scoreboard`, `Chart`, `Skeleton`.
  - **Widgets**: Wire data hooks to primitives.
    - Examples: `EventFeed`, `FeaturedCarousel`, `PortfolioSection`, `OrderForm`, `ActivityList`.
  - **Views**: Compose widgets and orchestrate with imperative/guard hooks.
    - Examples: `PredictHome`, `EventDetails`, `OrderScreen`, `TransactionsView`.

### 3. Vertical Slice Migration

Migrate screens in the following order (simplest to most complex):

1.  **Event Feed Slice**:
    - Hooks: `useEventFeed`, `useFeaturedEvents`.
    - Components: `EventCard`, `Skeleton`.
    - Widgets: `EventFeed`, `FeaturedCarousel`.
    - View: `PredictHome` (replaces `PredictFeed/`).
2.  **Event Details Slice**:
    - Hooks: `useEvent`, `usePriceHistory`.
    - Components: `Scoreboard`, `Chart`, `PriceDisplay`.
    - View: `EventDetails` (replaces `PredictMarketDetails/`).
3.  **Portfolio Slice**:
    - Hooks: `usePositions`, `useBalance`, `useActivity`.
    - Components: `PositionCard`.
    - Widgets: `PortfolioSection`, `ActivityList`.
    - View: `PortfolioView` (replaces `PredictTransactionsView/` and portfolio sections).
4.  **Order Flow Slice**:
    - Hooks: `useOrderPreview`, `useTrading`, `useTransactions`.
    - Components: `OutcomeButton`, `PredictKeypad`.
    - Widgets: `OrderForm`.
    - View: `OrderScreen` (replaces `PredictBuyWithAnyToken`, `PredictBuyPreview`, `PredictSellPreview`).
5.  **Modals and Guards**:
    - Migrate `AddFundsModal`, `UnavailableModal`, `GTMModal`.
    - Implement `useEligibilityGuard` and wire into views.

### 4. Verification and Testing

- For each migrated view, create:
  - A preset in `tests/component-view/presets/predict.ts`.
  - A renderer in `tests/component-view/renderers/`.
  - A view test file `*.view.test.tsx`.
- **Rule**: Component view tests are the primary verification surface. No standalone hook or component unit tests are required unless they contain complex non-UI logic.

### 5. External Consumer Switch

- Once all internal views are migrated, switch external import points:
  - Homepage sections, Wallet actions, Browser tab, and Deeplink handlers.
  - Update `app/core/NavigationService/types.ts` to point to new routes.

## Files Created

| File path                                           | Description                          | Estimated lines |
| --------------------------------------------------- | ------------------------------------ | --------------: |
| `app/components/UI/PredictNext/hooks/**/*.ts`       | Granular domain hooks                |       500-1,000 |
| `app/components/UI/PredictNext/components/**/*.tsx` | Tier 1: Pure primitive components    |       800-1,500 |
| `app/components/UI/PredictNext/widgets/**/*.tsx`    | Tier 2: Data-wired widgets           |       600-1,200 |
| `app/components/UI/PredictNext/views/**/*.tsx`      | Tier 3: Orchestrated screen views    |         400-800 |
| `tests/component-view/**/*.view.test.tsx`           | Integration tests for migrated views |       600-1,200 |

## Files Affected in Old Code

| File path                                    | Expected change                                                 |
| -------------------------------------------- | --------------------------------------------------------------- |
| `app/components/UI/Predict/routes/index.tsx` | Switch route components to PredictNext views as they are ready. |
| `app/components/Views/Homepage/...`          | Switch imports to PredictNext components.                       |
| `app/components/Views/Wallet/...`            | Switch imports to PredictNext components.                       |
| `app/core/NavigationService/types.ts`        | Update route param types to canonical versions.                 |

## Acceptance Criteria

- All Predict screens are rendered using `PredictNext` views, hooks, and components.
- UI uses `@metamask/design-system-react-native` and Tailwind CSS exclusively.
- No screen mixes old and new hooks or components.
- Every migrated view has a passing component view test suite.
- External consumers (Homepage, Wallet) are successfully switched to new components.
- Performance is equal to or better than the legacy implementation.

## Estimated PRs

- 8-12 PRs total.
  - 1 PR per vertical slice (Feed, Details, Portfolio, Order Flow).
  - 1-2 PRs for shared hooks and primitives.
  - 1-2 PRs for modals and guards.
  - 1 PR for external consumer switches.
