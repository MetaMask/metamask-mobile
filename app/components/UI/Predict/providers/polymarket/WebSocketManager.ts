import { AppState, AppStateStatus } from 'react-native';
import {
  CryptoPriceUpdate,
  CryptoPriceUpdateCallback,
  GameUpdate,
  OrderbookCallback,
  OrderbookLevel,
  OrderbookSnapshot,
  PredictGamePeriod,
  PredictGameStatus,
  PriceUpdate,
} from '../../types';
import { GameCache } from './GameCache';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { trace, endTrace, TraceName } from '../../../../../util/trace';
import { OrderBook } from './types';

const SPORTS_WS_URL = 'wss://sports-api.polymarket.com/ws';
const MARKET_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL_MS = 50000;

const RTDS_WS_URL = 'wss://ws-live-data.polymarket.com';
const RTDS_CRYPTO_PRICES_CHAINLINK_TOPIC = 'crypto_prices_chainlink';
const RTDS_PING_INTERVAL_MS = 5000;
const DEFAULT_THROTTLE_INTERVAL_MS = 16;
const ORDERBOOK_EMIT_THROTTLE_MS = 250;

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
  asset_id?: string;
  bids?: { price: string; size: string }[];
  asks?: { price: string; size: string }[];
  price_changes?: {
    asset_id: string;
    price: string;
    best_bid: string;
    best_ask: string;
  }[];
  timestamp: string;
}

interface RtdsWebSocketEvent {
  topic: string;
  type: string;
  timestamp: number;
  payload?: {
    symbol?: string;
    timestamp?: number;
    value?: number;
    full_accuracy_value?: string;
    data?: {
      timestamp?: number;
      value?: number;
    }[];
  };
}

export class WebSocketManager {
  private static instance: WebSocketManager | null = null;

  private sportsWs: WebSocket | null = null;
  private marketWs: WebSocket | null = null;

  private gameSubscriptions: Map<string, Set<GameUpdateCallback>> = new Map();
  private priceSubscriptions: Map<string, Set<PriceUpdateCallback>> = new Map();
  private orderbookSubscriptions: Map<string, Set<OrderbookCallback>> =
    new Map();
  private orderbookState: Map<
    string,
    {
      bids: Map<string, number>;
      asks: Map<string, number>;
      timestamp: number;
    }
  > = new Map();
  private orderbookEmitTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();
  private orderbookPendingEmit: Set<string> = new Set();

  private sportsReconnectAttempts = 0;
  private marketReconnectAttempts = 0;
  private sportsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private marketReconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private sportsPingInterval: ReturnType<typeof setInterval> | null = null;
  private marketPingInterval: ReturnType<typeof setInterval> | null = null;

  private rtdsWs: WebSocket | null = null;
  private cryptoPriceSubscriptions: Map<
    string,
    Set<CryptoPriceUpdateCallback>
  > = new Map();
  private rtdsReconnectAttempts = 0;
  private rtdsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private rtdsPingInterval: ReturnType<typeof setInterval> | null = null;
  private cryptoPriceBuffer: Map<string, CryptoPriceUpdate> = new Map();
  private throttleTimer: ReturnType<typeof setInterval> | null = null;

  private appStateSubscription: { remove: () => void } | null = null;

  private constructor() {
    this.setupAppStateListener();
  }

  static getInstance(): WebSocketManager {
    WebSocketManager.instance ??= new WebSocketManager();
    return WebSocketManager.instance;
  }

