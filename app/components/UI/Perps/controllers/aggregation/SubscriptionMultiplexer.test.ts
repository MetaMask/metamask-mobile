import type {
  IPerpsProvider,
  PriceUpdate,
  Position,
  Order,
  OrderFill,
  AccountState,
} from '../types';
import { SubscriptionMultiplexer } from './SubscriptionMultiplexer';

// Mock provider with test helper methods
interface MockProviderWithEmit extends jest.Mocked<Partial<IPerpsProvider>> {
  _emitPrices: (prices: PriceUpdate[]) => void;
  _emitPositions: (positions: Position[]) => void;
  _emitOrders: (orders: Order[]) => void;
  _emitFills: (fills: OrderFill[], isSnapshot?: boolean) => void;
  _emitAccount: (account: AccountState) => void;
}

// Mock provider factory
const createMockProvider = (providerId: string): MockProviderWithEmit => {
  const priceCallbacks: ((prices: PriceUpdate[]) => void)[] = [];
  const positionCallbacks: ((positions: Position[]) => void)[] = [];
  const orderCallbacks: ((orders: Order[]) => void)[] = [];
  const fillCallbacks: ((fills: OrderFill[], isSnapshot?: boolean) => void)[] =
    [];
  const accountCallbacks: ((account: AccountState) => void)[] = [];

  return {
    protocolId: providerId,
    subscribeToPrices: jest.fn((params) => {
      priceCallbacks.push(params.callback);
      return () => {
        const idx = priceCallbacks.indexOf(params.callback);
        if (idx > -1) priceCallbacks.splice(idx, 1);
      };
    }),
    subscribeToPositions: jest.fn((params) => {
      positionCallbacks.push(params.callback);
      return () => {
        const idx = positionCallbacks.indexOf(params.callback);
        if (idx > -1) positionCallbacks.splice(idx, 1);
      };
    }),
    subscribeToOrders: jest.fn((params) => {
      orderCallbacks.push(params.callback);
      return () => {
        const idx = orderCallbacks.indexOf(params.callback);
        if (idx > -1) orderCallbacks.splice(idx, 1);
      };
    }),
    subscribeToOrderFills: jest.fn((params) => {
      fillCallbacks.push(params.callback);
      return () => {
        const idx = fillCallbacks.indexOf(params.callback);
        if (idx > -1) fillCallbacks.splice(idx, 1);
      };
    }),
    subscribeToAccount: jest.fn((params) => {
      accountCallbacks.push(params.callback);
      return () => {
        const idx = accountCallbacks.indexOf(params.callback);
        if (idx > -1) accountCallbacks.splice(idx, 1);
      };
    }),
    // Helper to emit updates in tests
    _emitPrices: (prices: PriceUpdate[]) => {
      priceCallbacks.forEach((cb) => cb(prices));
    },
    _emitPositions: (positions: Position[]) => {
      positionCallbacks.forEach((cb) => cb(positions));
    },
    _emitOrders: (orders: Order[]) => {
      orderCallbacks.forEach((cb) => cb(orders));
    },
    _emitFills: (fills: OrderFill[], isSnapshot?: boolean) => {
      fillCallbacks.forEach((cb) => cb(fills, isSnapshot));
    },
    _emitAccount: (account: AccountState) => {
      accountCallbacks.forEach((cb) => cb(account));
    },
  } as MockProviderWithEmit;
};

