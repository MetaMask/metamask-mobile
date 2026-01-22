# Task 01: WebSocket Manager

## Description

Implement a singleton WebSocket manager in `PolymarketProvider` that handles connections to Polymarket's Sports and Market WebSocket endpoints. This replaces the per-component WebSocket approach from the POC with a centralized, subscription-based model.

## Requirements

- Singleton WebSocket manager class
- Support for Sports WS (game updates) and Market WS (price updates)
- Subscription-based model with reference counting
- Automatic reconnection with exponential backoff
- AppState awareness (disconnect on background, reconnect on foreground)
- **GameCache**: Cache layer that overlays live game data onto API responses
- Comprehensive unit tests

## Dependencies

- Task 00: Feature Flag and Data Types (for type definitions)

## Designs

- N/A (infrastructure task)

## Implementation

### 1. WebSocket Manager Class

Create `app/components/UI/Predict/providers/polymarket/WebSocketManager.ts`:

```typescript
import { AppState, AppStateStatus } from 'react-native';
import { GameUpdate, PriceUpdate, PredictGameStatus } from '../../types';

const SPORTS_WS_URL = 'wss://sports-api.polymarket.com/ws';
const MARKET_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL_MS = 50000;

type GameUpdateCallback = (update: GameUpdate) => void;
type PriceUpdateCallback = (updates: PriceUpdate[]) => void;

interface SportsWebSocketEvent {
  gameId: number;
  leagueAbbreviation: string;
  turn?: string;
  score: string;
  elapsed: string;
  period: string;
  live: boolean;
  ended: boolean;
}

interface MarketWebSocketEvent {
  event_type: string;
  market: string;
  price_changes?: {
    asset_id: string;
    price: string;
    best_bid: string;
    best_ask: string;
  }[];
  timestamp: string;
}

export class WebSocketManager {
  private static instance: WebSocketManager;

  // WebSocket connections
  private sportsWs: WebSocket | null = null;
  private marketWs: WebSocket | null = null;

  // Subscription registries
  private gameSubscriptions: Map<string, Set<GameUpdateCallback>> = new Map();
  private priceSubscriptions: Map<string, Set<PriceUpdateCallback>> = new Map();

  // Reconnection state
  private sportsReconnectAttempts = 0;
  private marketReconnectAttempts = 0;
  private sportsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private marketReconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // Heartbeat
  private sportsPingInterval: ReturnType<typeof setInterval> | null = null;
  private marketPingInterval: ReturnType<typeof setInterval> | null = null;

  // AppState subscription
  private appStateSubscription: { remove: () => void } | null = null;

  private constructor() {
    this.setupAppStateListener();
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // For testing - reset singleton
  static resetInstance(): void {
    if (WebSocketManager.instance) {
      WebSocketManager.instance.cleanup();
      WebSocketManager.instance = null as any;
    }
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      this.reconnectAll();
    } else if (nextAppState === 'background') {
      this.disconnectAll();
    }
  };

  // ==================== GAME SUBSCRIPTIONS ====================

  subscribeToGame(gameId: string, callback: GameUpdateCallback): () => void {
    // Add to subscription registry
    if (!this.gameSubscriptions.has(gameId)) {
      this.gameSubscriptions.set(gameId, new Set());
    }
    this.gameSubscriptions.get(gameId)!.add(callback);

    // Connect if not connected
    this.ensureSportsConnection();

    // Return unsubscribe function
    return () => {
      const callbacks = this.gameSubscriptions.get(gameId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.gameSubscriptions.delete(gameId);
        }
      }

      // Disconnect if no more subscriptions
      if (this.gameSubscriptions.size === 0) {
        this.disconnectSports();
      }
    };
  }

  private ensureSportsConnection(): void {
    if (this.sportsWs?.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.sportsWs?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.connectSports();
  }

  private connectSports(): void {
    this.cleanupSportsConnection();

    try {
      this.sportsWs = new WebSocket(SPORTS_WS_URL);

      this.sportsWs.onopen = () => {
        this.sportsReconnectAttempts = 0;
        this.startSportsPing();
      };

      this.sportsWs.onclose = () => {
        this.stopSportsPing();
        this.scheduleSportsReconnect();
      };

      this.sportsWs.onerror = () => {
        // Error will trigger onclose
      };

      this.sportsWs.onmessage = this.handleSportsMessage;
    } catch (error) {
      this.scheduleSportsReconnect();
    }
  }

  private handleSportsMessage = (event: WebSocketMessageEvent): void => {
    try {
      const data: SportsWebSocketEvent = JSON.parse(event.data);
      const gameId = String(data.gameId);

      const callbacks = this.gameSubscriptions.get(gameId);
      if (!callbacks || callbacks.size === 0) {
        return;
      }

      const update: GameUpdate = {
        gameId,
        score: data.score,
        elapsed: data.elapsed,
        period: data.period,
        status: this.deriveGameStatus(data),
        turn: data.turn,
      };

      callbacks.forEach((callback) => callback(update));
    } catch {
      // Ignore parse errors
    }
  };

  private deriveGameStatus(event: SportsWebSocketEvent): PredictGameStatus {
    if (event.ended) return 'ended';
    if (event.live) return 'ongoing';
    return 'scheduled';
  }

  private scheduleSportsReconnect(): void {
    if (this.gameSubscriptions.size === 0) {
      return;
    }

    if (this.sportsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    this.sportsReconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.sportsReconnectAttempts;

    this.sportsReconnectTimeout = setTimeout(() => {
      this.connectSports();
    }, delay);
  }

  private startSportsPing(): void {
    this.sportsPingInterval = setInterval(() => {
      if (this.sportsWs?.readyState === WebSocket.OPEN) {
        this.sportsWs.send('PING');
      }
    }, PING_INTERVAL_MS);
  }

  private stopSportsPing(): void {
    if (this.sportsPingInterval) {
      clearInterval(this.sportsPingInterval);
      this.sportsPingInterval = null;
    }
  }

  private cleanupSportsConnection(): void {
    this.stopSportsPing();

    if (this.sportsReconnectTimeout) {
      clearTimeout(this.sportsReconnectTimeout);
      this.sportsReconnectTimeout = null;
    }

    if (this.sportsWs) {
      this.sportsWs.onopen = null;
      this.sportsWs.onclose = null;
      this.sportsWs.onerror = null;
      this.sportsWs.onmessage = null;

      if (
        this.sportsWs.readyState === WebSocket.OPEN ||
        this.sportsWs.readyState === WebSocket.CONNECTING
      ) {
        this.sportsWs.close();
      }
      this.sportsWs = null;
    }
  }

  private disconnectSports(): void {
    this.cleanupSportsConnection();
    this.sportsReconnectAttempts = 0;
  }

  // ==================== PRICE SUBSCRIPTIONS ====================

  subscribeToMarketPrices(
    tokenIds: string[],
    callback: PriceUpdateCallback,
  ): () => void {
    const subscriptionKey = tokenIds.sort().join(',');

    // Add to subscription registry
    if (!this.priceSubscriptions.has(subscriptionKey)) {
      this.priceSubscriptions.set(subscriptionKey, new Set());
    }
    this.priceSubscriptions.get(subscriptionKey)!.add(callback);

    // Connect and subscribe
    this.ensureMarketConnection(tokenIds);

    // Return unsubscribe function
    return () => {
      const callbacks = this.priceSubscriptions.get(subscriptionKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.priceSubscriptions.delete(subscriptionKey);
          this.sendMarketUnsubscribe(tokenIds);
        }
      }

      // Disconnect if no more subscriptions
      if (this.priceSubscriptions.size === 0) {
        this.disconnectMarket();
      }
    };
  }

  private ensureMarketConnection(tokenIds: string[]): void {
    if (this.marketWs?.readyState === WebSocket.OPEN) {
      this.sendMarketSubscribe(tokenIds);
      return;
    }
    if (this.marketWs?.readyState === WebSocket.CONNECTING) {
      // Will subscribe after connection opens
      return;
    }

    this.connectMarket();
  }

  private connectMarket(): void {
    this.cleanupMarketConnection();

    try {
      this.marketWs = new WebSocket(MARKET_WS_URL);

      this.marketWs.onopen = () => {
        this.marketReconnectAttempts = 0;
        this.startMarketPing();
        this.resubscribeAllMarkets();
      };

      this.marketWs.onclose = () => {
        this.stopMarketPing();
        this.scheduleMarketReconnect();
      };

      this.marketWs.onerror = () => {
        // Error will trigger onclose
      };

      this.marketWs.onmessage = this.handleMarketMessage;
    } catch (error) {
      this.scheduleMarketReconnect();
    }
  }

  private handleMarketMessage = (event: WebSocketMessageEvent): void => {
    try {
      const data: MarketWebSocketEvent = JSON.parse(event.data);

      if (data.event_type !== 'price_change' || !data.price_changes) {
        return;
      }

      const updates: PriceUpdate[] = data.price_changes.map((change) => ({
        tokenId: change.asset_id,
        price: parseFloat(change.best_ask) || 0,
        bestBid: parseFloat(change.best_bid) || 0,
        bestAsk: parseFloat(change.best_ask) || 0,
      }));

      // Notify all subscribers that might be interested
      this.priceSubscriptions.forEach((callbacks, key) => {
        const subscribedTokenIds = new Set(key.split(','));
        const relevantUpdates = updates.filter((u) =>
          subscribedTokenIds.has(u.tokenId),
        );

        if (relevantUpdates.length > 0) {
          callbacks.forEach((callback) => callback(relevantUpdates));
        }
      });
    } catch {
      // Ignore parse errors
    }
  };

  private sendMarketSubscribe(tokenIds: string[]): void {
    if (this.marketWs?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.marketWs.send(
      JSON.stringify({
        type: 'market',
        assets_ids: tokenIds,
      }),
    );
  }

  private sendMarketUnsubscribe(tokenIds: string[]): void {
    if (this.marketWs?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.marketWs.send(
      JSON.stringify({
        operation: 'unsubscribe',
        assets_ids: tokenIds,
      }),
    );
  }

  private resubscribeAllMarkets(): void {
    const allTokenIds = new Set<string>();
    this.priceSubscriptions.forEach((_, key) => {
      key.split(',').forEach((id) => allTokenIds.add(id));
    });

    if (allTokenIds.size > 0) {
      this.sendMarketSubscribe(Array.from(allTokenIds));
    }
  }

  private scheduleMarketReconnect(): void {
    if (this.priceSubscriptions.size === 0) {
      return;
    }

    if (this.marketReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    this.marketReconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.marketReconnectAttempts;

    this.marketReconnectTimeout = setTimeout(() => {
      this.connectMarket();
    }, delay);
  }

  private startMarketPing(): void {
    this.marketPingInterval = setInterval(() => {
      if (this.marketWs?.readyState === WebSocket.OPEN) {
        this.marketWs.send('PING');
      }
    }, PING_INTERVAL_MS);
  }

  private stopMarketPing(): void {
    if (this.marketPingInterval) {
      clearInterval(this.marketPingInterval);
      this.marketPingInterval = null;
    }
  }

  private cleanupMarketConnection(): void {
    this.stopMarketPing();

    if (this.marketReconnectTimeout) {
      clearTimeout(this.marketReconnectTimeout);
      this.marketReconnectTimeout = null;
    }

    if (this.marketWs) {
      this.marketWs.onopen = null;
      this.marketWs.onclose = null;
      this.marketWs.onerror = null;
      this.marketWs.onmessage = null;

      if (
        this.marketWs.readyState === WebSocket.OPEN ||
        this.marketWs.readyState === WebSocket.CONNECTING
      ) {
        this.marketWs.close();
      }
      this.marketWs = null;
    }
  }

  private disconnectMarket(): void {
    this.cleanupMarketConnection();
    this.marketReconnectAttempts = 0;
  }

  // ==================== LIFECYCLE ====================

  private reconnectAll(): void {
    this.sportsReconnectAttempts = 0;
    this.marketReconnectAttempts = 0;

    if (this.gameSubscriptions.size > 0) {
      this.connectSports();
    }
    if (this.priceSubscriptions.size > 0) {
      this.connectMarket();
    }
  }

  private disconnectAll(): void {
    this.disconnectSports();
    this.disconnectMarket();
  }

  cleanup(): void {
    this.disconnectAll();
    this.gameSubscriptions.clear();
    this.priceSubscriptions.clear();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  // ==================== DEBUG ====================

  getConnectionStatus(): {
    sportsConnected: boolean;
    marketConnected: boolean;
    gameSubscriptionCount: number;
    priceSubscriptionCount: number;
  } {
    return {
      sportsConnected: this.sportsWs?.readyState === WebSocket.OPEN,
      marketConnected: this.marketWs?.readyState === WebSocket.OPEN,
      gameSubscriptionCount: this.gameSubscriptions.size,
      priceSubscriptionCount: this.priceSubscriptions.size,
    };
  }
}
```

