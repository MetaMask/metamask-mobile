# Live NFL Sports Architecture

This document describes the architecture for the Live NFL Sports feature in Prediction Markets.

## Overview

The Live NFL feature introduces real-time sports betting functionality with WebSocket-driven live updates for game scores and market prices. It includes a new UI/UX specifically designed for NFL game markets.

## Feature Flag

The feature is gated behind `predictLiveNflEnabled`:

```typescript
// app/components/UI/Predict/selectors/featureFlags/index.ts
export const selectPredictLiveNflEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PREDICT_LIVE_NFL_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.predictLiveNflEnabled as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
```

## Architecture Layers

```
+------------------------------------------------------------------+
|                         React Components                          |
|  PredictMarketGame | PredictMarketDetails | PredictGamePosition  |
|  (each subscribes to only the data it needs at lowest level)     |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                         React Hooks                               |
|  useLiveGameUpdates | useLiveMarketPrices | useLiveTokenPrice    |
|  (granular subscriptions - NO composite hooks)                    |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                      PredictController                            |
|  subscribeToGameUpdates() | subscribeToMarketPrices()            |
|  unsubscribeFromGameUpdates() | unsubscribeFromMarketPrices()    |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                     PolymarketProvider                            |
|  WebSocketManager (Singleton) + GameCache                        |
|  - Sports WS: wss://sports-api.polymarket.com/ws                 |
|  - Market WS: wss://ws-subscriptions-clob.polymarket.com/ws/market|
|  - GameCache: overlays live data onto getMarkets/getMarket       |
+------------------------------------------------------------------+
```

## WebSocket Architecture

### Singleton Connection Pattern

Instead of per-component WebSocket connections (POC approach), we use a singleton pattern in `PolymarketProvider`:

```typescript
// PolymarketProvider.ts
class WebSocketManager {
  private static instance: WebSocketManager;
  private sportsWs: WebSocket | null = null;
  private marketWs: WebSocket | null = null;

  // Subscription registries
  private gameSubscriptions: Map<string, Set<(data: GameUpdate) => void>> =
    new Map();
  private priceSubscriptions: Map<string, Set<(data: PriceUpdate) => void>> =
    new Map();

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  subscribeToGame(
    gameId: string,
    callback: (data: GameUpdate) => void,
  ): () => void {
    // Add to subscription registry
    // Connect if not connected
    // Return unsubscribe function
  }

  subscribeToMarketPrices(
    tokenIds: string[],
    callback: (data: PriceUpdate) => void,
  ): () => void {
    // Add to subscription registry
    // Send subscription message to WS
    // Return unsubscribe function
  }
}
```

### WebSocket Message Formats

#### Sports WebSocket Events

```typescript
interface SportsWebSocketEvent {
  gameId: number;
  leagueAbbreviation: string;
  turn?: string; // Team with possession
  score: string; // "21-14" (away-home)
  elapsed: string; // Game clock
  period: string; // "Q1", "Q2", "HT", "Q3", "Q4", "OT", "FT"
  live: boolean;
  ended: boolean;
}
```

#### Market WebSocket Events

```typescript
interface MarketWebSocketEvent {
  event_type: 'price_change' | 'book' | 'last_trade_price';
  market: string; // condition ID
  price_changes?: {
    asset_id: string; // token ID
    price: string;
    best_bid: string;
    best_ask: string;
  }[];
  timestamp: string;
}
```

### Connection Lifecycle

1. **Lazy Connection**: WebSocket connects only when first subscription is made
2. **Reference Counting**: Tracks active subscriptions per topic
3. **Auto-disconnect**: Closes WebSocket when no active subscriptions remain
4. **AppState Awareness**: Disconnects on app background, reconnects on foreground
5. **Exponential Backoff**: Reconnection with increasing delay (max 5 attempts)

## Game Cache

The PolymarketProvider maintains a cache of live game updates that overlays onto API responses.

### Purpose

When `getMarkets()` or `getMarket()` returns data, the cache automatically merges the latest WebSocket game updates onto the response. This ensures:

