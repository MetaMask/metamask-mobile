# PredictNext Component Architecture

## Design Philosophy

PredictNext uses a 3-tier UI taxonomy:

1. Primitives: reusable building blocks with no screen awareness
2. Widgets: composed sections of a screen
3. Views: route-level layout and wiring

These UI tiers map to top-level product UI modules: `components/`, `widgets/`, and `views/`. `components/` contains Tier 1 primitives only. `widgets/` and `views/` are sibling modules, not nested under `components/`.

The redesign follows deep modules and slim interfaces. Primitives are extracted when real reuse justifies them; the Kalshi launch does not require rebuilding the full legacy UI or creating every target primitive first. A vertical slice may reuse venue-neutral existing presentation and app design-system modules while keeping new data/workflow seams clean.

Core rules:

- prefer one deep component over variant-specific wrappers when two real callers prove reuse,
- keep layout flexibility through composition, not prop explosion,
- use the MetaMask Mobile design system first,
- use compound components when shared parent context earns its keep,
- keep domain formatting/rendering local when it improves reuse,
- primitives are pure; widgets wire data hooks; views compose widgets,
- route/widget data includes explicit `venueId` or `PredictAccountScope`,
- render Account Setup, Claim, Settlement, Immediate/Resting Order, and funding actions from capabilities—not Venue-name branches,
- never place identity, credentials, KYC input, idempotency, or retry policy in presentation modules.

```text
TIER 3: Views (route-level)
┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────────┐
│ PredictHome │ │ EventDetails │ │ OrderScreen │ │ TransactionsView│
└──────┬──────┘ └──────┬───────┘ └──────┬──────┘ └────────┬────────┘
       │               │               │                  │
       v               v               v                  v
TIER 2: Widgets (composed sections)
┌───────────┐ ┌──────────────────┐ ┌─────────────────┐ ┌──────────────┐
│ EventFeed │ │ FeaturedCarousel │ │ PortfolioSection│ │ OrderForm    │
└─────┬─────┘ └────────┬─────────┘ └────────┬────────┘ └──────┬───────┘
      │                │                     │                 │
      v                v                     v                 v
TIER 1: Primitives (reusable building blocks)
┌───────────┐ ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
│ EventCard │ │ OutcomeButton │ │ PositionCard │ │ PriceDisplay │
└───────────┘ └───────────────┘ └──────────────┘ └──────────────┘
```

Legend:

- Primitives: Pure (no hooks), receive data via props
- Widgets: Wire data hooks to primitives
- Views: Compose widgets with imperative/guard hooks

Related docs:

- [interface ledger](./interface-ledger.md)
- [hooks](./hooks.md)
- [state management](./state-management.md)
- [testing](./testing.md)
- [error handling](./error-handling.md)
- [services](./services.md)

## Tier 1: Predict Design System Primitives

Tier 1 primitives are used across feeds, detail screens, portfolio surfaces, and order flows. They know about Predict domain entities, but not about specific route composition.

### EventCard

`EventCard` is the core compound module for event presentation. It replaces multiple card and row variants by rendering a stable `EventDisplayModel` prepared by widgets. The model lets widgets make section-level choices while `EventCard` internalizes layout, market-count, sport-specific, crypto-specific, and resolved-state rendering.

```tsx
const display = createEventDisplayModel(event, {
  surface: 'feed',
  density: 'comfortable',
});

<EventCard display={display}>
  <EventCard.Header />
  <EventCard.Markets />
  <EventCard.Footer />
  <EventCard.Scoreboard />
</EventCard>;
```

Why this shape works:

- `EventCard` provides event context once
- callers pass one display model, not a long list of variant props
- sub-components can be reordered or omitted per screen
- sport, crypto, binary, and multi-market rendering differences remain internal
- compact row, carousel, and detail layouts share the same public API

```text
Widget
  └── createEventDisplayModel(event, options)
        └── <EventCard display={display}>     ← provides context
              ├── <EventCard.Header />        ← reads from context
              ├── <EventCard.Markets />       ← reads from context
              ├── <EventCard.Footer />        ← reads from context
              └── <EventCard.Scoreboard/>     ← reads from context (optional)
```

Suggested file structure:

```text
components/
  EventCard/
    EventCard.tsx
    EventCardHeader.tsx
    EventCardMarkets.tsx
    EventCardFooter.tsx
    EventCardScoreboard.tsx
    EventCardContext.tsx
    createEventDisplayModel.ts
    index.ts
```