### 2. GameCache Class

Create `app/components/UI/Predict/providers/polymarket/GameCache.ts`:

```typescript
import { GameUpdate, PredictMarket } from '../../types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run cleanup every minute

interface CacheEntry {
  data: GameUpdate;
  lastUpdate: number;
}

export class GameCache {
  private static instance: GameCache;
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): GameCache {
    if (!GameCache.instance) {
      GameCache.instance = new GameCache();
    }
    return GameCache.instance;
  }

  // For testing - reset singleton
  static resetInstance(): void {
    if (GameCache.instance) {
      GameCache.instance.cleanup();
      GameCache.instance = null as any;
    }
  }

  /**
   * Update cache with latest game data from WebSocket.
   * Called by WebSocketManager when game update is received.
   */
  updateGame(gameId: string, update: GameUpdate): void {
    this.cache.set(gameId, {
      data: update,
      lastUpdate: Date.now(),
    });
  }

  /**
   * Get cached game data if available and not stale.
   */
  getGame(gameId: string): GameUpdate | null {
    const entry = this.cache.get(gameId);
    if (!entry) return null;

    // Check if stale
    if (Date.now() - entry.lastUpdate > CACHE_TTL_MS) {
      this.cache.delete(gameId);
      return null;
    }

    return entry.data;
  }

  /**
   * Overlay cached game data onto a market object.
   * Returns a new market object with live data merged in.
   */
  overlayOnMarket(market: PredictMarket): PredictMarket {
    if (!market.game) return market;

    const cachedUpdate = this.getGame(market.game.id);
    if (!cachedUpdate) return market;

    // Merge cached data onto market.game
    return {
      ...market,
      game: {
        ...market.game,
        score: cachedUpdate.score,
        elapsed: cachedUpdate.elapsed,
        period: cachedUpdate.period,
        status: cachedUpdate.status,
        turn: cachedUpdate.turn,
      },
    };
  }

  /**
   * Overlay cached game data onto multiple markets.
   */
  overlayOnMarkets(markets: PredictMarket[]): PredictMarket[] {
    return markets.map((m) => this.overlayOnMarket(m));
  }

  /**
   * Remove entries that haven't received updates in TTL period.
   */
  pruneStaleEntries(): void {
    const now = Date.now();
    for (const [gameId, entry] of this.cache.entries()) {
      if (now - entry.lastUpdate > CACHE_TTL_MS) {
        this.cache.delete(gameId);
      }
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.pruneStaleEntries();
    }, CLEANUP_INTERVAL_MS);
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  // Debug helpers
  getCacheSize(): number {
    return this.cache.size;
  }

  getCachedGameIds(): string[] {
    return Array.from(this.cache.keys());
  }
}
```

