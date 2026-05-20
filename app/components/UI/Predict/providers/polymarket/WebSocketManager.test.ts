import { AppState, AppStateStatus } from 'react-native';
import { endTrace, trace, TraceName } from '../../../../../util/trace';
import { GameCache } from './GameCache';
import { WebSocketManager } from './WebSocketManager';

jest.mock('./GameCache');
jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const mockGameCacheInstance = {
  updateGame: jest.fn(),
  getGame: jest.fn(),
  overlayOnMarket: jest.fn(),
  overlayOnMarkets: jest.fn(),
  pruneStaleEntries: jest.fn(),
  cleanup: jest.fn(),
  clear: jest.fn(),
  getCacheSize: jest.fn(),
  getCachedGameIds: jest.fn(),
};

(GameCache.getInstance as jest.Mock) = jest.fn(
  () => mockGameCacheInstance as unknown as GameCache,
);
(GameCache.resetInstance as jest.Mock) = jest.fn();

let mockWebSocketInstances: MockWebSocket[] = [];

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
    mockWebSocketInstances.push(this);
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({} as Event);
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({} as CloseEvent);
  }

  simulateMessage(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  simulateError(): void {
    this.onerror?.({} as Event);
  }
}

let appStateCallback: ((state: AppStateStatus) => void) | null = null;
const mockRemoveListener = jest.fn();

const OriginalWebSocket = (
  global as unknown as { WebSocket: typeof MockWebSocket }
).WebSocket;