describe('SubscriptionMultiplexer', () => {
  let mux: SubscriptionMultiplexer;
  let mockHLProvider: ReturnType<typeof createMockProvider>;
  let mockMYXProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    mux = new SubscriptionMultiplexer();
    mockHLProvider = createMockProvider('hyperliquid');
    mockMYXProvider = createMockProvider('myx');
  });

  describe('subscribeToPrices', () => {
    it('should subscribe to multiple providers', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC', 'ETH'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
          ['myx', mockMYXProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      expect(mockHLProvider.subscribeToPrices).toHaveBeenCalledTimes(1);
      expect(mockMYXProvider.subscribeToPrices).toHaveBeenCalledTimes(1);
    });

    it('should inject providerId into price updates', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      // Emit price from provider
      mockHLProvider._emitPrices([
        { symbol: 'BTC', price: '50000', timestamp: Date.now() },
      ]);

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            symbol: 'BTC',
            price: '50000',
            providerId: 'hyperliquid',
          }),
        ]),
      );
    });

    it('should aggregate prices from multiple providers in merge mode', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
          ['myx', mockMYXProvider as unknown as IPerpsProvider],
        ],
        callback,
        aggregationMode: 'merge',
      });

      // Emit from both providers
      mockHLProvider._emitPrices([
        { symbol: 'BTC', price: '50000', timestamp: Date.now() },
      ]);
      mockMYXProvider._emitPrices([
        { symbol: 'BTC', price: '50100', timestamp: Date.now() },
      ]);

      // After second emission, should have both prices
      const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(2);
      expect(lastCall).toContainEqual(
        expect.objectContaining({ providerId: 'hyperliquid', price: '50000' }),
      );
      expect(lastCall).toContainEqual(
        expect.objectContaining({ providerId: 'myx', price: '50100' }),
      );
    });

    it('should select best price in best_price mode', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
          ['myx', mockMYXProvider as unknown as IPerpsProvider],
        ],
        callback,
        aggregationMode: 'best_price',
      });

      // Emit from both providers with different spreads
      mockHLProvider._emitPrices([
        { symbol: 'BTC', price: '50000', timestamp: Date.now(), spread: '10' },
      ]);
      mockMYXProvider._emitPrices([
        { symbol: 'BTC', price: '50100', timestamp: Date.now(), spread: '5' },
      ]);

      // Should return MYX price (smaller spread)
      const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(1);
      expect(lastCall[0]).toMatchObject({
        providerId: 'myx',
        spread: '5',
      });
    });

    it('should unsubscribe from all providers', () => {
      const callback = jest.fn();

      const unsubscribe = mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
          ['myx', mockMYXProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      unsubscribe();

      // Emit after unsubscribe - callback should not be called
      callback.mockClear();
      mockHLProvider._emitPrices([
        { symbol: 'BTC', price: '50000', timestamp: Date.now() },
      ]);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToPositions', () => {
    const createMockPosition = (symbol: string, size: string): Position =>
      ({
        symbol,
        size,
        entryPrice: '50000',
        positionValue: '5000',
        unrealizedPnl: '100',
        marginUsed: '500',
        leverage: { type: 'cross', value: 10 },
        liquidationPrice: '45000',
        maxLeverage: 50,
        returnOnEquity: '2%',
        cumulativeFunding: {
          allTime: '10',
          sinceOpen: '5',
          sinceChange: '2',
        },
        takeProfitCount: 0,
        stopLossCount: 0,
      }) as Position;

    it('should inject providerId into position updates', () => {
      const callback = jest.fn();

      mux.subscribeToPositions({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitPositions([createMockPosition('BTC', '0.1')]);

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            symbol: 'BTC',
            providerId: 'hyperliquid',
          }),
        ]),
      );
    });

    it('should aggregate positions from multiple providers', () => {
      const callback = jest.fn();

      mux.subscribeToPositions({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
          ['myx', mockMYXProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitPositions([createMockPosition('BTC', '0.1')]);
      mockMYXProvider._emitPositions([createMockPosition('ETH', '1.0')]);

      const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(2);
      expect(lastCall).toContainEqual(
        expect.objectContaining({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );
      expect(lastCall).toContainEqual(
        expect.objectContaining({ symbol: 'ETH', providerId: 'myx' }),
      );
    });
  });

  describe('subscribeToOrders', () => {
    const createMockOrder = (orderId: string, symbol: string): Order =>
      ({
        orderId,
        symbol,
        side: 'buy',
        orderType: 'limit',
        size: '0.1',
        originalSize: '0.1',
        price: '50000',
        filledSize: '0',
        remainingSize: '0.1',
        status: 'open',
        timestamp: Date.now(),
      }) as Order;

    it('should inject providerId into order updates', () => {
      const callback = jest.fn();

      mux.subscribeToOrders({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitOrders([createMockOrder('order-1', 'BTC')]);

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            orderId: 'order-1',
            providerId: 'hyperliquid',
          }),
        ]),
      );
    });

    it('should aggregate orders from multiple providers', () => {
      const callback = jest.fn();

      mux.subscribeToOrders({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
          ['myx', mockMYXProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitOrders([createMockOrder('hl-order', 'BTC')]);
      mockMYXProvider._emitOrders([createMockOrder('myx-order', 'ETH')]);

      const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(2);
      expect(lastCall).toContainEqual(
        expect.objectContaining({
          orderId: 'hl-order',
          providerId: 'hyperliquid',
        }),
      );
      expect(lastCall).toContainEqual(
        expect.objectContaining({ orderId: 'myx-order', providerId: 'myx' }),
      );
    });
  });

  describe('subscribeToOrderFills', () => {
    const createMockFill = (orderId: string, symbol: string): OrderFill =>
      ({
        orderId,
        symbol,
        side: 'buy',
        size: '0.1',
        price: '50000',
        pnl: '100',
        direction: 'long',
        fee: '0.5',
        feeToken: 'USDC',
        timestamp: Date.now(),
      }) as OrderFill;

    it('should inject providerId into fill updates', () => {
      const callback = jest.fn();

      mux.subscribeToOrderFills({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitFills([createMockFill('fill-1', 'BTC')], false);

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            orderId: 'fill-1',
            providerId: 'hyperliquid',
          }),
        ]),
        false,
      );
    });

    it('should pass through isSnapshot flag', () => {
      const callback = jest.fn();

      mux.subscribeToOrderFills({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitFills([createMockFill('fill-1', 'BTC')], true);

      expect(callback).toHaveBeenCalledWith(expect.any(Array), true);
    });
  });

  describe('subscribeToAccount', () => {
    const createMockAccount = (balance: string): AccountState =>
      ({
        availableBalance: balance,
        totalBalance: balance,
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
      }) as AccountState;

    it('should inject providerId into account updates', () => {
      const callback = jest.fn();

      mux.subscribeToAccount({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitAccount(createMockAccount('10000'));

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            availableBalance: '10000',
            providerId: 'hyperliquid',
          }),
        ]),
      );
    });

    it('should aggregate accounts from multiple providers', () => {
      const callback = jest.fn();

      mux.subscribeToAccount({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
          ['myx', mockMYXProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitAccount(createMockAccount('10000'));
      mockMYXProvider._emitAccount(createMockAccount('5000'));

      const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
      expect(lastCall).toHaveLength(2);
      expect(lastCall).toContainEqual(
        expect.objectContaining({
          availableBalance: '10000',
          providerId: 'hyperliquid',
        }),
      );
      expect(lastCall).toContainEqual(
        expect.objectContaining({
          availableBalance: '5000',
          providerId: 'myx',
        }),
      );
    });
  });

  describe('cache operations', () => {
    it('should cache prices', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitPrices([
        { symbol: 'BTC', price: '50000', timestamp: Date.now() },
      ]);

      const cached = mux.getCachedPrice('BTC', 'hyperliquid');
      expect(cached).toMatchObject({
        symbol: 'BTC',
        price: '50000',
        providerId: 'hyperliquid',
      });
    });

    it('should return all cached prices for a symbol', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
          ['myx', mockMYXProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitPrices([
        { symbol: 'BTC', price: '50000', timestamp: Date.now() },
      ]);
      mockMYXProvider._emitPrices([
        { symbol: 'BTC', price: '50100', timestamp: Date.now() },
      ]);

      const allPrices = mux.getAllCachedPricesForSymbol('BTC');
      expect(allPrices?.size).toBe(2);
      expect(allPrices?.get('hyperliquid')?.price).toBe('50000');
      expect(allPrices?.get('myx')?.price).toBe('50100');
    });

    it('should clear cache', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as IPerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitPrices([
        { symbol: 'BTC', price: '50000', timestamp: Date.now() },
      ]);

      mux.clearCache();

      expect(mux.getCachedPrice('BTC', 'hyperliquid')).toBeUndefined();
    });
  });
});
