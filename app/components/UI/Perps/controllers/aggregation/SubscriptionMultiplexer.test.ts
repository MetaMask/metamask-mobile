import type {
  PerpsProvider,
  PerpsLogger,
  PriceUpdate,
  Position,
  Order,
  OrderFill,
  AccountState,
} from '../types';
import { SubscriptionMultiplexer } from './SubscriptionMultiplexer';

// Mock logger factory
const createMockLogger = (): jest.Mocked<PerpsLogger> => ({
  error: jest.fn(),
});

// Mock provider with test helper methods
interface MockProviderWithEmit extends jest.Mocked<Partial<PerpsProvider>> {
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
    it('subscribes to multiple providers', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC', 'ETH'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
          ['myx', mockMYXProvider as unknown as PerpsProvider],
        ],
        callback,
      });

      expect(mockHLProvider.subscribeToPrices).toHaveBeenCalledTimes(1);
      expect(mockMYXProvider.subscribeToPrices).toHaveBeenCalledTimes(1);
    });

    it('injects providerId into price updates', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
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

    it('aggregates prices from multiple providers in merge mode', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
          ['myx', mockMYXProvider as unknown as PerpsProvider],
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
      const lastCall = callback.mock.calls.at(-1)?.[0];
      expect(lastCall).toHaveLength(2);
      expect(lastCall).toContainEqual(
        expect.objectContaining({ providerId: 'hyperliquid', price: '50000' }),
      );
      expect(lastCall).toContainEqual(
        expect.objectContaining({ providerId: 'myx', price: '50100' }),
      );
    });

    it('selects best price in best_price mode', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
          ['myx', mockMYXProvider as unknown as PerpsProvider],
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
      const lastCall = callback.mock.calls.at(-1)?.[0];
      expect(lastCall).toHaveLength(1);
      expect(lastCall[0]).toMatchObject({
        providerId: 'myx',
        spread: '5',
      });
    });

    it('unsubscribes from all providers', () => {
      const callback = jest.fn();

      const unsubscribe = mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
          ['myx', mockMYXProvider as unknown as PerpsProvider],
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

    it('injects providerId into position updates', () => {
      const callback = jest.fn();

      mux.subscribeToPositions({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
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

    it('aggregates positions from multiple providers', () => {
      const callback = jest.fn();

      mux.subscribeToPositions({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
          ['myx', mockMYXProvider as unknown as PerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitPositions([createMockPosition('BTC', '0.1')]);
      mockMYXProvider._emitPositions([createMockPosition('ETH', '1.0')]);

      const lastCall = callback.mock.calls.at(-1)?.[0];
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

    it('injects providerId into order updates', () => {
      const callback = jest.fn();

      mux.subscribeToOrders({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
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

    it('aggregates orders from multiple providers', () => {
      const callback = jest.fn();

      mux.subscribeToOrders({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
          ['myx', mockMYXProvider as unknown as PerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitOrders([createMockOrder('hl-order', 'BTC')]);
      mockMYXProvider._emitOrders([createMockOrder('myx-order', 'ETH')]);

      const lastCall = callback.mock.calls.at(-1)?.[0];
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

    it('injects providerId into fill updates', () => {
      const callback = jest.fn();

      mux.subscribeToOrderFills({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
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

    it('passes through isSnapshot flag', () => {
      const callback = jest.fn();

      mux.subscribeToOrderFills({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
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

    it('injects providerId into account updates', () => {
      const callback = jest.fn();

      mux.subscribeToAccount({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
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

    it('aggregates accounts from multiple providers', () => {
      const callback = jest.fn();

      mux.subscribeToAccount({
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
          ['myx', mockMYXProvider as unknown as PerpsProvider],
        ],
        callback,
      });

      mockHLProvider._emitAccount(createMockAccount('10000'));
      mockMYXProvider._emitAccount(createMockAccount('5000'));

      const lastCall = callback.mock.calls.at(-1)?.[0];
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
    it('caches prices', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
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

    it('returns all cached prices for a symbol', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
          ['myx', mockMYXProvider as unknown as PerpsProvider],
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

    it('clears cache', () => {
      const callback = jest.fn();

      mux.subscribeToPrices({
        symbols: ['BTC'],
        providers: [
          ['hyperliquid', mockHLProvider as unknown as PerpsProvider],
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

  describe('subscription cleanup on partial failure', () => {
    let mockLogger: jest.Mocked<PerpsLogger>;
    let muxWithLogger: SubscriptionMultiplexer;
    let successfulProvider: ReturnType<typeof createMockProvider>;
    let failingProvider: MockProviderWithEmit;

    beforeEach(() => {
      mockLogger = createMockLogger();
      muxWithLogger = new SubscriptionMultiplexer({ logger: mockLogger });
      successfulProvider = createMockProvider('hyperliquid');

      // Create a provider that throws on subscription
      failingProvider = {
        ...createMockProvider('myx'),
        subscribeToPrices: jest.fn(() => {
          throw new Error('Provider 2 failed');
        }),
        subscribeToPositions: jest.fn(() => {
          throw new Error('Provider 2 failed');
        }),
        subscribeToOrders: jest.fn(() => {
          throw new Error('Provider 2 failed');
        }),
        subscribeToOrderFills: jest.fn(() => {
          throw new Error('Provider 2 failed');
        }),
        subscribeToAccount: jest.fn(() => {
          throw new Error('Provider 2 failed');
        }),
      } as MockProviderWithEmit;
    });

    it('cleans up successful subscriptions when subscribeToPrices fails for a later provider', () => {
      // Track if the first provider's unsubscribe was called
      const unsubMock = jest.fn();
      successfulProvider.subscribeToPrices = jest.fn(() => unsubMock);

      expect(() => {
        muxWithLogger.subscribeToPrices({
          symbols: ['BTC'],
          providers: [
            ['hyperliquid', successfulProvider as unknown as PerpsProvider],
            ['myx', failingProvider as unknown as PerpsProvider],
          ],
          callback: jest.fn(),
        });
      }).toThrow('Provider 2 failed');

      // Verify cleanup was called for the successful subscription
      expect(unsubMock).toHaveBeenCalled();
      // Verify error was logged with feature tag
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            feature: 'perps',
            provider: 'myx',
            method: 'subscribeToPrices',
          },
          context: expect.objectContaining({
            name: 'SubscriptionMultiplexer',
            data: { subscribedCount: 1 },
          }),
        }),
      );
    });

    it('cleans up successful subscriptions when subscribeToPositions fails for a later provider', () => {
      const unsubMock = jest.fn();
      successfulProvider.subscribeToPositions = jest.fn(() => unsubMock);

      expect(() => {
        muxWithLogger.subscribeToPositions({
          providers: [
            ['hyperliquid', successfulProvider as unknown as PerpsProvider],
            ['myx', failingProvider as unknown as PerpsProvider],
          ],
          callback: jest.fn(),
        });
      }).toThrow('Provider 2 failed');

      expect(unsubMock).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            feature: 'perps',
            provider: 'myx',
            method: 'subscribeToPositions',
          },
        }),
      );
    });

    it('cleans up successful subscriptions when subscribeToOrders fails for a later provider', () => {
      const unsubMock = jest.fn();
      successfulProvider.subscribeToOrders = jest.fn(() => unsubMock);

      expect(() => {
        muxWithLogger.subscribeToOrders({
          providers: [
            ['hyperliquid', successfulProvider as unknown as PerpsProvider],
            ['myx', failingProvider as unknown as PerpsProvider],
          ],
          callback: jest.fn(),
        });
      }).toThrow('Provider 2 failed');

      expect(unsubMock).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            feature: 'perps',
            provider: 'myx',
            method: 'subscribeToOrders',
          },
        }),
      );
    });

    it('cleans up successful subscriptions when subscribeToOrderFills fails for a later provider', () => {
      const unsubMock = jest.fn();
      successfulProvider.subscribeToOrderFills = jest.fn(() => unsubMock);

      expect(() => {
        muxWithLogger.subscribeToOrderFills({
          providers: [
            ['hyperliquid', successfulProvider as unknown as PerpsProvider],
            ['myx', failingProvider as unknown as PerpsProvider],
          ],
          callback: jest.fn(),
        });
      }).toThrow('Provider 2 failed');

      expect(unsubMock).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            feature: 'perps',
            provider: 'myx',
            method: 'subscribeToOrderFills',
          },
        }),
      );
    });

    it('cleans up successful subscriptions when subscribeToAccount fails for a later provider', () => {
      const unsubMock = jest.fn();
      successfulProvider.subscribeToAccount = jest.fn(() => unsubMock);

      expect(() => {
        muxWithLogger.subscribeToAccount({
          providers: [
            ['hyperliquid', successfulProvider as unknown as PerpsProvider],
            ['myx', failingProvider as unknown as PerpsProvider],
          ],
          callback: jest.fn(),
        });
      }).toThrow('Provider 2 failed');

      expect(unsubMock).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            feature: 'perps',
            provider: 'myx',
            method: 'subscribeToAccount',
          },
        }),
      );
    });

    it('works without a logger (no crash when logger is undefined)', () => {
      const muxNoLogger = new SubscriptionMultiplexer();
      const unsubMock = jest.fn();
      successfulProvider.subscribeToPrices = jest.fn(() => unsubMock);

      expect(() => {
        muxNoLogger.subscribeToPrices({
          symbols: ['BTC'],
          providers: [
            ['hyperliquid', successfulProvider as unknown as PerpsProvider],
            ['myx', failingProvider as unknown as PerpsProvider],
          ],
          callback: jest.fn(),
        });
      }).toThrow('Provider 2 failed');

      // Cleanup still happens even without logger
      expect(unsubMock).toHaveBeenCalled();
    });

    it('cleans up multiple successful subscriptions when a later provider fails', () => {
      const unsubMock1 = jest.fn();
      const unsubMock2 = jest.fn();
      const provider1 = createMockProvider('provider1');
      const provider2 = createMockProvider('provider2');

      provider1.subscribeToPrices = jest.fn(() => unsubMock1);
      provider2.subscribeToPrices = jest.fn(() => unsubMock2);

      expect(() => {
        muxWithLogger.subscribeToPrices({
          symbols: ['BTC'],
          providers: [
            ['hyperliquid', provider1 as unknown as PerpsProvider],
            ['myx', provider2 as unknown as PerpsProvider],
            ['myx', failingProvider as unknown as PerpsProvider],
          ],
          callback: jest.fn(),
        });
      }).toThrow('Provider 2 failed');

      // Both successful subscriptions should be cleaned up
      expect(unsubMock1).toHaveBeenCalled();
      expect(unsubMock2).toHaveBeenCalled();
      // subscribedCount should be 2 since two providers succeeded before the failure
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            data: { subscribedCount: 2 },
          }),
        }),
      );
    });
  });
});