### 3. Integration with WebSocketManager

Update WebSocketManager to feed game updates into GameCache:

```typescript
// In WebSocketManager.ts handleSportsMessage method

private handleSportsMessage = (event: WebSocketMessageEvent): void => {
  try {
    const data: SportsWebSocketEvent = JSON.parse(event.data);
    const gameId = String(data.gameId);

    const update: GameUpdate = {
      gameId,
      score: data.score,
      elapsed: data.elapsed,
      period: data.period,
      status: this.deriveGameStatus(data),
      turn: data.turn,
    };

    // Update cache (for feed overlay)
    GameCache.getInstance().updateGame(gameId, update);

    // Notify subscribers
    const callbacks = this.gameSubscriptions.get(gameId);
    if (callbacks && callbacks.size > 0) {
      callbacks.forEach((callback) => callback(update));
    }
  } catch {
    // Ignore parse errors
  }
};
```

### 4. Integration with PolymarketProvider

Update the provider to use GameCache:

```typescript
// In PolymarketProvider.ts

import { GameCache } from './GameCache';

class PolymarketProvider implements IPredictProvider {
  private gameCache = GameCache.getInstance();

  async getMarkets(params: GetMarketsParams): Promise<PredictMarket[]> {
    const markets = await this.api.getMarkets(params);
    return this.gameCache.overlayOnMarkets(markets);
  }

  async getMarket(id: string): Promise<PredictMarket> {
    const market = await this.api.getMarket(id);
    return this.gameCache.overlayOnMarket(market);
  }
}
```

