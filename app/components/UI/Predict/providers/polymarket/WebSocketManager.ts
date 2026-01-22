import { AppState, AppStateStatus } from 'react-native';
import {
  GameUpdate,
  PredictGamePeriod,
  PredictGameStatus,
  PriceUpdate,
} from '../../types';
import { GameCache } from './GameCache';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

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
  private static instance: WebSocketManager | null = null;

  private sportsWs: WebSocket | null = null;
  private marketWs: WebSocket | null = null;

  private gameSubscriptions: Map<string, Set<GameUpdateCallback>> = new Map();
  private priceSubscriptions: Map<string, Set<PriceUpdateCallback>> = new Map();

  private sportsReconnectAttempts = 0;
  private marketReconnectAttempts = 0;
  private sportsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private marketReconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private sportsPingInterval: ReturnType<typeof setInterval> | null = null;
  private marketPingInterval: ReturnType<typeof setInterval> | null = null;

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

      const update: GameUpdate = {
        gameId,
        score: data.score,
        elapsed: data.elapsed,
        period: data.period as PredictGamePeriod,
        status: this.deriveGameStatus(data),
        turn: data.turn,
      };

      GameCache.getInstance().updateGame(gameId, update);

      const callbacks = this.gameSubscriptions.get(gameId);
      if (callbacks && callbacks.size > 0) {
        callbacks.forEach((callback) => callback(update));
      }
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
      const callbacks = this.priceSubscriptions.get(subscriptionKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.priceSubscriptions.delete(subscriptionKey);
          this.sendMarketUnsubscribe(tokenIds);
        }
      }

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
    } catch (error) {
      DevLogger.log('WebSocketManager: Failed to parse market message', {
        error,
      });
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