1. Feed cards show live scores without requiring individual WebSocket subscriptions
2. Consistency between feed and details screens
3. Reduced WebSocket message handling in UI components

### Cache Behavior

```typescript
class GameCache {
  private cache: Map<string, { data: GameUpdate; lastUpdate: number }>;

  // Called by WebSocketManager when game update received
  updateGame(gameId: string, update: GameUpdate): void;

  // Called by getMarkets/getMarket to overlay cached data
  overlayOnMarket(market: PredictMarket): PredictMarket;

  // Cleanup entries with no updates for 5 minutes
  pruneStaleEntries(): void;
}
```

### Cache Rules

- **NFL games only**: Only caches games with `nfl` tag
- **TTL**: Entries without updates for 5 minutes are removed
- **Overlay**: Cached data overlays onto `market.game` object
- **Priority**: Cache data takes precedence over API response (it's more recent)

### Integration

```typescript
// In PolymarketProvider
async getMarkets(params): Promise<PredictMarket[]> {
  const markets = await this.api.getMarkets(params);
  return markets.map(m => this.gameCache.overlayOnMarket(m));
}

async getMarket(id): Promise<PredictMarket> {
  const market = await this.api.getMarket(id);
  return this.gameCache.overlayOnMarket(market);
}
```

## Data Types

### Game Data Types

```typescript
// app/components/UI/Predict/types/index.ts

type PredictSportsLeague = 'nfl';
type PredictGameStatus = 'scheduled' | 'ongoing' | 'ended';

interface PredictSportTeam {
  id: string;
  name: string;
  logo: string;
  abbreviation: string; // e.g., "SEA", "DEN"
  color: string; // Team primary color (hex)
  alias: string; // Team alias (e.g., "Seahawks")
}

interface PredictMarketGame {
  id: string;
  startTime: string;
  status: PredictGameStatus;
  league: PredictSportsLeague;
  elapsed: string; // Game clock
  period: string; // Current period
  score: string; // "away-home" format
  homeTeam: PredictSportTeam;
  awayTeam: PredictSportTeam;
  turn?: string; // Team abbreviation with possession
}
```

### Live Update Types

```typescript
interface GameUpdate {
  gameId: string;
  score: string;
  elapsed: string;
  period: string;
  status: PredictGameStatus;
  turn?: string;
}

interface PriceUpdate {
  tokenId: string;
  price: number;
  bestBid: number;
  bestAsk: number;
}
```

## Component Architecture

### Feed Components

```
PredictFeed
  +-- CategoryTabs (adds "NFL" tab)
  +-- MarketList
        +-- PredictMarket (wrapper)
              +-- PredictMarketGame (if market.game exists)
                    +-- TeamGradient
                    +-- ScheduledContent / OngoingContent / EndedContent
                    +-- GamePositionPreview (if user has position)
                    +-- ActionButtons / ClaimButton
              +-- PredictMarketSingle / PredictMarketMultiple (non-game markets)
```

### Details Screen Components

**IMPORTANT**: There is NO separate `GAME_DETAILS` route. The existing `MARKET_DETAILS` route renders `PredictGameDetailsContent` when `market.game` exists, otherwise renders the standard market details.

```
PredictMarketDetails (existing view)
  +-- if market.game exists:
        +-- PredictGameDetailsContent (new component)
              +-- TeamGradient
              +-- GameScoreboard (subscribes to useLiveGameUpdates)
                    +-- TeamHelmet (x2)
                    +-- ScoreDisplay / PercentageDisplay
                    +-- GameStatusBadge
              +-- PredictGameChart (subscribes to useLiveMarketPrices)
                    +-- DualLineChart
                    +-- TimeframeSelector
                    +-- InteractiveTooltip
              +-- GamePositionsSection
                    +-- GamePositionRow (each subscribes to useLiveTokenPrice)
                          +-- TeamIndicator
                          +-- PositionAmount
                          +-- PnLDisplay
                          +-- CashOutButton
              +-- GameDetailsFooter (subscribes to useLiveMarketPrices)
                    +-- MarketInfoBar (volume, type)
                    +-- ActionButtons / ClaimButton
  +-- else:
        +-- PredictMarketDetailsContent (existing)
```

## State Management

### Local React State (High-Frequency Updates)

Used for data that updates frequently and only affects local UI:

- Live game scores
- Live market prices
- Chart scrubbing state

### Redux State (Shared/Persisted Data)

Used for data shared across screens or requiring persistence:

- User positions
- Market metadata
- Eligibility status
- Balances

## Hooks Architecture

### Granular Subscription Pattern

**IMPORTANT**: Each component subscribes to only the data it needs at the lowest level to minimize React re-renders. There is NO composite hook that aggregates all data - this would cause unnecessary re-renders across the entire tree.

| Component                      | Subscribes To                   |
| ------------------------------ | ------------------------------- |
| GameScoreboard                 | `useLiveGameUpdates(gameId)`    |
| PredictGameChart               | `useLiveMarketPrices(tokenIds)` |
| PredictGamePosition (each row) | `useLiveTokenPrice(tokenId)`    |
| ActionButtons                  | `useLiveMarketPrices(tokenIds)` |

### useLiveGameUpdates

```typescript
function useLiveGameUpdates(gameId: string | null): {
  gameUpdate: GameUpdate | null;
  isConnected: boolean;
};
```

- Subscribes to sports WebSocket for specific game
- Returns live game data (score, period, elapsed, status)
- Auto-unsubscribes on unmount
- **Used by**: GameScoreboard

### useLiveMarketPrices

```typescript
function useLiveMarketPrices(tokenIds: string[]): {
  prices: Map<string, PriceUpdate>;
  isConnected: boolean;
};
```

- Subscribes to market WebSocket for specific tokens
- Returns live price data for multiple tokens
- Auto-unsubscribes on unmount
- **Used by**: Chart, ActionButtons

### useLiveTokenPrice

```typescript
function useLiveTokenPrice(tokenId: string): {
  price: PriceUpdate | null;
  isConnected: boolean;
};
```

- Subscribes to market WebSocket for a SINGLE token
- Minimal re-render scope - only the component using this hook re-renders
- **Used by**: Individual PredictGamePosition rows

## NFL Tab Implementation

### Feed Category Extension

```typescript
// Add NFL to existing categories
const FEED_CATEGORIES = [
  'trending',
  'new',
  'sports',
  'crypto',
  'politics',
  'nfl',
] as const;
```

### NFL Tab Behavior

- Shows ALL markets with `nfl` tag
- Sorted by 24h volume (descending)
- Uses `getMarkets({ tags: ['nfl'], sortBy: 'volume24h' })`

## Gradient Implementation

The gradient is a simple 45° linear overlay with both team colors at 20% opacity. **No theme awareness needed** - the design system handles dark/light backgrounds automatically.

```typescript
const getTeamGradient = (awayColor: string, homeColor: string): string[] => {
  return [
    `${awayColor}33`, // Away team color at 20% opacity (hex 33 = 20%)
    `${homeColor}33`, // Home team color at 20% opacity
  ];
};
```

Applied using `react-native-linear-gradient`:

```tsx
<LinearGradient
  colors={getTeamGradient(awayColor, homeColor)}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.gradient}
/>
```

The gradient acts as an overlay on top of the existing background, which is already theme-aware.

## Error Handling

### WebSocket Errors

- Connection failures: Retry with exponential backoff
- Message parse errors: Log and ignore, don't crash
- Subscription failures: Silent retry on reconnection

### API Errors

- Market not found: Show error state
- Position fetch fails: Show cached data with refresh option
- Network offline: Show offline indicator, disable live features

## Performance Considerations

1. **Debounced Price Updates**: Batch price updates to avoid excessive re-renders
2. **Memoized Components**: Use `React.memo` for chart and position components
3. **Lazy WebSocket**: Only connect when live data is actually needed
4. **Cleanup on Background**: Disconnect WebSockets when app is backgrounded

## Testing Strategy

### Unit Tests Required

- WebSocketManager subscription/unsubscription logic
- Game status derivation from WebSocket events
- Price parsing and normalization
- Component rendering for each game state
- Hook behavior with mock WebSocket events

### Integration Tests

- Full flow: Feed → Card → Details → Buy
- Position display with live price updates
- Claim flow for ended games

## File Structure

```
app/components/UI/Predict/
+-- components/
|   +-- PredictMarketGame/
|   |   +-- PredictMarketGame.tsx
|   |   +-- PredictMarketGame.test.tsx
|   |   +-- PredictMarketGame.types.ts
|   |   +-- GamePositionPreview.tsx
|   |   +-- index.ts
|   +-- PredictGameDetailsContent/          # Component, NOT a view
|   |   +-- PredictGameDetailsContent.tsx   # Renders inside PredictMarketDetails
|   |   +-- PredictGameDetailsContent.test.tsx
|   |   +-- GameScoreboard.tsx
|   |   +-- GameDetailsFooter.tsx
|   |   +-- index.ts
|   +-- PredictGameChart/
|   |   +-- PredictGameChart.tsx
|   |   +-- PredictGameChart.test.tsx
|   |   +-- TimeframeSelector.tsx
|   |   +-- index.ts
|   +-- PredictGamePosition/
|   |   +-- PredictGamePosition.tsx
|   |   +-- PredictGamePosition.test.tsx
|   |   +-- PredictGamePositionsSection.tsx
|   |   +-- index.ts
|   +-- TeamHelmet/
|   +-- FootballIcon/
|   +-- TeamGradient/
+-- hooks/
|   +-- useLiveGameUpdates.ts
|   +-- useLiveGameUpdates.test.ts
|   +-- useLiveMarketPrices.ts
|   +-- useLiveMarketPrices.test.ts
|   +-- useLiveTokenPrice.ts               # Single token subscription
|   +-- useLiveTokenPrice.test.ts
+-- providers/
|   +-- polymarket/
|       +-- WebSocketManager.ts
|       +-- WebSocketManager.test.ts
|       +-- GameCache.ts                   # Cache for live game data
|       +-- GameCache.test.ts
+-- views/
|   +-- PredictMarketDetails/              # Existing view - modified
|       +-- ... (renders PredictGameDetailsContent when market.game exists)
+-- selectors/
|   +-- featureFlags/
|       +-- index.ts (add selectPredictLiveNflEnabled)
```

## Dependencies

### Existing Dependencies (no additions needed)

- `react-native-linear-gradient` - For team gradients
- `react-native-svg-charts` - For price chart
- `react-native-svg` - For chart decorators

## Migration Notes

### From POC to Production

1. Move WebSocket connections from `usePredictLiveMarket` hook to `PolymarketProvider`
2. Create subscription-based hooks that connect to the provider
3. Ensure proper cleanup and reference counting
4. Add comprehensive error handling and logging
5. Implement GameCache for efficient data overlay
6. Use granular subscriptions pattern (no composite hooks)

### Backward Compatibility

- Existing non-game markets continue to work unchanged
- `PredictMarket` wrapper component routes to appropriate card type
- Feed categories remain backward compatible
- No new routes added - `MARKET_DETAILS` handles both game and non-game markets

### Key Architectural Decisions

| Decision               | Choice                                    | Rationale                                    |
| ---------------------- | ----------------------------------------- | -------------------------------------------- |
| WebSocket pattern      | Singleton in PolymarketProvider           | Centralized connection management            |
| State for live data    | Local React state                         | High-frequency updates, not persisted        |
| Re-render optimization | Granular subscriptions at component level | Minimize React tree re-renders               |
| Game data freshness    | GameCache overlays WebSocket data         | Feed shows live scores without subscriptions |
| Gradient               | Simple 20% overlay, 45° angle             | Design system handles theming                |
| Navigation             | Single MARKET_DETAILS route               | Runtime render decision based on market.game |
| NFL markets            | Cache only games with 'nfl' tag           | Scoped caching                               |
| Cache cleanup          | 5 minute TTL                              | Prevent memory bloat                         |