### 5. Export from Provider

Update `app/components/UI/Predict/providers/polymarket/index.ts` to export the WebSocketManager and GameCache.

### 3. Unit Tests

Create `app/components/UI/Predict/providers/polymarket/WebSocketManager.test.ts`:

```typescript
import { WebSocketManager } from './WebSocketManager';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });
}

global.WebSocket = MockWebSocket as any;

describe('WebSocketManager', () => {
  beforeEach(() => {
    WebSocketManager.resetInstance();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = WebSocketManager.getInstance();
      const instance2 = WebSocketManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('game subscriptions', () => {
    it('connects to sports WS when first subscription is made', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);

      expect(manager.getConnectionStatus().gameSubscriptionCount).toBe(1);
    });

    it('calls callback when game update is received', async () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);

      // Wait for connection
      await jest.runAllTimersAsync();

      // Simulate message
      const mockEvent = {
        data: JSON.stringify({
          gameId: 123,
          score: '21-14',
          elapsed: '12:34',
          period: 'Q2',
          live: true,
          ended: false,
        }),
      };

      // Get the WebSocket instance and trigger message
      // (implementation detail - may need adjustment)
    });

    it('unsubscribes correctly and disconnects when no subscriptions remain', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToGame('123', callback);
      expect(manager.getConnectionStatus().gameSubscriptionCount).toBe(1);

      unsubscribe();
      expect(manager.getConnectionStatus().gameSubscriptionCount).toBe(0);
    });
  });

  describe('price subscriptions', () => {
    it('connects to market WS when first subscription is made', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToMarketPrices(['token1', 'token2'], callback);

      expect(manager.getConnectionStatus().priceSubscriptionCount).toBe(1);
    });
  });
});
```

