# PredictNext Component Architecture

## Design Philosophy

PredictNext uses a 3-tier component taxonomy:

1. Primitives: reusable building blocks with no screen awareness
2. Widgets: composed sections of a screen
3. Views: route-level layout and wiring

The redesign follows deep modules and slim interfaces. A small number of components own the complexity of rendering prediction-market data instead of spreading variant logic across many shallow files. This keeps view code small and gives teams one place to evolve behavior.

Core rules:

- Prefer one deep component over many variant-specific wrappers
- Keep layout flexibility through composition, not prop explosion
- Use the MetaMask Mobile design system first: `useTailwind`, `Box`, and `Text`
- Use compound components where a parent can provide shared context to related children
- Keep domain formatting and rendering logic inside primitives when it improves reuse
- Primitives are pure (no hooks) — widgets wire data hooks to primitives — views compose widgets

Related docs:

- [hooks](./hooks.md)
- [state management](./state-management.md)
- [testing](./testing.md)
- [error handling](./error-handling.md)
- [services](./services.md)

## Tier 1: Predict Design System Primitives

Tier 1 primitives are used across feeds, detail screens, portfolio surfaces, and order flows. They know about Predict domain entities, but not about specific route composition.

### EventCard

`EventCard` is the core compound component for event presentation. It replaces multiple card and row variants by internalizing layout, market-count, and sport-specific logic.

```tsx
<EventCard event={event} variant="card" density="comfortable">
  <EventCard.Header />
  <EventCard.Markets />
  <EventCard.Footer />
  <EventCard.Scoreboard />
</EventCard>
```

Why this shape works:

- `EventCard` provides event context once
- sub-components can be reordered or omitted per screen
- sport, crypto, binary, and multi-market rendering differences remain internal
- compact row and full card layouts can share the same public API

Suggested file structure:

```text
components/
  primitives/
    EventCard/
      EventCard.tsx
      EventCardHeader.tsx
      EventCardMarkets.tsx
      EventCardFooter.tsx
      EventCardScoreboard.tsx
      EventCardContext.tsx
      index.ts
```

Example implementation sketch:

```tsx
// components/primitives/EventCard/EventCardContext.tsx
import React, { createContext, useContext } from 'react';
import { Box, Text } from '@metamask/design-system-react-native';
import type { PredictEvent } from '../../types';

export interface EventCardContextValue {
  event: PredictEvent;
  variant: 'card' | 'row' | 'detail';
  density: 'compact' | 'comfortable';
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
  const { event } = useEventCardContext();
  return (
    <Box>
      <Text>{event.title}</Text>
    </Box>
  );
}
```

```tsx
// components/primitives/EventCard/EventCard.tsx
import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import type { PredictEvent } from '../../types';
import { EventCardProvider } from './EventCardContext';
import { EventCardHeader } from './EventCardHeader';
import { EventCardMarkets } from './EventCardMarkets';
import { EventCardFooter } from './EventCardFooter';
import { EventCardScoreboard } from './EventCardScoreboard';

interface EventCardProps {
  event: PredictEvent;
  variant?: 'card' | 'row' | 'detail';
  density?: 'compact' | 'comfortable';
  children: React.ReactNode;
}

type EventCardCompound = React.FC<EventCardProps> & {
  Header: typeof EventCardHeader;
  Markets: typeof EventCardMarkets;
  Footer: typeof EventCardFooter;
  Scoreboard: typeof EventCardScoreboard;
};

const EventCardBase: React.FC<EventCardProps> = ({
  event,
  variant = 'card',
  density = 'comfortable',
  children,
}) => {
  const tw = useTailwind();

  return (
    <EventCardProvider value={{ event, variant, density }}>
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

### OutcomeButton

`OutcomeButton` replaces specialized buy, claim, and cash-out buttons with a single stateful action surface.

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
import type { PredictOutcome } from '../../types';

interface OutcomeButtonProps {
  outcome: PredictOutcome;
  price?: number;
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
        {typeof price === 'number' ? (
          <PriceDisplay value={price} format="cents" />
        ) : null}
      </Box>
    </Pressable>
  );
}
```

### PositionCard

`PositionCard` handles portfolio states through position status rather than specialized components. Open, won, lost, and claimable states remain internal to the component.

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
  const canClaim = position.status === 'claimable';

  return (
    <Box gap={8}>
      <Text>{position.outcomeLabel}</Text>
      <Text>{position.shares} shares</Text>
      <PriceDisplay value={position.entryPrice} format="cents" />
      <PriceDisplay value={position.currentPrice} format="cents" />
      <PriceDisplay value={position.unrealizedPnl} format="dollars" />
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

interface PriceDisplayProps {
  value: number;
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

  const formatted =
    format === 'cents'
      ? `${Math.round(value)}¢`
      : format === 'dollars'
        ? `$${value.toFixed(2)}`
        : format === 'percentage'
          ? `${(value * 100).toFixed(1)}%`
          : `${value.toFixed(2)} shares`;

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
import React, { useMemo, useState } from 'react';
import { Box, Text } from '@metamask/design-system-react-native';

interface ChartPoint {
  timestamp: number;
  value: number;
}

interface ChartProps {
  data: ChartPoint[];
  variant: 'price' | 'game';
}

export function Chart({ data, variant }: ChartProps) {
  const [range, setRange] = useState<'1D' | '1W' | '1M'>('1D');

  const visibleData = useMemo(() => {
    return data;
  }, [data, range]);

  return (
    <Box>
      <Text>{variant === 'price' ? 'Price history' : 'Game movement'}</Text>
      <Text>{`Points: ${visibleData.length}`}</Text>
      <Text onPress={() => setRange('1W')}>{range}</Text>
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

- section tabs for open, resolved, and claimable positions
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

- none required

```tsx
export function PredictHome() {
  const { isEligible } = usePredictGuard();
  if (!isEligible) return <UnavailableModal />;

  return (
    <ScrollView>
      <FeaturedCarousel />
      <EventFeed />
      <PortfolioSection />
    </ScrollView>
  );
}
```

### EventDetails

Composition:

- `EventCard` in `detail` mode
- `Chart`
- `OutcomeButton`
- `PositionCard`

Hooks wired at view level:

- `useEventDetail` from `hooks/events` — single event by ID
- `usePositions` from `hooks/portfolio` — user positions for this event
- `useLiveData` from `hooks/live-data` — real-time price updates
- `usePriceHistory` from `hooks/events` — chart data

Note: EventDetails is a view that directly renders primitives rather than composing widgets, because its layout is unique and not reusable elsewhere. This is fine — not every view needs to delegate to widgets.

Route params:

- `eventId: string`

### OrderScreen

Composition:

- `OrderForm` (handles trading hooks internally)

Hooks wired at view level:

- `usePredictGuard` — final eligibility check before order entry

Route params:

- `marketId: string`
- `outcomeId: string`

### TransactionsView

Composition:

- `ActivityList` (fetches activity internally)

Hooks wired at view level:

- `useTransactions` from `hooks/transactions` — pending transaction state

Route params:

- `accountId?: string`

## Component Directory Structure

Recommended structure under `app/components/UI/PredictNext/components`:

```text
components/
  primitives/
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

This structure keeps the public surface area small while preserving high internal cohesion. Primitive complexity stays centralized, widgets compose behavior predictably, and views remain easy to read and test.