  static resetInstance(): void {
    if (WebSocketManager.instance) {
      WebSocketManager.instance.cleanup();
      WebSocketManager.instance = null;
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

  subscribeToGame(gameId: string, callback: GameUpdateCallback): () => void {
    let callbacks = this.gameSubscriptions.get(gameId);
    if (!callbacks) {
      callbacks = new Set();
      this.gameSubscriptions.set(gameId, callbacks);
    }
    callbacks.add(callback);

    this.ensureSportsConnection();

    return () => {
      const _callbacks = this.gameSubscriptions.get(gameId);
      if (_callbacks) {
        _callbacks.delete(callback);
        if (_callbacks.size === 0) {
          this.gameSubscriptions.delete(gameId);
        }
      }

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
      DevLogger.log('WebSocketManager: Failed to connect to sports WebSocket', {
        error,
      });
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
        period: data.period as PredictGamePeriod,
        status: this.deriveGameStatus(data),
        turn: data.turn,
      };

      GameCache.getInstance().updateGame(gameId, update);
      callbacks.forEach((callback) => callback(update));
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to parse sports message', {
        error,
      });
    }
  };

  private deriveGameStatus(event: SportsWebSocketEvent): PredictGameStatus {
    if (event.ended) {
      return 'ended';
    }
    if (event.live) {
      return 'ongoing';
    }
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

  subscribeToMarketPrices(
    tokenIds: string[],
    callback: PriceUpdateCallback,
  ): () => void {
    const subscriptionKey = [...tokenIds]
      .sort((a, b) => a.localeCompare(b))
      .join(',');

    let callbacks = this.priceSubscriptions.get(subscriptionKey);
    if (!callbacks) {
      callbacks = new Set();
      this.priceSubscriptions.set(subscriptionKey, callbacks);
    }
    callbacks.add(callback);

    this.ensureMarketConnection(tokenIds);

    return () => {
      const subscriptionCallbacks =
        this.priceSubscriptions.get(subscriptionKey);
      if (subscriptionCallbacks) {
        subscriptionCallbacks.delete(callback);
        if (subscriptionCallbacks.size === 0) {
          this.priceSubscriptions.delete(subscriptionKey);
          const remainingPriceTokenIds = this.getSubscribedMarketTokenIds();
          const tokenIdsToUnsubscribe = tokenIds.filter(
            (tokenId) =>
              !remainingPriceTokenIds.has(tokenId) &&
              !this.orderbookSubscriptions.has(tokenId),
          );
          if (tokenIdsToUnsubscribe.length > 0) {
            this.sendMarketUnsubscribe(tokenIdsToUnsubscribe);
          }
        }
      }

      if (
        this.priceSubscriptions.size === 0 &&
        this.orderbookSubscriptions.size === 0
      ) {
        this.disconnectMarket();
      }
    };
  }

  subscribeToOrderbook(
    tokenId: string,
    callback: OrderbookCallback,
  ): () => void {
    let callbacks = this.orderbookSubscriptions.get(tokenId);
    if (!callbacks) {
      callbacks = new Set();
      this.orderbookSubscriptions.set(tokenId, callbacks);
    }
    callbacks.add(callback);

    this.ensureMarketConnection([tokenId]);

    // Replay cached snapshot to late subscribers so they render without waiting
    // for the next WS book event.
    const cached = this.orderbookState.get(tokenId);
    if (cached) {
      try {
        callback(this.buildOrderbookSnapshot(tokenId, cached));
      } catch (error) {
        DevLogger.log('WebSocketManager: Orderbook subscriber failed', {
          error,
          tokenId,
        });
      }
    }

    return () => {
      const subscriptionCallbacks = this.orderbookSubscriptions.get(tokenId);
      if (subscriptionCallbacks) {
        subscriptionCallbacks.delete(callback);
        if (subscriptionCallbacks.size === 0) {
          this.orderbookSubscriptions.delete(tokenId);
          this.orderbookState.delete(tokenId);
          this.orderbookPendingEmit.delete(tokenId);
          const pendingTimer = this.orderbookEmitTimers.get(tokenId);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            this.orderbookEmitTimers.delete(tokenId);
          }
          const remainingPriceTokenIds = this.getSubscribedMarketTokenIds();
          if (!remainingPriceTokenIds.has(tokenId)) {
            this.sendMarketUnsubscribe([tokenId]);
          }
        }
      }

      if (
        this.priceSubscriptions.size === 0 &&
        this.orderbookSubscriptions.size === 0
      ) {
        this.disconnectMarket();
      }
    };
  }

  /**
   * Seed the orderbook cache with a REST snapshot before WS book events arrive.
   * REST returns `bids` ascending and `asks` descending; the cached price/size
   * maps are unordered, and {@link buildOrderbookSnapshot} re-sorts on emit
   * (bids desc, asks asc). No-op if no subscriber is registered for the token
   * (handles the race where the consumer unsubscribed before REST resolved).
   */
  public seedOrderbookSnapshot(tokenId: string, book: OrderBook): void {
    if (!this.orderbookSubscriptions.has(tokenId)) {
      return;
    }

    const bids = new Map<string, number>();
    book.bids?.forEach((level) => {
      const size = parseFloat(level.size);
      if (Number.isFinite(size) && size > 0) {
        bids.set(level.price, size);
      }
    });
    const asks = new Map<string, number>();
    book.asks?.forEach((level) => {
      const size = parseFloat(level.size);
      if (Number.isFinite(size) && size > 0) {
        asks.set(level.price, size);
      }
    });

    this.orderbookState.set(tokenId, {
      bids,
      asks,
      timestamp: Date.now(),
    });

    this.emitOrderbookSnapshot(tokenId);
  }

  private buildOrderbookSnapshot(
    tokenId: string,
    cached: {
      bids: Map<string, number>;
      asks: Map<string, number>;
      timestamp: number;
    },
  ): OrderbookSnapshot {
    const bids: OrderbookLevel[] = [];
    cached.bids.forEach((size, price) => {
      const numericPrice = parseFloat(price);
      if (Number.isFinite(numericPrice)) {
        bids.push({ price: numericPrice, size });
      }
    });
    bids.sort((a, b) => b.price - a.price);

    const asks: OrderbookLevel[] = [];
    cached.asks.forEach((size, price) => {
      const numericPrice = parseFloat(price);
      if (Number.isFinite(numericPrice)) {
        asks.push({ price: numericPrice, size });
      }
    });
    asks.sort((a, b) => a.price - b.price);

    return {
      tokenId,
      bids,
      asks,
      timestamp: cached.timestamp,
    };
  }

  private emitOrderbookSnapshot(tokenId: string): void {
    const cached = this.orderbookState.get(tokenId);
    const callbacks = this.orderbookSubscriptions.get(tokenId);
    if (!cached || !callbacks || callbacks.size === 0) {
      return;
    }

    const snapshot = this.buildOrderbookSnapshot(tokenId, cached);
    callbacks.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (error) {
        DevLogger.log('WebSocketManager: Orderbook subscriber failed', {
          error,
          tokenId,
        });
      }
    });
  }

  private scheduleOrderbookEmit(tokenId: string): void {
    // Emit immediately if no timer is active (first emit per window is instant).
    if (!this.orderbookEmitTimers.has(tokenId)) {
      this.emitOrderbookSnapshot(tokenId);
      const timer = setTimeout(() => {
        this.orderbookEmitTimers.delete(tokenId);
        if (this.orderbookPendingEmit.delete(tokenId)) {
          this.emitOrderbookSnapshot(tokenId);
        }
      }, ORDERBOOK_EMIT_THROTTLE_MS);
      this.orderbookEmitTimers.set(tokenId, timer);
      return;
    }

    // A timer is already active; mark a trailing emit.
    this.orderbookPendingEmit.add(tokenId);
  }

  subscribeToCryptoPrices(
    symbols: string[],
    callback: CryptoPriceUpdateCallback,
  ): () => void {
    const subscriptionKey = [...symbols]
      .sort((a, b) => a.localeCompare(b))
      .join(',');

    let callbacks = this.cryptoPriceSubscriptions.get(subscriptionKey);
    if (!callbacks) {
      callbacks = new Set();
      this.cryptoPriceSubscriptions.set(subscriptionKey, callbacks);
    }
    callbacks.add(callback);

    this.ensureRtdsConnection(symbols);

    return () => {
      const _callbacks = this.cryptoPriceSubscriptions.get(subscriptionKey);
      if (_callbacks) {
        _callbacks.delete(callback);
        if (_callbacks.size === 0) {
          this.cryptoPriceSubscriptions.delete(subscriptionKey);
          const remainingSymbols = this.getSubscribedCryptoSymbols();
          const symbolsToUnsubscribe = symbols.filter(
            (symbol) => !remainingSymbols.has(symbol),
          );
          if (symbolsToUnsubscribe.length > 0) {
            this.sendRtdsUnsubscribe(new Set(symbolsToUnsubscribe));
          }
        }
      }

      if (this.cryptoPriceSubscriptions.size === 0) {
        this.disconnectRtds();
      }
    };
  }

  private ensureMarketConnection(tokenIds: string[]): void {
    if (this.marketWs?.readyState === WebSocket.OPEN) {
      this.sendMarketSubscribe(tokenIds);
      return;
    }
    if (this.marketWs?.readyState === WebSocket.CONNECTING) {
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
      DevLogger.log('WebSocketManager: Failed to connect to market WebSocket', {
        error,
      });
      this.scheduleMarketReconnect();
    }
  }

  private handleMarketMessage = (event: WebSocketMessageEvent): void => {
    try {
      const data: MarketWebSocketEvent = JSON.parse(event.data);

      if (data.event_type === 'book' && data.asset_id) {
        this.handleBookEvent(data);
        return;
      }

      if (data.event_type !== 'price_change' || !data.price_changes) {
        return;
      }

      const updates: PriceUpdate[] = data.price_changes.map((change) => ({
        tokenId: change.asset_id,
        price: parseFloat(change.price) || 0,
        bestBid: parseFloat(change.best_bid) || 0,
        bestAsk: parseFloat(change.best_ask) || 0,
      }));

      this.priceSubscriptions.forEach((callbacks, key) => {
        const subscribedTokenIds = new Set(key.split(','));
        const relevantUpdates = updates.filter((u) =>
          subscribedTokenIds.has(u.tokenId),
        );

        if (relevantUpdates.length > 0) {
          callbacks.forEach((callback) => callback(relevantUpdates));
        }
      });

      // Opportunistic top-of-book update for active orderbook subscribers.
      // Polymarket's `price_change` payload does not include per-level
      // { side, price, size } records, so we splice best bid/ask into the
      // cached book to keep the chart responsive between full `book` snapshots.
      data.price_changes.forEach((change) => {
        if (!this.orderbookSubscriptions.has(change.asset_id)) {
          return;
        }
        const bestBid = parseFloat(change.best_bid);
        const bestAsk = parseFloat(change.best_ask);
        if (!Number.isFinite(bestBid) && !Number.isFinite(bestAsk)) {
          return;
        }
        this.applyTopOfBook(change.asset_id, bestBid, bestAsk);
        this.scheduleOrderbookEmit(change.asset_id);
      });
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to parse market message', {
        error,
      });
    }
  };

  private handleBookEvent(data: MarketWebSocketEvent): void {
    if (!data.asset_id) {
      return;
    }
    if (!this.orderbookSubscriptions.has(data.asset_id)) {
      return;
    }

    const bids = new Map<string, number>();
    data.bids?.forEach((level) => {
      const size = parseFloat(level.size);
      if (Number.isFinite(size) && size > 0) {
        bids.set(level.price, size);
      }
    });
    const asks = new Map<string, number>();
    data.asks?.forEach((level) => {
      const size = parseFloat(level.size);
      if (Number.isFinite(size) && size > 0) {
        asks.set(level.price, size);
      }
    });

    this.orderbookState.set(data.asset_id, {
      bids,
      asks,
      timestamp: Date.now(),
    });

    this.scheduleOrderbookEmit(data.asset_id);
  }

  private applyTopOfBook(
    tokenId: string,
    bestBid: number,
    bestAsk: number,
  ): void {
    const cached = this.orderbookState.get(tokenId);
    if (!cached) {
      // Without a seeded book we have no level sizes; wait for the next
      // `book` event or REST seed.
      return;
    }

    // Prune levels that are now crossed by the new spread.
    if (Number.isFinite(bestAsk) && bestAsk > 0) {
      cached.bids.forEach((_, priceKey) => {
        if (parseFloat(priceKey) >= bestAsk) {
          cached.bids.delete(priceKey);
        }
      });
    }
    if (Number.isFinite(bestBid) && bestBid > 0) {
      cached.asks.forEach((_, priceKey) => {
        if (parseFloat(priceKey) <= bestBid) {
          cached.asks.delete(priceKey);
        }
      });
    }
    cached.timestamp = Date.now();
  }

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

  private getSubscribedMarketTokenIds(): Set<string> {
    const subscribedTokenIds = new Set<string>();

    this.priceSubscriptions.forEach((_, key) => {
      key.split(',').forEach((tokenId) => {
        if (tokenId) {
          subscribedTokenIds.add(tokenId);
        }
      });
    });

    return subscribedTokenIds;
  }

  private resubscribeAllMarkets(): void {
    const allTokenIds = this.getSubscribedMarketTokenIds();
    this.orderbookSubscriptions.forEach((_, tokenId) => {
      allTokenIds.add(tokenId);
    });

    if (allTokenIds.size > 0) {
      this.sendMarketSubscribe(Array.from(allTokenIds));
    }
  }

  private scheduleMarketReconnect(): void {
    if (
      this.priceSubscriptions.size === 0 &&
      this.orderbookSubscriptions.size === 0
    ) {
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

  private ensureRtdsConnection(symbols?: string[]): void {
    if (this.rtdsWs?.readyState === WebSocket.OPEN) {
      this.sendRtdsSubscribe(
        new Set(symbols?.length ? symbols : this.getSubscribedCryptoSymbols()),
      );
      return;
    }
    if (this.rtdsWs?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.connectRtds();
  }

  private connectRtds(): void {
    this.cleanupRtdsConnection();

    try {
      this.rtdsWs = new WebSocket(RTDS_WS_URL);

      this.rtdsWs.onopen = () => {
        this.rtdsReconnectAttempts = 0;
        this.startRtdsPing();
        this.resubscribeAllRtds();
      };

      this.rtdsWs.onclose = () => {
        this.stopRtdsPing();
        this.scheduleRtdsReconnect();
      };

      this.rtdsWs.onerror = () => {
        // Error will trigger onclose
      };

      this.rtdsWs.onmessage = this.handleRtdsMessage;
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to connect to RTDS WebSocket', {
        error,
      });
      this.scheduleRtdsReconnect();
    }
  }

  private handleRtdsMessage = (event: WebSocketMessageEvent): void => {
    let traceStarted = false;

    try {
      if (event.data === 'pong' || event.data === '') {
        return;
      }

      const data: RtdsWebSocketEvent = JSON.parse(event.data);

      if (
        data.topic !== RTDS_CRYPTO_PRICES_CHAINLINK_TOPIC ||
        data.type !== 'update' ||
        !data.payload
      ) {
        return;
      }

      const { symbol, timestamp, value } = data.payload;
      if (
        typeof symbol !== 'string' ||
        typeof timestamp !== 'number' ||
        typeof value !== 'number'
      ) {
        return;
      }

      trace({ name: TraceName.CryptoUpDownWsMessage, op: 'rtds.message' });
      traceStarted = true;

      const update: CryptoPriceUpdate = {
        symbol,
        price: value,
        timestamp,
      };

      this.cryptoPriceBuffer.set(update.symbol, update);
      this.ensureThrottleTimer();
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to parse RTDS message', {
        error,
      });
    } finally {
      if (traceStarted) {
        endTrace({ name: TraceName.CryptoUpDownWsMessage });
      }
    }
  };

  private ensureThrottleTimer(): void {
    if (this.throttleTimer) {
      return;
    }

    this.throttleTimer = setInterval(() => {
      this.flushCryptoPriceBuffer();
    }, DEFAULT_THROTTLE_INTERVAL_MS);
  }

  private flushCryptoPriceBuffer(): void {
    if (this.cryptoPriceBuffer.size === 0) {
      if (this.throttleTimer) {
        clearInterval(this.throttleTimer);
        this.throttleTimer = null;
      }
      return;
    }

    let traceStarted = false;

    try {
      trace({ name: TraceName.CryptoUpDownBufferFlush, op: 'rtds.flush' });
      traceStarted = true;

      this.cryptoPriceSubscriptions.forEach((callbacks, key) => {
        const subscribedSymbols = new Set(key.split(','));

        this.cryptoPriceBuffer.forEach((update, symbol) => {
          if (subscribedSymbols.has(symbol)) {
            callbacks.forEach((callback) => {
              try {
                callback(update);
              } catch (error) {
                DevLogger.log(
                  'WebSocketManager: Crypto price subscriber failed',
                  {
                    error,
                    symbol,
                  },
                );
              }
            });
          }
        });
      });
    } finally {
      this.cryptoPriceBuffer.clear();
      if (traceStarted) {
        endTrace({ name: TraceName.CryptoUpDownBufferFlush });
      }
    }
  }

  private getSubscribedCryptoSymbols(): Set<string> {
    const allSymbols = new Set<string>();
    this.cryptoPriceSubscriptions.forEach((_, key) => {
      key.split(',').forEach((symbol) => {
        if (symbol) {
          allSymbols.add(symbol);
        }
      });
    });
    return allSymbols;
  }

  private getRtdsCryptoSubscriptions(symbols: Set<string>): {
    topic: string;
    type: string;
    filters: string;
  }[] {
    return Array.from(symbols)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((symbol) => ({
        topic: RTDS_CRYPTO_PRICES_CHAINLINK_TOPIC,
        type: 'update',
        filters: JSON.stringify({ symbol }),
      }));
  }

  private sendRtdsSubscribe(symbols: Set<string>): void {
    if (this.rtdsWs?.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscriptions = this.getRtdsCryptoSubscriptions(symbols);
    if (subscriptions.length === 0) {
      return;
    }

    const msg = JSON.stringify({
      action: 'subscribe',
      subscriptions,
    });
    this.rtdsWs.send(msg);
  }

  private sendRtdsUnsubscribe(symbols: Set<string>): void {
    if (this.rtdsWs?.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscriptions = this.getRtdsCryptoSubscriptions(symbols);
    if (subscriptions.length === 0) {
      return;
    }

    this.rtdsWs.send(
      JSON.stringify({
        action: 'unsubscribe',
        subscriptions,
      }),
    );
  }

  private resubscribeAllRtds(): void {
    const allSymbols = this.getSubscribedCryptoSymbols();

    if (allSymbols.size > 0) {
      this.sendRtdsSubscribe(allSymbols);
    }
  }

  private scheduleRtdsReconnect(): void {
    if (this.cryptoPriceSubscriptions.size === 0) {
      return;
    }

    if (this.rtdsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    this.rtdsReconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.rtdsReconnectAttempts;

    this.rtdsReconnectTimeout = setTimeout(() => {
      this.connectRtds();
    }, delay);
  }

  private startRtdsPing(): void {
    this.rtdsPingInterval = setInterval(() => {
      if (this.rtdsWs?.readyState === WebSocket.OPEN) {
        this.rtdsWs.send('ping');
      }
    }, RTDS_PING_INTERVAL_MS);
  }

  private stopRtdsPing(): void {
    if (this.rtdsPingInterval) {
      clearInterval(this.rtdsPingInterval);
      this.rtdsPingInterval = null;
    }
  }

  private cleanupRtdsConnection(): void {
    this.stopRtdsPing();

    if (this.throttleTimer) {
      clearInterval(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.cryptoPriceBuffer.clear();

    if (this.rtdsReconnectTimeout) {
      clearTimeout(this.rtdsReconnectTimeout);
      this.rtdsReconnectTimeout = null;
    }

    if (this.rtdsWs) {
      this.rtdsWs.onopen = null;
      this.rtdsWs.onclose = null;
      this.rtdsWs.onerror = null;
      this.rtdsWs.onmessage = null;

      if (
        this.rtdsWs.readyState === WebSocket.OPEN ||
        this.rtdsWs.readyState === WebSocket.CONNECTING
      ) {
        this.rtdsWs.close();
      }
      this.rtdsWs = null;
    }
  }

  private disconnectRtds(): void {
    this.cleanupRtdsConnection();
    this.rtdsReconnectAttempts = 0;
  }

  private reconnectAll(): void {
    this.sportsReconnectAttempts = 0;
    this.marketReconnectAttempts = 0;
    this.rtdsReconnectAttempts = 0;

    if (this.gameSubscriptions.size > 0) {
      this.connectSports();
    }
    if (
      this.priceSubscriptions.size > 0 ||
      this.orderbookSubscriptions.size > 0
    ) {
      this.connectMarket();
    }
    if (this.cryptoPriceSubscriptions.size > 0) {
      this.connectRtds();
    }
  }

  private disconnectAll(): void {
    this.disconnectSports();
    this.disconnectMarket();
    this.disconnectRtds();
  }

  cleanup(): void {
    this.disconnectAll();
    this.gameSubscriptions.clear();
    this.priceSubscriptions.clear();
    this.cryptoPriceSubscriptions.clear();
    this.orderbookSubscriptions.clear();
    this.orderbookState.clear();
    this.orderbookPendingEmit.clear();
    this.orderbookEmitTimers.forEach((timer) => clearTimeout(timer));
    this.orderbookEmitTimers.clear();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  getConnectionStatus(): {
    sportsConnected: boolean;
    marketConnected: boolean;
    rtdsConnected: boolean;
    gameSubscriptionCount: number;
    priceSubscriptionCount: number;
    cryptoPriceSubscriptionCount: number;
    orderbookSubscriptionCount: number;
  } {
    return {
      sportsConnected: this.sportsWs?.readyState === WebSocket.OPEN,
      marketConnected: this.marketWs?.readyState === WebSocket.OPEN,
      rtdsConnected: this.rtdsWs?.readyState === WebSocket.OPEN,
      gameSubscriptionCount: this.gameSubscriptions.size,
      priceSubscriptionCount: this.priceSubscriptions.size,
      cryptoPriceSubscriptionCount: this.cryptoPriceSubscriptions.size,
      orderbookSubscriptionCount: this.orderbookSubscriptions.size,
    };
  }
}