**`app/components/UI/Predict/providers/polymarket/GameCache.test.ts`:**

```typescript
import { GameCache } from './GameCache';

describe('GameCache', () => {
  beforeEach(() => {
    GameCache.resetInstance();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = GameCache.getInstance();
      const instance2 = GameCache.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('updateGame', () => {
    it('stores game update in cache', () => {
      const cache = GameCache.getInstance();
      const update = {
        gameId: '123',
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        status: 'ongoing' as const,
      };

      cache.updateGame('123', update);

      expect(cache.getGame('123')).toEqual(update);
    });
  });

  describe('getGame', () => {
    it('returns null for non-existent game', () => {
      const cache = GameCache.getInstance();
      expect(cache.getGame('nonexistent')).toBeNull();
    });

    it('returns null for stale entries', () => {
      const cache = GameCache.getInstance();
      const update = {
        gameId: '123',
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        status: 'ongoing' as const,
      };

      cache.updateGame('123', update);

      // Advance time past TTL (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);

      expect(cache.getGame('123')).toBeNull();
    });
  });

  describe('overlayOnMarket', () => {
    it('returns market unchanged if no game', () => {
      const cache = GameCache.getInstance();
      const market = { id: 'market1', title: 'Test' } as any;

      const result = cache.overlayOnMarket(market);

      expect(result).toEqual(market);
    });

    it('returns market unchanged if no cached data', () => {
      const cache = GameCache.getInstance();
      const market = {
        id: 'market1',
        game: { id: 'game1', score: '0-0' },
      } as any;

      const result = cache.overlayOnMarket(market);

      expect(result.game.score).toBe('0-0');
    });

    it('merges cached data onto market', () => {
      const cache = GameCache.getInstance();

      cache.updateGame('game1', {
        gameId: 'game1',
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        status: 'ongoing',
      });

      const market = {
        id: 'market1',
        game: { id: 'game1', score: '0-0', period: 'NS' },
      } as any;

      const result = cache.overlayOnMarket(market);

      expect(result.game.score).toBe('21-14');
      expect(result.game.period).toBe('Q2');
      expect(result.game.elapsed).toBe('12:34');
    });
  });

  describe('pruneStaleEntries', () => {
    it('removes entries older than TTL', () => {
      const cache = GameCache.getInstance();

      cache.updateGame('game1', {
        gameId: 'game1',
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        status: 'ongoing',
      });

      expect(cache.getCacheSize()).toBe(1);

      // Advance past TTL
      jest.advanceTimersByTime(6 * 60 * 1000);
      cache.pruneStaleEntries();

      expect(cache.getCacheSize()).toBe(0);
    });
  });
});
```

## Files to Create/Modify

| Action | File                                                                      |
| ------ | ------------------------------------------------------------------------- |
| Create | `app/components/UI/Predict/providers/polymarket/WebSocketManager.ts`      |
| Create | `app/components/UI/Predict/providers/polymarket/WebSocketManager.test.ts` |
| Create | `app/components/UI/Predict/providers/polymarket/GameCache.ts`             |
| Create | `app/components/UI/Predict/providers/polymarket/GameCache.test.ts`        |
| Modify | `app/components/UI/Predict/providers/polymarket/index.ts`                 |
| Modify | `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`    |

## Acceptance Criteria

- [ ] Singleton WebSocketManager class implemented
- [ ] Game subscription/unsubscription works correctly
- [ ] Price subscription/unsubscription works correctly
- [ ] Reconnection with exponential backoff implemented
- [ ] AppState awareness (background/foreground) works
- [ ] Reference counting disconnects when no subscribers
- [ ] **GameCache caches game updates from WebSocket**
- [ ] **GameCache overlays data onto getMarkets/getMarket responses**
- [ ] **GameCache prunes stale entries (5 min TTL)**
- [ ] All unit tests pass
- [ ] No memory leaks (proper cleanup)

## Estimated Effort

6-8 hours

## Assignee

Developer A (Infrastructure Track)