Example implementation sketch:

```tsx
// components/EventCard/EventCardContext.tsx
import React, { createContext, useContext } from 'react';
import { Box, Text } from '@metamask/design-system-react-native';
import type { EventDisplayModel } from './createEventDisplayModel';

export interface EventCardContextValue {
  display: EventDisplayModel;
}

const EventCardContext = createContext<EventCardContextValue | null>(null);

export function EventCardProvider({
  value,
  children,
}: {
  value: EventCardContextValue;
  children: React.ReactNode;
}) {
  return (
    <EventCardContext.Provider value={value}>
      {children}
    </EventCardContext.Provider>
  );
}

export function useEventCardContext() {
  const context = useContext(EventCardContext);

  if (!context) {
    throw new Error(
      'EventCard sub-components must be rendered within EventCard',
    );
  }

  return context;
}

export function EventCardHeader() {
  const { display } = useEventCardContext();
  return (
    <Box>
      <Text>{display.title}</Text>
    </Box>
  );
}
```

```tsx
// components/EventCard/EventCard.tsx
import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import type { EventDisplayModel } from './createEventDisplayModel';
import { EventCardProvider } from './EventCardContext';
import { EventCardHeader } from './EventCardHeader';
import { EventCardMarkets } from './EventCardMarkets';
import { EventCardFooter } from './EventCardFooter';
import { EventCardScoreboard } from './EventCardScoreboard';

interface EventCardProps {
  display: EventDisplayModel;
  children: React.ReactNode;
}

type EventCardCompound = React.FC<EventCardProps> & {
  Header: typeof EventCardHeader;
  Markets: typeof EventCardMarkets;
  Footer: typeof EventCardFooter;
  Scoreboard: typeof EventCardScoreboard;
};

const EventCardBase: React.FC<EventCardProps> = ({ display, children }) => {
  const tw = useTailwind();

  return (
    <EventCardProvider value={{ display }}>
      <Box style={tw.style('rounded-xl border border-muted bg-default p-4')}>
        {children}
      </Box>
    </EventCardProvider>
  );
};

export const EventCard = EventCardBase as EventCardCompound;
EventCard.Header = EventCardHeader;
EventCard.Markets = EventCardMarkets;
EventCard.Footer = EventCardFooter;
EventCard.Scoreboard = EventCardScoreboard;
```

`createEventDisplayModel` belongs to the Event presentation module and is exported alongside `EventCard` for any caller that renders the public primitive. It can derive labels, badges, market summaries, scoreboard visibility, and layout flags from a `PredictEvent`, but callers only choose the surface they are rendering:

```typescript
export type EventSurface = 'feed' | 'carousel' | 'detail' | 'portfolio';

export interface EventDisplayModel {
  eventId: string;
  title: string;
  subtitle?: string;
  image?: string;
  surface: EventSurface;
  density: 'compact' | 'comfortable';
  marketSummaries: EventMarketSummary[];
  scoreboard?: ScoreboardDisplayModel;
  statusBadge?: string;
}

export function createEventDisplayModel(
  event: PredictEvent,
  options: { surface: EventSurface; density?: 'compact' | 'comfortable' },
): EventDisplayModel;
```

If a new surface requires fields that do not fit this model, deepen the display model before adding new `EventCard` props.

### OutcomeButton

`OutcomeButton` can replace specialized buy, Claim, and Cash Out buttons with one presentation surface. The caller renders only actions supported by Venue/product capabilities; Kalshi never passes the Claim variant.

Public contract:

- `outcome`
- `price`
- `variant: 'buy' | 'claim' | 'cashout'`
- `loading`
- `disabled`

It owns label selection, loading state, price display, and disabled styling.

```tsx
import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text } from '@metamask/design-system-react-native';
import { PriceDisplay } from '../PriceDisplay';
import type { DecimalString, PredictOutcome } from '../../types';

interface OutcomeButtonProps {
  outcome: PredictOutcome;
  price?: DecimalString;
  variant: 'buy' | 'claim' | 'cashout';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function OutcomeButton({
  outcome,
  price,
  variant,
  loading = false,
  disabled = false,
  onPress,
}: OutcomeButtonProps) {
  const tw = useTailwind();

  const label =
    variant === 'buy'
      ? `Buy ${outcome.label}`
      : variant === 'claim'
        ? 'Claim winnings'
        : 'Cash out';

  return (
    <Pressable disabled={disabled || loading} onPress={onPress}>
      <Box
        style={tw.style(
          'rounded-lg px-4 py-3',
          disabled ? 'bg-muted' : 'bg-primary-default',
        )}
      >
        <Text color={disabled ? 'textMuted' : 'textAlternative'}>
          {loading ? 'Processing…' : label}
        </Text>
        {price ? <PriceDisplay value={price} format="cents" /> : null}
      </Box>
    </Pressable>
  );
}
```

