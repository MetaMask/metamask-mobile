import { AppState, AppStateStatus } from 'react-native';
import {
  CryptoPriceUpdate,
  CryptoPriceUpdateCallback,
  GameUpdate,
  PredictGamePeriod,
  PredictGameStatus,
  PriceUpdate,
} from '../../types';
import { PREDICT_CONSTANTS } from '../../constants/errors';
import { GameCache } from './GameCache';
import { POLYMARKET_PROVIDER_ID } from './constants';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../../util/Logger';
import { trace, endTrace, TraceName } from '../../../../../util/trace';

type WebSocketChannel = 'sports' | 'market' | 'rtds';

const SPORTS_WS_URL = 'wss://sports-api.polymarket.com/ws';
const MARKET_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL_MS = 50000;

const RTDS_WS_URL = 'wss://ws-live-data.polymarket.com';
const RTDS_CRYPTO_PRICES_CHAINLINK_TOPIC = 'crypto_prices_chainlink';
const RTDS_PING_INTERVAL_MS = 5000;
const DEFAULT_THROTTLE_INTERVAL_MS = 16;

const HEARTBEAT_CHECK_INTERVAL_MS = 5000;
const MARKET_STALE_THRESHOLD_MS = 60000;
const RTDS_STALE_THRESHOLD_MS = 15000;

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
  private marketPriceCache: Map<string, PriceUpdate> = new Map();

  private sportsReconnectAttempts = 0;
  private marketReconnectAttempts = 0;
  private sportsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private marketReconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private sportsPingInterval: ReturnType<typeof setInterval> | null = null;
  private marketPingInterval: ReturnType<typeof setInterval> | null = null;

  private marketLastMessageAt = 0;
  private marketHeartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private rtdsWs: WebSocket | null = null;
  private cryptoPriceSubscriptions: Map<
    string,
    Set<CryptoPriceUpdateCallback>
  > = new Map();
  private rtdsReconnectAttempts = 0;
  private rtdsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private rtdsPingInterval: ReturnType<typeof setInterval> | null = null;
  private rtdsLastMessageAt = 0;
  private rtdsHeartbeatInterval: ReturnType<typeof setInterval> | null = null;
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

  private getErrorContext(
    method: string,
    channel: WebSocketChannel,
    extra?: Record<string, unknown>,
  ): LoggerErrorOptions {
    return {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        provider: POLYMARKET_PROVIDER_ID,
        channel,
      },
      context: {
        name: 'WebSocketManager',
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

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
        DevLogger.log('WebSocketManager: sports WebSocket onerror fired');
        Logger.error(
          new Error('WebSocketManager: sports WebSocket onerror'),
          this.getErrorContext('onerror', 'sports', {
            reconnectAttempts: this.sportsReconnectAttempts,
          }),
        );
      };

      this.sportsWs.onmessage = this.handleSportsMessage;
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to connect to sports WebSocket', {
        error,
      });
      Logger.error(
        this.toError(error),
        this.getErrorContext('connectSports', 'sports', {
          reconnectAttempts: this.sportsReconnectAttempts,
        }),
      );
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
      Logger.error(
        this.toError(error),
        this.getErrorContext('handleSportsMessage', 'sports'),
      );
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

    if (this.sportsReconnectTimeout) {
      return;
    }

    const attemptNumber = this.sportsReconnectAttempts + 1;
    const delay = RECONNECT_DELAY_MS * attemptNumber;

    this.sportsReconnectTimeout = setTimeout(() => {
      this.sportsReconnectTimeout = null;
      this.sportsReconnectAttempts++;
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

    const cachedUpdates: PriceUpdate[] = [];
    tokenIds.forEach((tokenId) => {
      const cached = this.marketPriceCache.get(tokenId);
      if (cached) {
        cachedUpdates.push(cached);
      }
    });
    if (cachedUpdates.length > 0) {
      try {
        callback(cachedUpdates);
      } catch (error) {
        DevLogger.log(
          'WebSocketManager: Market price subscriber failed on cached snapshot delivery',
          {
            error,
            subscriptionKey,
          },
        );
        Logger.error(
          this.toError(error),
          this.getErrorContext('subscribeToMarketPrices', 'market', {
            subscriptionKey,
            snapshotSize: cachedUpdates.length,
          }),
        );
      }
    }

    return () => {
      const subscriptionCallbacks =
        this.priceSubscriptions.get(subscriptionKey);
      if (subscriptionCallbacks) {
        subscriptionCallbacks.delete(callback);
        if (subscriptionCallbacks.size === 0) {
          this.priceSubscriptions.delete(subscriptionKey);
          const remainingTokenIds = this.getSubscribedMarketTokenIds();
          const tokenIdsToUnsubscribe = tokenIds.filter(
            (tokenId) => !remainingTokenIds.has(tokenId),
          );
          if (tokenIdsToUnsubscribe.length > 0) {
            this.sendMarketUnsubscribe(tokenIdsToUnsubscribe);
          }
        }
      }

      if (this.priceSubscriptions.size === 0) {
        this.disconnectMarket();
      }
    };
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
        this.startMarketHeartbeat();
        this.resubscribeAllMarkets();
      };

      this.marketWs.onclose = () => {
        this.stopMarketPing();
        this.stopMarketHeartbeat();
        this.scheduleMarketReconnect();
      };

      this.marketWs.onerror = () => {
        DevLogger.log('WebSocketManager: market WebSocket onerror fired');
        Logger.error(
          new Error('WebSocketManager: market WebSocket onerror'),
          this.getErrorContext('onerror', 'market', {
            reconnectAttempts: this.marketReconnectAttempts,
          }),
        );
      };

      this.marketWs.onmessage = this.handleMarketMessage;
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to connect to market WebSocket', {
        error,
      });
      Logger.error(
        this.toError(error),
        this.getErrorContext('connectMarket', 'market', {
          reconnectAttempts: this.marketReconnectAttempts,
        }),
      );
      this.scheduleMarketReconnect();
    }
  }

  private handleMarketMessage = (event: WebSocketMessageEvent): void => {
    this.marketLastMessageAt = Date.now();

    try {
      const data: MarketWebSocketEvent = JSON.parse(event.data);

      if (data.event_type !== 'price_change' || !data.price_changes) {
        return;
      }

      const updates: PriceUpdate[] = data.price_changes.map((change) => ({
        tokenId: change.asset_id,
        price: parseFloat(change.price) || 0,
        bestBid: parseFloat(change.best_bid) || 0,
        bestAsk: parseFloat(change.best_ask) || 0,
      }));

      updates.forEach((update) => {
        this.marketPriceCache.set(update.tokenId, update);
      });

      this.priceSubscriptions.forEach((callbacks, key) => {
        const subscribedTokenIds = new Set(key.split(','));
        const relevantUpdates = updates.filter((u) =>
          subscribedTokenIds.has(u.tokenId),
        );

        if (relevantUpdates.length > 0) {
          callbacks.forEach((callback) => {
            try {
              callback(relevantUpdates);
            } catch (error) {
              DevLogger.log(
                'WebSocketManager: Market price subscriber failed',
                {
                  error,
                  subscriptionKey: key,
                },
              );
              Logger.error(
                this.toError(error),
                this.getErrorContext('handleMarketMessage', 'market', {
                  subscriptionKey: key,
                }),
              );
            }
          });
        }
      });
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to parse market message', {
        error,
      });
      Logger.error(
        this.toError(error),
        this.getErrorContext('handleMarketMessage', 'market'),
      );
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

    if (this.marketReconnectTimeout) {
      return;
    }

    const attemptNumber = this.marketReconnectAttempts + 1;
    const delay = RECONNECT_DELAY_MS * attemptNumber;

    this.marketReconnectTimeout = setTimeout(() => {
      this.marketReconnectTimeout = null;
      this.marketReconnectAttempts++;
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

  private startMarketHeartbeat(): void {
    this.marketLastMessageAt = Date.now();
    this.marketHeartbeatInterval = setInterval(() => {
      if (this.marketWs?.readyState !== WebSocket.OPEN) {
        return;
      }
      const sinceLast = Date.now() - this.marketLastMessageAt;
      if (sinceLast > MARKET_STALE_THRESHOLD_MS) {
        DevLogger.log(
          'WebSocketManager: market WebSocket stale, forcing reconnect',
          { sinceLast, threshold: MARKET_STALE_THRESHOLD_MS },
        );
        Logger.error(
          new Error('WebSocketManager: market WebSocket heartbeat timeout'),
          this.getErrorContext('marketHeartbeat', 'market', {
            sinceLastMessageMs: sinceLast,
            thresholdMs: MARKET_STALE_THRESHOLD_MS,
          }),
        );
        this.marketWs.close();
      }
    }, HEARTBEAT_CHECK_INTERVAL_MS);
  }

  private stopMarketHeartbeat(): void {
    if (this.marketHeartbeatInterval) {
      clearInterval(this.marketHeartbeatInterval);
      this.marketHeartbeatInterval = null;
    }
  }

  private cleanupMarketConnection(): void {
    this.stopMarketPing();
    this.stopMarketHeartbeat();

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
    this.marketPriceCache.clear();
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
        this.startRtdsHeartbeat();
        this.resubscribeAllRtds();
      };

      this.rtdsWs.onclose = () => {
        this.stopRtdsPing();
        this.stopRtdsHeartbeat();
        this.scheduleRtdsReconnect();
      };

      this.rtdsWs.onerror = () => {
        DevLogger.log('WebSocketManager: RTDS WebSocket onerror fired');
        Logger.error(
          new Error('WebSocketManager: RTDS WebSocket onerror'),
          this.getErrorContext('onerror', 'rtds', {
            reconnectAttempts: this.rtdsReconnectAttempts,
          }),
        );
      };

      this.rtdsWs.onmessage = this.handleRtdsMessage;
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to connect to RTDS WebSocket', {
        error,
      });
      Logger.error(
        this.toError(error),
        this.getErrorContext('connectRtds', 'rtds', {
          reconnectAttempts: this.rtdsReconnectAttempts,
        }),
      );
      this.scheduleRtdsReconnect();
    }
  }

  private handleRtdsMessage = (event: WebSocketMessageEvent): void => {
    this.rtdsLastMessageAt = Date.now();

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
      Logger.error(
        this.toError(error),
        this.getErrorContext('handleRtdsMessage', 'rtds'),
      );
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
                Logger.error(
                  this.toError(error),
                  this.getErrorContext('flushCryptoPriceBuffer', 'rtds', {
                    symbol,
                  }),
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

    if (this.rtdsReconnectTimeout) {
      return;
    }

    const attemptNumber = this.rtdsReconnectAttempts + 1;
    const delay = RECONNECT_DELAY_MS * attemptNumber;

    this.rtdsReconnectTimeout = setTimeout(() => {
      this.rtdsReconnectTimeout = null;
      this.rtdsReconnectAttempts++;
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

  private startRtdsHeartbeat(): void {
    this.rtdsLastMessageAt = Date.now();
    this.rtdsHeartbeatInterval = setInterval(() => {
      if (this.rtdsWs?.readyState !== WebSocket.OPEN) {
        return;
      }
      const sinceLast = Date.now() - this.rtdsLastMessageAt;
      if (sinceLast > RTDS_STALE_THRESHOLD_MS) {
        DevLogger.log(
          'WebSocketManager: RTDS WebSocket stale, forcing reconnect',
          { sinceLast, threshold: RTDS_STALE_THRESHOLD_MS },
        );
        Logger.error(
          new Error('WebSocketManager: RTDS WebSocket heartbeat timeout'),
          this.getErrorContext('rtdsHeartbeat', 'rtds', {
            sinceLastMessageMs: sinceLast,
            thresholdMs: RTDS_STALE_THRESHOLD_MS,
          }),
        );
        this.rtdsWs.close();
      }
    }, HEARTBEAT_CHECK_INTERVAL_MS);
  }

  private stopRtdsHeartbeat(): void {
    if (this.rtdsHeartbeatInterval) {
      clearInterval(this.rtdsHeartbeatInterval);
      this.rtdsHeartbeatInterval = null;
    }
  }

  private cleanupRtdsConnection(): void {
    this.stopRtdsPing();
    this.stopRtdsHeartbeat();

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
    if (this.priceSubscriptions.size > 0) {
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
    this.marketPriceCache.clear();

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
  } {
    return {
      sportsConnected: this.sportsWs?.readyState === WebSocket.OPEN,
      marketConnected: this.marketWs?.readyState === WebSocket.OPEN,
      rtdsConnected: this.rtdsWs?.readyState === WebSocket.OPEN,
      gameSubscriptionCount: this.gameSubscriptions.size,
      priceSubscriptionCount: this.priceSubscriptions.size,
      cryptoPriceSubscriptionCount: this.cryptoPriceSubscriptions.size,
    };
  }
}