(global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket =
  MockWebSocket;

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

describe('WebSocketManager', () => {
  beforeEach(() => {
    (global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket =
      MockWebSocket;
    WebSocketManager.resetInstance();
    mockWebSocketInstances = [];
    appStateCallback = null;
    mockRemoveListener.mockClear();
    jest.useFakeTimers();
    jest.clearAllMocks();

    (AppState.addEventListener as jest.Mock).mockImplementation(
      (
        _event: string,
        callback: (state: AppStateStatus) => void,
      ): { remove: () => void } => {
        appStateCallback = callback;
        return { remove: mockRemoveListener };
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket =
      OriginalWebSocket;
  });

  describe('singleton pattern', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = WebSocketManager.getInstance();
      const instance2 = WebSocketManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('creates new instance after reset', () => {
      const instance1 = WebSocketManager.getInstance();
      WebSocketManager.resetInstance();
      const instance2 = WebSocketManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it('sets up AppState listener on instantiation', () => {
      WebSocketManager.getInstance();

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });
  });

  describe('game subscriptions', () => {
    it('connects to sports WS when first subscription is made', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);

      expect(mockWebSocketInstances).toHaveLength(1);
      expect(mockWebSocketInstances[0].url).toBe(
        'wss://sports-api.polymarket.com/ws',
      );
    });

    it('reuses existing connection for second subscriber to same game', () => {
      const manager = WebSocketManager.getInstance();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.subscribeToGame('123', callback1);
      manager.subscribeToGame('123', callback2);

      expect(mockWebSocketInstances).toHaveLength(1);
    });

    it('reuses existing connection for subscriber to different game', () => {
      const manager = WebSocketManager.getInstance();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.subscribeToGame('123', callback1);
      manager.subscribeToGame('456', callback2);

      expect(mockWebSocketInstances).toHaveLength(1);
    });

    it('calls callback when game update is received for subscribed game', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        gameId: 123,
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        live: true,
        ended: false,
      });

      expect(callback).toHaveBeenCalledWith({
        gameId: '123',
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        status: 'ongoing',
        turn: undefined,
      });
    });

    it('updates GameCache when sports message received', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        gameId: 123,
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        live: true,
        ended: false,
      });

      expect(mockGameCacheInstance.updateGame).toHaveBeenCalledWith('123', {
        gameId: '123',
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        status: 'ongoing',
        turn: undefined,
      });
    });

    it('does not call callback for unrelated gameId', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockGameCacheInstance.updateGame.mockClear();
      mockWebSocketInstances[0].simulateMessage({
        gameId: 456,
        score: '7-0',
        elapsed: '05:00',
        period: 'Q1',
        live: true,
        ended: false,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('does not update cache for unrelated gameId', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockGameCacheInstance.updateGame.mockClear();
      mockWebSocketInstances[0].simulateMessage({
        gameId: 456,
        score: '7-0',
        elapsed: '05:00',
        period: 'Q1',
        live: true,
        ended: false,
      });

      expect(mockGameCacheInstance.updateGame).not.toHaveBeenCalled();
    });

    it('calls multiple callbacks for same gameId', () => {
      const manager = WebSocketManager.getInstance();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.subscribeToGame('123', callback1);
      manager.subscribeToGame('123', callback2);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        gameId: 123,
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        live: true,
        ended: false,
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('does not call callback after unsubscribe is invoked', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();

      unsubscribe();

      mockWebSocketInstances[0].simulateMessage({
        gameId: 123,
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        live: true,
        ended: false,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('disconnects when all subscribers unsubscribe', () => {
      const manager = WebSocketManager.getInstance();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = manager.subscribeToGame('123', callback1);
      const unsubscribe2 = manager.subscribeToGame('456', callback2);
      mockWebSocketInstances[0].simulateOpen();

      expect(manager.getConnectionStatus().gameSubscriptionCount).toBe(2);

      unsubscribe1();
      expect(manager.getConnectionStatus().gameSubscriptionCount).toBe(1);

      unsubscribe2();
      expect(manager.getConnectionStatus().gameSubscriptionCount).toBe(0);
      expect(mockWebSocketInstances[0].close).toHaveBeenCalled();
    });

    it('derives status as ended when event.ended is true', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        gameId: 123,
        score: '28-21',
        elapsed: '00:00',
        period: 'FT',
        live: false,
        ended: true,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ended' }),
      );
    });

    it('derives status as scheduled when neither live nor ended', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        gameId: 123,
        score: '0-0',
        elapsed: '00:00',
        period: 'NS',
        live: false,
        ended: false,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'scheduled' }),
      );
    });

    it('ignores malformed JSON messages without calling callback', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].onmessage?.({
        data: 'not valid json',
      } as MessageEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('does not trace RTDS messages when JSON parsing throws', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      rtdsInstance.onmessage?.({
        data: 'not valid json',
      } as MessageEvent);

      expect(trace).not.toHaveBeenCalled();
      expect(endTrace).not.toHaveBeenCalled();
    });

    it('continues flushing buffered prices when a callback throws', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn().mockImplementationOnce(() => {
        throw new Error('subscriber failed');
      });

      manager.subscribeToCryptoPrices(['btc/usd', 'eth/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: { symbol: 'btc/usd', timestamp: 1700000000, value: 67234.5 },
      });
      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000001,
        payload: { symbol: 'eth/usd', timestamp: 1700000001, value: 3500 },
      });

      expect(() => jest.advanceTimersByTime(16)).not.toThrow();
      expect(endTrace).toHaveBeenCalledWith({
        name: TraceName.CryptoUpDownBufferFlush,
      });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith({
        symbol: 'eth/usd',
        price: 3500,
        timestamp: 1700000001,
      });

      callback.mockClear();
      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000001,
        payload: { symbol: 'eth/usd', timestamp: 1700000001, value: 3500 },
      });
      jest.advanceTimersByTime(16);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        symbol: 'eth/usd',
        price: 3500,
        timestamp: 1700000001,
      });
    });

    it('does not end an unmatched buffer flush trace when trace start throws', () => {
      const manager = WebSocketManager.getInstance();
      const traceError = new Error('trace failed');
      (trace as jest.Mock)
        .mockImplementationOnce(() => undefined)
        .mockImplementationOnce(() => {
          throw traceError;
        });

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: { symbol: 'btc/usd', timestamp: 1700000000, value: 67234.5 },
      });
      (endTrace as jest.Mock).mockClear();

      try {
        expect(() => jest.advanceTimersByTime(16)).toThrow(traceError);
      } finally {
        WebSocketManager.resetInstance();
      }
      expect(endTrace).not.toHaveBeenCalledWith({
        name: TraceName.CryptoUpDownBufferFlush,
      });
    });
  });

  describe('price subscriptions', () => {
    it('connects to market WS when first subscription is made', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToMarketPrices(['token1', 'token2'], callback);

      expect(mockWebSocketInstances).toHaveLength(1);
      expect(mockWebSocketInstances[0].url).toBe(
        'wss://ws-subscriptions-clob.polymarket.com/ws/market',
      );
    });

    it('sends subscription message after connection opens', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToMarketPrices(['token1', 'token2'], callback);
      mockWebSocketInstances[0].simulateOpen();

      expect(mockWebSocketInstances[0].send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'market',
          assets_ids: ['token1', 'token2'],
        }),
      );
    });

    it('calls callback with price updates for subscribed tokens', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToMarketPrices(['token1', 'token2'], callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        event_type: 'price_change',
        market: 'market-1',
        price_changes: [
          {
            asset_id: 'token1',
            price: '0.65',
            best_bid: '0.64',
            best_ask: '0.65',
          },
        ],
        timestamp: '2025-01-12T12:00:00Z',
      });

      expect(callback).toHaveBeenCalledWith([
        {
          tokenId: 'token1',
          price: 0.65,
          bestBid: 0.64,
          bestAsk: 0.65,
        },
      ]);
    });

    it('maps price from price field not best_ask', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToMarketPrices(['token1'], callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        event_type: 'price_change',
        market: 'market-1',
        price_changes: [
          {
            asset_id: 'token1',
            price: '0.50',
            best_bid: '0.48',
            best_ask: '0.52',
          },
        ],
        timestamp: '2025-01-12T12:00:00Z',
      });

      expect(callback).toHaveBeenCalledWith([
        {
          tokenId: 'token1',
          price: 0.5,
          bestBid: 0.48,
          bestAsk: 0.52,
        },
      ]);
    });

    it('does not deliver book events to price subscribers', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToMarketPrices(['token1'], callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [{ price: '0.50', size: '100' }],
        asks: [{ price: '0.52', size: '100' }],
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('ignores unknown event types', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToMarketPrices(['token1'], callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        event_type: 'something_else',
        market: 'market-1',
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('filters updates to only subscribed tokens', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToMarketPrices(['token1'], callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateMessage({
        event_type: 'price_change',
        market: 'market-1',
        price_changes: [
          {
            asset_id: 'token1',
            price: '0.65',
            best_bid: '0.64',
            best_ask: '0.65',
          },
          {
            asset_id: 'token2',
            price: '0.35',
            best_bid: '0.34',
            best_ask: '0.35',
          },
        ],
        timestamp: '2025-01-12T12:00:00Z',
      });

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({ tokenId: 'token1' }),
      ]);
    });

    it('sends unsubscribe message when all callbacks removed', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToMarketPrices(
        ['token1', 'token2'],
        callback,
      );
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].send.mockClear();

      unsubscribe();

      expect(mockWebSocketInstances[0].send).toHaveBeenCalledWith(
        JSON.stringify({
          operation: 'unsubscribe',
          assets_ids: ['token1', 'token2'],
        }),
      );
    });

    it('does not unsubscribe overlapping tokens still needed by another subscription', () => {
      const manager = WebSocketManager.getInstance();
      const homepageCallback = jest.fn();
      const marketDetailsCallback = jest.fn();

      manager.subscribeToMarketPrices(['token1', 'token2'], homepageCallback);
      const unsubscribeMarketDetails = manager.subscribeToMarketPrices(
        ['token1'],
        marketDetailsCallback,
      );
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].send.mockClear();

      unsubscribeMarketDetails();

      expect(mockWebSocketInstances[0].send).not.toHaveBeenCalledWith(
        JSON.stringify({
          operation: 'unsubscribe',
          assets_ids: ['token1'],
        }),
      );
    });

    it('only unsubscribes tokens no longer needed by remaining subscriptions', () => {
      const manager = WebSocketManager.getInstance();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.subscribeToMarketPrices(['token1', 'token2'], callback1);
      const unsubscribe = manager.subscribeToMarketPrices(
        ['token2', 'token3'],
        callback2,
      );
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].send.mockClear();

      unsubscribe();

      expect(mockWebSocketInstances[0].send).toHaveBeenCalledWith(
        JSON.stringify({
          operation: 'unsubscribe',
          assets_ids: ['token3'],
        }),
      );
      expect(mockWebSocketInstances[0].send).not.toHaveBeenCalledWith(
        JSON.stringify({
          operation: 'unsubscribe',
          assets_ids: ['token2', 'token3'],
        }),
      );
    });
  });

  describe('orderbook subscriptions', () => {
    const getMarketInstance = () => {
      const instance = mockWebSocketInstances.find(
        (ws) =>
          ws.url === 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
      );
      if (!instance) {
        throw new Error('Market WebSocket instance was not created');
      }
      return instance;
    };

    it('connects to market WS and subscribes when first orderbook subscriber registers', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToOrderbook('token1', jest.fn());
      const market = getMarketInstance();
      market.simulateOpen();

      expect(market.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'market',
          assets_ids: ['token1'],
        }),
      );
    });

    it('emits a sorted snapshot on book events (bids desc, asks asc)', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToOrderbook('token1', callback);
      const market = getMarketInstance();
      market.simulateOpen();
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [
          { price: '0.40', size: '100' },
          { price: '0.45', size: '200' },
          { price: '0.50', size: '50' },
        ],
        asks: [
          { price: '0.60', size: '30' },
          { price: '0.55', size: '80' },
        ],
        timestamp: '2025-01-12T12:00:00Z',
      });

      expect(callback).toHaveBeenCalledTimes(1);
      const snapshot = callback.mock.calls[0][0];
      expect(snapshot.tokenId).toBe('token1');
      expect(snapshot.bids).toEqual([
        { price: 0.5, size: 50 },
        { price: 0.45, size: 200 },
        { price: 0.4, size: 100 },
      ]);
      expect(snapshot.asks).toEqual([
        { price: 0.55, size: 80 },
        { price: 0.6, size: 30 },
      ]);
      expect(typeof snapshot.timestamp).toBe('number');
    });

    it('ignores book events for tokens with no active subscription', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToOrderbook('token1', callback);
      const market = getMarketInstance();
      market.simulateOpen();
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'other-token',
        bids: [{ price: '0.10', size: '1' }],
        asks: [{ price: '0.90', size: '1' }],
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('seedOrderbookSnapshot emits a sorted snapshot from REST data', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToOrderbook('token1', callback);

      manager.seedOrderbookSnapshot('token1', {
        market: 'market-1',
        asset_id: 'token1',
        hash: 'hash',
        timestamp: '2025-01-12T12:00:00Z',
        // REST returns asks descending, bids ascending — emit must re-sort.
        asks: [
          { price: '0.60', size: '30' },
          { price: '0.55', size: '80' },
        ],
        bids: [
          { price: '0.40', size: '100' },
          { price: '0.45', size: '200' },
          { price: '0.50', size: '50' },
        ],
        min_order_size: '1',
        tick_size: '0.01',
        neg_risk: false,
      });

      expect(callback).toHaveBeenCalledTimes(1);
      const snapshot = callback.mock.calls[0][0];
      expect(snapshot.bids).toEqual([
        { price: 0.5, size: 50 },
        { price: 0.45, size: 200 },
        { price: 0.4, size: 100 },
      ]);
      expect(snapshot.asks).toEqual([
        { price: 0.55, size: 80 },
        { price: 0.6, size: 30 },
      ]);
    });

    it('seedOrderbookSnapshot is a no-op when no subscriber is registered', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      // No subscription for this token.
      manager.seedOrderbookSnapshot('orphan-token', {
        market: 'market-1',
        asset_id: 'orphan-token',
        hash: 'hash',
        timestamp: '2025-01-12T12:00:00Z',
        asks: [{ price: '0.6', size: '1' }],
        bids: [{ price: '0.4', size: '1' }],
        min_order_size: '1',
        tick_size: '0.01',
        neg_risk: false,
      });

      // Subscribe afterwards and confirm the cache wasn't populated.
      manager.subscribeToOrderbook('orphan-token', callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('seedOrderbookSnapshot does not overwrite an already-cached WS snapshot', () => {
      // Guards the race where a WS `book` event populates the cache before
      // the parallel REST bootstrap promise resolves: REST is by definition
      // older than the WS push, so it must not stomp the fresher state.
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToOrderbook('token1', callback);
      const market = getMarketInstance();
      market.simulateOpen();

      // Fresh WS book event arrives first.
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [{ price: '0.50', size: '100' }],
        asks: [{ price: '0.52', size: '100' }],
      });
      expect(callback).toHaveBeenCalledTimes(1);
      const wsSnapshot = callback.mock.calls[0][0];
      callback.mockClear();

      // Late REST bootstrap with stale data.
      manager.seedOrderbookSnapshot('token1', {
        market: 'market-1',
        asset_id: 'token1',
        hash: 'hash',
        timestamp: '2025-01-12T11:59:59Z',
        bids: [{ price: '0.40', size: '999' }],
        asks: [{ price: '0.60', size: '999' }],
        min_order_size: '1',
        tick_size: '0.01',
        neg_risk: false,
      });

      // REST seed is a no-op; cache and subscribers untouched.
      expect(callback).not.toHaveBeenCalled();

      // The next WS event still emits the post-WS state (not the REST state).
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [{ price: '0.51', size: '101' }],
        asks: [{ price: '0.53', size: '101' }],
      });
      // Throttle window from the first emit is open; trailing emit fires
      // after 250ms.
      jest.advanceTimersByTime(250);
      const finalSnapshot = callback.mock.calls.at(-1)?.[0];
      expect(finalSnapshot.bids).toEqual([{ price: 0.51, size: 101 }]);
      expect(finalSnapshot.asks).toEqual([{ price: 0.53, size: 101 }]);
      // Sanity: the stale REST values never appeared.
      expect(wsSnapshot.bids[0].price).toBe(0.5);
    });

    it('replays the cached snapshot to a late subscriber synchronously', () => {
      const manager = WebSocketManager.getInstance();
      const firstCallback = jest.fn();

      manager.subscribeToOrderbook('token1', firstCallback);
      const market = getMarketInstance();
      market.simulateOpen();
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [{ price: '0.45', size: '50' }],
        asks: [{ price: '0.55', size: '50' }],
      });
      firstCallback.mockClear();

      const lateCallback = jest.fn();
      manager.subscribeToOrderbook('token1', lateCallback);

      expect(lateCallback).toHaveBeenCalledTimes(1);
      const snapshot = lateCallback.mock.calls[0][0];
      expect(snapshot.bids).toEqual([{ price: 0.45, size: 50 }]);
      expect(snapshot.asks).toEqual([{ price: 0.55, size: 50 }]);
    });

    it('throttles rapid book events to one trailing emit per token window', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToOrderbook('token1', callback);
      const market = getMarketInstance();
      market.simulateOpen();

      // First book — emitted immediately.
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [{ price: '0.45', size: '50' }],
        asks: [{ price: '0.55', size: '50' }],
      });
      expect(callback).toHaveBeenCalledTimes(1);

      // Subsequent rapid books within the throttle window — coalesced.
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [{ price: '0.46', size: '60' }],
        asks: [{ price: '0.54', size: '70' }],
      });
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [{ price: '0.47', size: '70' }],
        asks: [{ price: '0.53', size: '90' }],
      });
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance past the throttle window — trailing emit fires with latest state.
      jest.advanceTimersByTime(250);
      expect(callback).toHaveBeenCalledTimes(2);
      const trailing = callback.mock.calls[1][0];
      expect(trailing.bids).toEqual([{ price: 0.47, size: 70 }]);
      expect(trailing.asks).toEqual([{ price: 0.53, size: 90 }]);
    });

    it('does not emit a stale orderbook on price_change events even with a cached book', () => {
      // `price_change` only carries `best_bid` / `best_ask`, no per-level
      // sizes. Emitting on these events can only show a stale, wider-than-
      // real spread until the next `book` event arrives, so the manager
      // intentionally suppresses orderbook emits here.
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToOrderbook('token1', callback);
      const market = getMarketInstance();
      market.simulateOpen();

      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [
          { price: '0.45', size: '50' },
          { price: '0.40', size: '100' },
        ],
        asks: [
          { price: '0.55', size: '50' },
          { price: '0.60', size: '100' },
        ],
      });
      expect(callback).toHaveBeenCalledTimes(1);
      callback.mockClear();
      jest.advanceTimersByTime(250);

      market.simulateMessage({
        event_type: 'price_change',
        market: 'market-1',
        price_changes: [
          {
            asset_id: 'token1',
            price: '0.58',
            best_bid: '0.56',
            best_ask: '0.59',
          },
        ],
        timestamp: '2025-01-12T12:00:00Z',
      });
      // No emit until the next `book` event repopulates the cache with real
      // level sizes.
      jest.advanceTimersByTime(500);
      expect(callback).not.toHaveBeenCalled();

      // Once a fresh book arrives, the new state is delivered.
      market.simulateMessage({
        event_type: 'book',
        market: 'market-1',
        asset_id: 'token1',
        bids: [{ price: '0.56', size: '10' }],
        asks: [{ price: '0.59', size: '10' }],
      });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].bids).toEqual([
        { price: 0.56, size: 10 },
      ]);
      expect(callback.mock.calls[0][0].asks).toEqual([
        { price: 0.59, size: 10 },
      ]);
    });

    it('does not emit orderbook updates when there is no cached book', () => {
      const manager = WebSocketManager.getInstance();
      const orderbookCallback = jest.fn();
      const priceCallback = jest.fn();

      manager.subscribeToOrderbook('token1', orderbookCallback);
      manager.subscribeToMarketPrices(['token1'], priceCallback);
      const market = getMarketInstance();
      market.simulateOpen();

      market.simulateMessage({
        event_type: 'price_change',
        market: 'market-1',
        price_changes: [
          {
            asset_id: 'token1',
            price: '0.50',
            best_bid: '0.48',
            best_ask: '0.52',
          },
        ],
        timestamp: '2025-01-12T12:00:00Z',
      });

      expect(priceCallback).toHaveBeenCalledTimes(1);
      expect(orderbookCallback).not.toHaveBeenCalled();
    });

    it('does not unsubscribe a token shared with an active price subscription', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToMarketPrices(['token1'], jest.fn());
      const unsubscribeOrderbook = manager.subscribeToOrderbook(
        'token1',
        jest.fn(),
      );
      const market = getMarketInstance();
      market.simulateOpen();
      market.send.mockClear();

      unsubscribeOrderbook();

      expect(market.send).not.toHaveBeenCalledWith(
        JSON.stringify({
          operation: 'unsubscribe',
          assets_ids: ['token1'],
        }),
      );
    });

    it('sends WS unsubscribe when last orderbook subscriber is removed and no price sub references the token', () => {
      const manager = WebSocketManager.getInstance();

      const unsubscribe = manager.subscribeToOrderbook('token1', jest.fn());
      const market = getMarketInstance();
      market.simulateOpen();
      market.send.mockClear();

      unsubscribe();

      expect(market.send).toHaveBeenCalledWith(
        JSON.stringify({
          operation: 'unsubscribe',
          assets_ids: ['token1'],
        }),
      );
    });

    it('closes the market socket only when both price and orderbook maps are empty', () => {
      const manager = WebSocketManager.getInstance();

      const unsubscribePrice = manager.subscribeToMarketPrices(
        ['token1'],
        jest.fn(),
      );
      const unsubscribeOrderbook = manager.subscribeToOrderbook(
        'token1',
        jest.fn(),
      );
      const market = getMarketInstance();
      market.simulateOpen();
      market.close.mockClear();

      unsubscribePrice();
      expect(market.close).not.toHaveBeenCalled();

      unsubscribeOrderbook();
      expect(market.close).toHaveBeenCalledTimes(1);
    });

    it('resubscribes the union of price and orderbook tokens on reconnect', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToMarketPrices(['tokenA'], jest.fn());
      manager.subscribeToOrderbook('tokenB', jest.fn());
      const market = getMarketInstance();
      market.simulateOpen();
      market.send.mockClear();

      market.simulateClose();
      jest.advanceTimersByTime(3000);
      const reconnected =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      reconnected.simulateOpen();

      const subscribeCall = reconnected.send.mock.calls.find(
        ([msg]: [string]) => {
          try {
            return JSON.parse(msg).type === 'market';
          } catch {
            return false;
          }
        },
      );
      if (!subscribeCall) {
        throw new Error('Expected a market subscribe call after reconnect');
      }
      const payload = JSON.parse(subscribeCall[0]);
      expect(payload.assets_ids).toEqual(
        expect.arrayContaining(['tokenA', 'tokenB']),
      );
      expect(payload.assets_ids).toHaveLength(2);
    });
  });

  describe('crypto price subscriptions', () => {
    it('connects to RTDS WS when first subscription is made', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);

      // Sports + Market WS instances may already exist from the singleton,
      // but the RTDS one is the one with the RTDS URL
      const rtdsInstance = mockWebSocketInstances.find(
        (ws) => ws.url === 'wss://ws-live-data.polymarket.com',
      );
      expect(rtdsInstance).toBeDefined();
    });

    it('sends subscribe message after connection opens', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      expect(rtdsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: 'subscribe',
          subscriptions: [
            {
              topic: 'crypto_prices_chainlink',
              type: 'update',
              filters: JSON.stringify({ symbol: 'btc/usd' }),
            },
          ],
        }),
      );
    });

    it('calls callback with crypto price update for subscribed symbol', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: {
          symbol: 'btc/usd',
          timestamp: 1700000001,
          value: 67234.5,
        },
      });

      // Throttled - advance timer to trigger flush
      jest.advanceTimersByTime(16);

      expect(callback).toHaveBeenCalledWith({
        symbol: 'btc/usd',
        price: 67234.5,
        timestamp: 1700000001,
      });
      expect(trace).toHaveBeenCalledWith({
        name: TraceName.CryptoUpDownWsMessage,
        op: 'rtds.message',
      });
      expect(endTrace).toHaveBeenCalledWith({
        name: TraceName.CryptoUpDownWsMessage,
      });
    });

    it('filters pong messages without calling callback', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      // Send pong as raw string (not JSON)
      rtdsInstance.onmessage?.({ data: 'pong' } as MessageEvent);

      jest.advanceTimersByTime(16);

      expect(callback).not.toHaveBeenCalled();
    });

    it('does not call callback for unsubscribed symbols', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: {
          symbol: 'eth/usd',
          timestamp: 1700000001,
          value: 3500.0,
        },
      });

      jest.advanceTimersByTime(16);

      expect(callback).not.toHaveBeenCalled();
    });

    it('sends unsubscribe message when all callbacks removed', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToCryptoPrices(
        ['btc/usd'],
        callback,
      );
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.send.mockClear();

      unsubscribe();

      expect(rtdsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: 'unsubscribe',
          subscriptions: [
            {
              topic: 'crypto_prices_chainlink',
              type: 'update',
              filters: JSON.stringify({ symbol: 'btc/usd' }),
            },
          ],
        }),
      );
    });

    it('unsubscribes only the removed RTDS symbol while another crypto subscription remains', () => {
      const manager = WebSocketManager.getInstance();
      const btcCallback = jest.fn();
      const ethCallback = jest.fn();

      const unsubscribeBtc = manager.subscribeToCryptoPrices(
        ['btc/usd'],
        btcCallback,
      );
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      manager.subscribeToCryptoPrices(['eth/usd'], ethCallback);
      rtdsInstance.send.mockClear();

      unsubscribeBtc();

      expect(rtdsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: 'unsubscribe',
          subscriptions: [
            {
              topic: 'crypto_prices_chainlink',
              type: 'update',
              filters: JSON.stringify({ symbol: 'btc/usd' }),
            },
          ],
        }),
      );
      expect(manager.getConnectionStatus().cryptoPriceSubscriptionCount).toBe(
        1,
      );

      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: { symbol: 'eth/usd', timestamp: 1700000000, value: 3500 },
      });
      jest.advanceTimersByTime(16);

      expect(btcCallback).not.toHaveBeenCalled();
      expect(ethCallback).toHaveBeenCalledWith({
        symbol: 'eth/usd',
        price: 3500,
        timestamp: 1700000000,
      });
    });

    it('disconnects when all subscribers unsubscribe', () => {
      const manager = WebSocketManager.getInstance();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = manager.subscribeToCryptoPrices(
        ['btc/usd'],
        callback1,
      );
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      const unsubscribe2 = manager.subscribeToCryptoPrices(
        ['eth/usd'],
        callback2,
      );

      expect(manager.getConnectionStatus().cryptoPriceSubscriptionCount).toBe(
        2,
      );

      unsubscribe1();
      expect(manager.getConnectionStatus().cryptoPriceSubscriptionCount).toBe(
        1,
      );

      unsubscribe2();
      expect(manager.getConnectionStatus().cryptoPriceSubscriptionCount).toBe(
        0,
      );
      expect(rtdsInstance.close).toHaveBeenCalled();
    });

    it('throttles callbacks to configured interval', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      // Fire 5 rapid messages
      for (let i = 0; i < 5; i++) {
        rtdsInstance.simulateMessage({
          topic: 'crypto_prices_chainlink',
          type: 'update',
          timestamp: 1700000000 + i,
          payload: {
            symbol: 'btc/usd',
            timestamp: 1700000000 + i,
            value: 67234.5 + i,
          },
        });
      }

      // Before throttle flush: no callbacks yet (buffer is collecting)
      expect(callback).not.toHaveBeenCalled();

      // Advance past throttle interval
      jest.advanceTimersByTime(16);

      // Only latest value delivered (buffer overwrites per symbol)
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        symbol: 'btc/usd',
        price: 67238.5,
        timestamp: 1700000004,
      });
    });

    it('ignores malformed JSON messages without calling callback', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.onmessage?.({
        data: 'not valid json',
      } as MessageEvent);

      jest.advanceTimersByTime(16);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('reconnection with exponential backoff', () => {
    it('reconnects with increasing delay after connection closes', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].simulateClose();

      expect(mockWebSocketInstances).toHaveLength(1);

      jest.advanceTimersByTime(3000);
      expect(mockWebSocketInstances).toHaveLength(2);

      mockWebSocketInstances[1].simulateClose();
      jest.advanceTimersByTime(6000);
      expect(mockWebSocketInstances).toHaveLength(3);
    });

    it('stops reconnecting after max attempts', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      const initialInstanceCount = mockWebSocketInstances.length;

      for (let i = 0; i < 5; i++) {
        const currentIdx = initialInstanceCount - 1 + i;
        mockWebSocketInstances[currentIdx].simulateClose();
        jest.advanceTimersByTime((i + 1) * 3000);
      }

      const afterAttemptsCount = mockWebSocketInstances.length;
      const lastIdx = afterAttemptsCount - 1;
      mockWebSocketInstances[lastIdx].simulateClose();
      jest.advanceTimersByTime(30000);

      expect(mockWebSocketInstances).toHaveLength(afterAttemptsCount);
    });

    it('resets reconnect attempts on successful connection', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateClose();
      jest.advanceTimersByTime(3000);

      mockWebSocketInstances[1].simulateOpen();
      mockWebSocketInstances[1].simulateClose();
      jest.advanceTimersByTime(3000);

      expect(mockWebSocketInstances).toHaveLength(3);
    });

    it('does not reconnect if no subscribers remain', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();

      unsubscribe();
      mockWebSocketInstances[0].simulateClose();
      jest.advanceTimersByTime(10000);

      expect(mockWebSocketInstances).toHaveLength(1);
    });
  });

  describe('RTDS reconnection', () => {
    it('reconnects with increasing delay after RTDS connection closes', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const firstInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      firstInstance.simulateOpen();
      const countAfterFirst = mockWebSocketInstances.length;

      firstInstance.simulateClose();
      jest.advanceTimersByTime(3000);
      expect(mockWebSocketInstances.length).toBe(countAfterFirst + 1);

      const secondInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      secondInstance.simulateClose();
      jest.advanceTimersByTime(6000);
      expect(mockWebSocketInstances.length).toBe(countAfterFirst + 2);
    });

    it('stops reconnecting after max attempts', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const initialCount = mockWebSocketInstances.length;

      for (let i = 0; i < 5; i++) {
        const idx = initialCount - 1 + i;
        mockWebSocketInstances[idx].simulateClose();
        jest.advanceTimersByTime((i + 1) * 3000);
      }

      const afterAttemptsCount = mockWebSocketInstances.length;
      const lastIdx = afterAttemptsCount - 1;
      mockWebSocketInstances[lastIdx].simulateClose();
      jest.advanceTimersByTime(30000);

      expect(mockWebSocketInstances.length).toBe(afterAttemptsCount);
    });

    it('resets reconnect attempts on successful connection', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const firstInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      firstInstance.simulateClose();
      jest.advanceTimersByTime(3000);

      const secondInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      secondInstance.simulateOpen();
      secondInstance.simulateClose();
      jest.advanceTimersByTime(3000);

      expect(mockWebSocketInstances.length).toBeGreaterThan(2);
    });

    it('does not reconnect if no subscribers remain', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToCryptoPrices(
        ['btc/usd'],
        callback,
      );
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      unsubscribe();
      const countAfterUnsubscribe = mockWebSocketInstances.length;
      rtdsInstance.simulateClose();
      jest.advanceTimersByTime(10000);

      expect(mockWebSocketInstances.length).toBe(countAfterUnsubscribe);
    });
  });

  describe('AppState handling', () => {
    it('disconnects on app background when connected', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();

      expect(appStateCallback).not.toBeNull();
      if (appStateCallback) {
        appStateCallback('background');
      }

      expect(mockWebSocketInstances[0].readyState).toBe(MockWebSocket.CLOSED);
    });

    it('reconnects on app foreground if had active subscriptions', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();

      const countBeforeBackground = mockWebSocketInstances.length;

      if (appStateCallback) {
        appStateCallback('background');
        appStateCallback('active');
      }

      expect(mockWebSocketInstances.length).toBeGreaterThan(
        countBeforeBackground,
      );
    });

    it('does not reconnect on foreground if no subscriptions', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();

      unsubscribe();

      const countAfterUnsubscribe = mockWebSocketInstances.length;

      if (appStateCallback) {
        appStateCallback('background');
        appStateCallback('active');
      }

      expect(mockWebSocketInstances.length).toBe(countAfterUnsubscribe);
    });
  });

  describe('RTDS AppState handling', () => {
    it('disconnects RTDS on app background when connected', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      expect(appStateCallback).not.toBeNull();
      if (appStateCallback) {
        appStateCallback('background');
      }

      expect(rtdsInstance.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('reconnects RTDS on app foreground with active subscriptions', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      const countBeforeBackground = mockWebSocketInstances.length;

      if (appStateCallback) {
        appStateCallback('background');
        appStateCallback('active');
      }

      expect(mockWebSocketInstances.length).toBeGreaterThan(
        countBeforeBackground,
      );
    });

    it('does not reconnect RTDS on foreground if no subscriptions', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToCryptoPrices(
        ['btc/usd'],
        callback,
      );
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      unsubscribe();
      const countAfterUnsubscribe = mockWebSocketInstances.length;

      if (appStateCallback) {
        appStateCallback('background');
        appStateCallback('active');
      }

      expect(mockWebSocketInstances.length).toBe(countAfterUnsubscribe);
    });
  });

  describe('ping/heartbeat', () => {
    it('sends ping at configured interval after connection opens', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();
      mockWebSocketInstances[0].send.mockClear();

      jest.advanceTimersByTime(50000);

      expect(mockWebSocketInstances[0].send).toHaveBeenCalledWith('PING');
    });

    it('stops ping on disconnect', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToGame('123', callback);
      mockWebSocketInstances[0].simulateOpen();

      unsubscribe();
      mockWebSocketInstances[0].send.mockClear();

      jest.advanceTimersByTime(100000);

      expect(mockWebSocketInstances[0].send).not.toHaveBeenCalledWith('PING');
    });
  });

  describe('RTDS ping/heartbeat', () => {
    it('sends lowercase ping at 5-second interval after connection opens', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.send.mockClear();

      jest.advanceTimersByTime(5000);

      expect(rtdsInstance.send).toHaveBeenCalledWith('ping');
    });

    it('stops ping on disconnect', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      const unsubscribe = manager.subscribeToCryptoPrices(
        ['btc/usd'],
        callback,
      );
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      unsubscribe();
      rtdsInstance.send.mockClear();

      jest.advanceTimersByTime(10000);

      expect(rtdsInstance.send).not.toHaveBeenCalledWith('ping');
    });
  });

  describe('RTDS connection edge cases', () => {
    it('reuses existing connection for second subscriber', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      manager.subscribeToCryptoPrices(['eth/usd'], jest.fn());

      const rtdsInstances = mockWebSocketInstances.filter(
        (ws) => ws.url === 'wss://ws-live-data.polymarket.com',
      );
      expect(rtdsInstances).toHaveLength(1);
    });

    it('sends subscribe for new symbols on already-open connection', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.send.mockClear();

      manager.subscribeToCryptoPrices(['eth/usd'], jest.fn());

      expect(rtdsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: 'subscribe',
          subscriptions: [
            {
              topic: 'crypto_prices_chainlink',
              type: 'update',
              filters: JSON.stringify({ symbol: 'eth/usd' }),
            },
          ],
        }),
      );
    });

    it('does not create new connection when WS is in CONNECTING state', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      const countAfterFirst = mockWebSocketInstances.length;

      manager.subscribeToCryptoPrices(['eth/usd'], jest.fn());

      expect(mockWebSocketInstances.length).toBe(countAfterFirst);
    });

    it('calls multiple subscriber callbacks for same symbol', () => {
      const manager = WebSocketManager.getInstance();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback1);
      manager.subscribeToCryptoPrices(['btc/usd'], callback2);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: { symbol: 'btc/usd', timestamp: 1700000000, value: 67234.5 },
      });

      jest.advanceTimersByTime(16);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('delivers updates to multiple subscriptions with overlapping symbols', () => {
      const manager = WebSocketManager.getInstance();
      const callbackA = jest.fn();
      const callbackB = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callbackA);
      manager.subscribeToCryptoPrices(['btc/usd', 'eth/usd'], callbackB);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: { symbol: 'btc/usd', timestamp: 1700000000, value: 67234.5 },
      });
      jest.advanceTimersByTime(16);

      expect(callbackA).toHaveBeenCalledTimes(1);
      expect(callbackB).toHaveBeenCalledTimes(1);

      callbackA.mockClear();
      callbackB.mockClear();

      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000001,
        payload: { symbol: 'eth/usd', timestamp: 1700000001, value: 3500.0 },
      });
      jest.advanceTimersByTime(16);

      expect(callbackA).not.toHaveBeenCalled();
      expect(callbackB).toHaveBeenCalledTimes(1);
    });

    it('ignores messages with non-crypto_prices_chainlink topic', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.simulateMessage({
        topic: 'orderbook',
        type: 'update',
        timestamp: 1700000000,
        payload: { symbol: 'btc/usd', timestamp: 1700000000, value: 67234.5 },
      });

      jest.advanceTimersByTime(16);

      expect(callback).not.toHaveBeenCalled();
      expect(trace).not.toHaveBeenCalledWith({
        name: TraceName.CryptoUpDownWsMessage,
        op: 'rtds.message',
      });
    });

    it('ignores messages with missing payload', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();
      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
      });

      jest.advanceTimersByTime(16);

      expect(callback).not.toHaveBeenCalled();
    });

    it('handles onerror without crashing', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];

      expect(() => rtdsInstance.simulateError()).not.toThrow();
    });

    it('does not send subscribe when WS is not open', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];

      expect(rtdsInstance.send).not.toHaveBeenCalled();
    });

    it('does not send unsubscribe when WS is not open', () => {
      const manager = WebSocketManager.getInstance();

      const unsubscribe = manager.subscribeToCryptoPrices(
        ['btc/usd'],
        jest.fn(),
      );
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.send.mockClear();

      unsubscribe();

      expect(rtdsInstance.send).not.toHaveBeenCalled();
    });

    it('cleans up RTDS connection with throttle timer active', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: { symbol: 'btc/usd', timestamp: 1700000000, value: 67234.5 },
      });

      WebSocketManager.resetInstance();

      expect(() => jest.advanceTimersByTime(100)).not.toThrow();
    });

    it('handles cleanup when rtdsWs is null', () => {
      WebSocketManager.getInstance();

      expect(() => WebSocketManager.resetInstance()).not.toThrow();
    });

    it('resubscribes all symbols on reconnect after close', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      manager.subscribeToCryptoPrices(['eth/usd'], jest.fn());
      const firstInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      firstInstance.simulateOpen();
      firstInstance.simulateClose();

      jest.advanceTimersByTime(3000);

      const secondInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      secondInstance.simulateOpen();

      const subscribeCalls = secondInstance.send.mock.calls.filter(
        (call: string[]) => {
          try {
            const msg = JSON.parse(call[0]);
            return msg.action === 'subscribe';
          } catch {
            return false;
          }
        },
      );

      expect(subscribeCalls.length).toBeGreaterThan(0);
    });

    it('reconnectAll only connects RTDS when only RTDS has subscriptions', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      const countBefore = mockWebSocketInstances.length;

      if (appStateCallback) {
        appStateCallback('background');
        appStateCallback('active');
      }

      expect(mockWebSocketInstances.length).toBe(countBefore + 1);
      expect(
        mockWebSocketInstances[mockWebSocketInstances.length - 1].url,
      ).toBe('wss://ws-live-data.polymarket.com');
    });

    it('clears throttle timer when buffer empties after flush', () => {
      const manager = WebSocketManager.getInstance();
      const callback = jest.fn();

      manager.subscribeToCryptoPrices(['btc/usd'], callback);
      const rtdsInstance =
        mockWebSocketInstances[mockWebSocketInstances.length - 1];
      rtdsInstance.simulateOpen();

      rtdsInstance.simulateMessage({
        topic: 'crypto_prices_chainlink',
        type: 'update',
        timestamp: 1700000000,
        payload: { symbol: 'btc/usd', timestamp: 1700000000, value: 67234.5 },
      });

      jest.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1);

      callback.mockClear();
      jest.advanceTimersByTime(16);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('returns connection status with all fields populated', () => {
      const manager = WebSocketManager.getInstance();

      expect(manager.getConnectionStatus()).toEqual({
        sportsConnected: false,
        marketConnected: false,
        rtdsConnected: false,
        gameSubscriptionCount: 0,
        priceSubscriptionCount: 0,
        cryptoPriceSubscriptionCount: 0,
        orderbookSubscriptionCount: 0,
      });

      manager.subscribeToGame('123', jest.fn());
      mockWebSocketInstances[0].simulateOpen();

      manager.subscribeToMarketPrices(['token1'], jest.fn());
      mockWebSocketInstances[1].simulateOpen();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      mockWebSocketInstances[2].simulateOpen();

      manager.subscribeToOrderbook('token2', jest.fn());

      expect(manager.getConnectionStatus()).toEqual({
        sportsConnected: true,
        marketConnected: true,
        rtdsConnected: true,
        gameSubscriptionCount: 1,
        priceSubscriptionCount: 1,
        cryptoPriceSubscriptionCount: 1,
        orderbookSubscriptionCount: 1,
      });
    });
  });

  describe('cleanup', () => {
    it('cleans up AppState listener on reset', () => {
      mockRemoveListener.mockClear();

      WebSocketManager.getInstance();
      WebSocketManager.resetInstance();

      expect(mockRemoveListener).toHaveBeenCalled();
    });

    it('closes all connections', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToGame('123', jest.fn());
      mockWebSocketInstances[0].simulateOpen();

      manager.subscribeToMarketPrices(['token1'], jest.fn());
      mockWebSocketInstances[1].simulateOpen();

      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());
      mockWebSocketInstances[2].simulateOpen();

      WebSocketManager.resetInstance();

      expect(mockWebSocketInstances[0].close).toHaveBeenCalled();
      expect(mockWebSocketInstances[1].close).toHaveBeenCalled();
      expect(mockWebSocketInstances[2].close).toHaveBeenCalled();
    });

    it('clears all subscriptions', () => {
      const manager = WebSocketManager.getInstance();

      manager.subscribeToGame('123', jest.fn());
      manager.subscribeToMarketPrices(['token1'], jest.fn());
      manager.subscribeToCryptoPrices(['btc/usd'], jest.fn());

      expect(manager.getConnectionStatus().gameSubscriptionCount).toBe(1);
      expect(manager.getConnectionStatus().priceSubscriptionCount).toBe(1);
      expect(manager.getConnectionStatus().cryptoPriceSubscriptionCount).toBe(
        1,
      );

      WebSocketManager.resetInstance();
      const newManager = WebSocketManager.getInstance();

      expect(newManager.getConnectionStatus().gameSubscriptionCount).toBe(0);
      expect(newManager.getConnectionStatus().priceSubscriptionCount).toBe(0);
      expect(
        newManager.getConnectionStatus().cryptoPriceSubscriptionCount,
      ).toBe(0);
    });
  });
});