### PositionCard

`PositionCard` handles portfolio states through canonical status and capability-approved actions rather than Venue branches. Open, won, lost, settled, and claimable presentation remains internal; automatic Settlement never creates a Claim affordance.

```tsx
import React from 'react';
import { Box, Text } from '@metamask/design-system-react-native';
import type { PredictPosition } from '../../types';
import { OutcomeButton } from '../OutcomeButton';
import { PriceDisplay } from '../PriceDisplay';

interface PositionCardProps {
  position: PredictPosition;
  onClaim?: (positionId: string) => void;
}

export function PositionCard({ position, onClaim }: PositionCardProps) {
  const canClaim = position.claimable;

  return (
    <Box gap={8}>
      <Text>{position.outcomeLabel}</Text>
      <Text>{position.size} shares</Text>
      <PriceDisplay value={position.averageEntryPrice} format="cents" />
      <PriceDisplay value={position.price} format="cents" />
      <PriceDisplay value={position.cashPnl} format="dollars" />
      {canClaim && onClaim ? (
        <OutcomeButton
          outcome={{ id: position.outcomeId, label: position.outcomeLabel }}
          variant="claim"
          onPress={() => onClaim(position.id)}
        />
      ) : null}
    </Box>
  );
}
```

### PriceDisplay

`PriceDisplay` centralizes formatting rules for cents, dollars, percentages, and shares. It prevents view code from duplicating display logic and lets formatting evolve in one place.

```tsx
import React from 'react';
import { Text } from '@metamask/design-system-react-native';

import type { DecimalString } from '../../types';

interface PriceDisplayProps {
  value: DecimalString;
  format: 'cents' | 'dollars' | 'percentage' | 'shares';
  emphasize?: 'gain' | 'loss' | 'neutral';
}

export function PriceDisplay({
  value,
  format,
  emphasize = 'neutral',
}: PriceDisplayProps) {
  const color =
    emphasize === 'gain'
      ? 'successDefault'
      : emphasize === 'loss'
        ? 'errorDefault'
        : 'textDefault';

  const numericValue = Number(value);

  const formatted =
    format === 'cents'
      ? `${Math.round(numericValue)}¢`
      : format === 'dollars'
        ? `$${numericValue.toFixed(2)}`
        : format === 'percentage'
          ? `${(numericValue * 100).toFixed(1)}%`
          : `${numericValue.toFixed(2)} shares`;

  return <Text color={color}>{formatted}</Text>;
}
```

### Scoreboard

`Scoreboard` is a standalone sports presentation primitive with `compact` and `full` modes.

```tsx
import React from 'react';
import { Box, Text } from '@metamask/design-system-react-native';
import type { PredictGame } from '../../types';

interface ScoreboardProps {
  game: PredictGame;
  variant: 'compact' | 'full';
}

export function Scoreboard({ game, variant }: ScoreboardProps) {
  return (
    <Box gap={variant === 'compact' ? 4 : 12}>
      <Text>
        {game.awayTeam.name} {game.awayTeam.score}
      </Text>
      <Text>
        {game.homeTeam.name} {game.homeTeam.score}
      </Text>
      <Text>{game.periodLabel}</Text>
    </Box>
  );
}
```

### Chart

`Chart` provides one Predict chart API for both price history and game progression.

```tsx
import React from 'react';
import { Box, Text } from '@metamask/design-system-react-native';
import type { DecimalString } from '../../types';

interface ChartPoint {
  timestamp: number;
  value: number | DecimalString;
}

interface ChartProps {
  data: ChartPoint[];
  variant: 'price' | 'game';
  range: '1D' | '1W' | '1M';
  onRangeChange?: (range: '1D' | '1W' | '1M') => void;
}

export function Chart({ data, variant, range, onRangeChange }: ChartProps) {
  return (
    <Box>
      <Text>{variant === 'price' ? 'Price history' : 'Game movement'}</Text>
      <Text>{`Points: ${data.length}`}</Text>
      <Text onPress={() => onRangeChange?.('1W')}>{range}</Text>
    </Box>
  );
}
```

### Skeleton

`Skeleton` acts as a layout factory for loading states. Screens request a semantic layout, not a custom loading component.

```tsx
import React from 'react';
import { Box } from '@metamask/design-system-react-native';

interface SkeletonProps {
  layout: 'eventCard' | 'detailsHeader' | 'positionCard' | 'feed';
}

export function Skeleton({ layout }: SkeletonProps) {
  if (layout === 'feed') {
    return (
      <Box gap={12}>
        <Skeleton layout="eventCard" />
        <Skeleton layout="eventCard" />
      </Box>
    );
  }

  return (
    <Box
      style={{
        height: layout === 'detailsHeader' ? 120 : 84,
        borderRadius: 16,
        opacity: 0.12,
      }}
    />
  );
}
```

## Tier 2: Composed Widgets

Widgets are the integration layer between data and presentation. They call data query hooks internally and render Tier 1 primitives with the results. Each widget maps to a major screen section and owns the section-level state needed to operate.

See [hooks — Hook Usage by Component Tier](./hooks.md#hook-usage-by-component-tier) for the full tier/hook relationship.

### EventFeed

Purpose:

- Render a searchable, filterable, infinitely scrolling list of events

Composes:

- `EventCard`
- `Skeleton`

Hooks (called internally by the widget):

- `useEventList` from `hooks/events` — paginated event feed
- `useEventSearch` from `hooks/events` — search results
- optional local filter/tab state hook co-located with the widget

Typical responsibilities:

- search box input
- category tab state
- pagination trigger via `fetchMore`
- map each `PredictEvent` into an `EventDisplayModel` for the feed surface
- empty and loading states

### FeaturedCarousel

Purpose:

- Render highlighted events in a horizontal carousel layout

Composes:

- `EventCard`

Hooks (called internally by the widget):

- `useFeaturedEvents` from `hooks/events` — carousel events
- `usePredictNavigation` from `hooks/navigation` — tap-to-details navigation

Typical responsibilities:

- horizontal snapping behavior
- card width calculation
- map each `PredictEvent` into an `EventDisplayModel` for the carousel surface
- tap-to-details navigation

### PortfolioSection

Purpose:

- Render account balance, aggregate P&L, and open or resolved positions

Composes:

- `PositionCard`
- `PriceDisplay`
- `Skeleton`

Hooks (called internally by the widget):

- `usePositions` from `hooks/portfolio` — open and resolved positions
- `useBalance` from `hooks/portfolio` — prediction market balance
- `usePnL` from `hooks/portfolio` — unrealized P&L

Typical responsibilities:

- section tabs for open, resolved, and (only for venues with a Claim capability) claimable positions — Kalshi settles automatically and never shows a claimable tab
- summary header for balance and unrealized P&L
- empty state for users with no exposure

### OrderForm

Purpose:

- Collect order amount, payment token, and outcome selection before placing a trade

Composes:

- `OutcomeButton`
- `PriceDisplay`

Hooks (called internally by the widget):

- `useTrading` from `hooks/trading` — order preview and placement
- `usePredictGuard` from `hooks/guard` — eligibility check
- local keypad state hook co-located with the widget

Typical responsibilities:

- amount keypad input
- payment token selector
- fee and slippage summary
- primary action enablement

### ActivityList

Purpose:

- Render transaction history and a detail sheet for a selected activity row

Composes:

- `PriceDisplay`
- `Skeleton`

Hooks (called internally by the widget):

- `useActivity` from `hooks/portfolio` — transaction history
- `usePredictNavigation` from `hooks/navigation` — detail sheet navigation

Typical responsibilities:

- grouping by date
- pending-state badges
- opening a transaction detail sheet

## Tier 3: Views

Views remain thin. They arrange widgets, connect route params, and handle cross-cutting concerns (eligibility guards, imperative actions). Views do not fetch data directly — widgets handle that internally.

### PredictHome

Composition:

- `FeaturedCarousel` (fetches featured events internally)
- `EventFeed` (fetches event list and search internally)
- `PortfolioSection` (fetches positions, balance, P&L internally)

Hooks wired at view level:

- `usePredictGuard` — gate access for geo-blocked or ineligible users
- `usePredictNavigation` — tab state, scroll management

Route params:

- `venueId: PredictVenueId`
- `accountScope?: PredictAccountScope` when portfolio content is shown

Per the venue-selection policy (parent ADR), an ineligible venue is **read-only**: browsing markets and prices always works; only actions (onboarding, trading, funding) are eligibility-blocked. The guard gates actions and account surfaces, never public browsing. Only `venueAvailable === false` (venue/backend outage, kill switch) removes the browse surface.

```tsx
export function PredictHome({
  venueId,
  accountScope,
  capabilities,
}: PredictHomeProps) {
  const { venueAvailable, canSetup, canTrade } = usePredictGuard({
    venueId,
    accountScope,
  });
  if (!venueAvailable) return <UnavailableModal />;

  return (
    <ScrollView>
      {capabilities.marketData.featured ? (
        <FeaturedCarousel venueId={venueId} />
      ) : null}
      {/* Browsing works even when the user is ineligible for actions. */}
      <EventFeed venueId={venueId} search={capabilities.marketData.search} />
      {accountScope && (canSetup || canTrade) ? (
        <PortfolioSection scope={accountScope} />
      ) : null}
    </ScrollView>
  );
}
```

Eligibility for actions is additionally enforced server-side, independent of client geolocation or flags; the client guard is UX, not the control.

### EventDetails

Composition:

- `EventCard` in `detail` mode
- `Chart`
- `OutcomeButton`
- `PositionCard`

Hooks wired at view level:

- `useEventDetail` from `hooks/events` — single event by ID
- `usePositions` from `hooks/portfolio` — user positions for this event
- optional `useLiveData` from `hooks/live-data` for live-capable surfaces; otherwise query polling
- `usePriceHistory` from `hooks/events` — chart data

Note: EventDetails is a view that directly renders primitives rather than composing widgets, because its layout is unique and not reusable elsewhere. This is fine — not every view needs to delegate to widgets.

Route params:

- `venueId: PredictVenueId`
- `eventId: string`
- `accountScope?: PredictAccountScope`

### OrderScreen

Composition:

- `OrderForm` (handles trading hooks internally)

Hooks wired at view level:

- `usePredictGuard` — final eligibility check before order entry

Route params:

- `accountScope: PredictAccountScope`
- `eventId: string`
- `marketId: string`
- `outcomeId: string`

### TransactionsView

Composition:

- `ActivityList` (fetches activity internally)

Hooks wired at view level:

- `useTransactions` from `hooks/transactions` — pending transaction state

Route params:

- `accountScope: PredictAccountScope`

## UI Directory Structure

Recommended structure under `app/components/UI/PredictNext`:

```text
components/
  EventCard/
    EventCard.tsx
    EventCardContext.tsx
    EventCardFooter.tsx
    EventCardHeader.tsx
    EventCardMarkets.tsx
    EventCardScoreboard.tsx
    index.ts
  OutcomeButton/
    OutcomeButton.tsx
    index.ts
  PositionCard/
    PositionCard.tsx
    index.ts
  PriceDisplay/
    PriceDisplay.tsx
    index.ts
  Scoreboard/
    Scoreboard.tsx
    index.ts
  Chart/
    Chart.tsx
    index.ts
  Skeleton/
    Skeleton.tsx
    index.ts
widgets/
  EventFeed/
    EventFeed.tsx
    useEventFeedState.ts
    index.ts
  FeaturedCarousel/
    FeaturedCarousel.tsx
    index.ts
  PortfolioSection/
    PortfolioSection.tsx
    index.ts
  OrderForm/
    OrderForm.tsx
    useOrderFormState.ts
    index.ts
  ActivityList/
    ActivityList.tsx
    index.ts
views/
  PredictHome/
    PredictHome.tsx
    index.ts
  EventDetails/
    EventDetails.tsx
    index.ts
  OrderScreen/
    OrderScreen.tsx
    useBuyViewState.ts
    index.ts
  TransactionsView/
    TransactionsView.tsx
    index.ts
```

Top-level does not mean public. `views/` and selected primitives from `components/` may be exported through the package `index.ts`; `widgets/` are internal composition modules unless explicitly exported. This structure keeps the public surface area small while preserving high internal cohesion. Primitive complexity stays centralized, widgets compose behavior predictably, and views remain easy to read and test.
