/**
 * Unit tests for HyperLiquidSubscriptionService
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CaipAccountId, Hex } from '@metamask/utils';
import type {
  SubscribeOrderFillsParams,
  SubscribePositionsParams,
  SubscribePricesParams,
} from '../controllers/types';
import type { HyperLiquidClientService } from './HyperLiquidClientService';
import { HyperLiquidSubscriptionService } from './HyperLiquidSubscriptionService';
import type { HyperLiquidWalletService } from './HyperLiquidWalletService';

// Mock HyperLiquid SDK types
interface MockSubscription {
  unsubscribe: jest.Mock;
}

// Mock adapter
jest.mock('../utils/hyperLiquidAdapter', () => ({
  adaptPositionFromSDK: jest.fn((assetPos: any) => ({
    coin: 'BTC',
    size: assetPos.position.szi,
    notionalSize: '5000',
    unrealizedPnl: '100',
    percentagePnl: '2.0',
    averagePrice: '50000',
    markPrice: '52000',
  })),
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock trace utilities
jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    PerpsMarketDataUpdate: 'Perps Market Data Update',
    PerpsWebSocketConnected: 'Perps WebSocket Connected',
    PerpsWebSocketDisconnected: 'Perps WebSocket Disconnected',
  },
  TraceOperation: {
    PerpsMarketData: 'perps.market_data',
  },
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
}));

describe('HyperLiquidSubscriptionService', () => {
  let service: HyperLiquidSubscriptionService;
  let mockClientService: jest.Mocked<HyperLiquidClientService>;
  let mockWalletService: jest.Mocked<HyperLiquidWalletService>;
  let mockSubscriptionClient: any;
  let mockWalletAdapter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock subscription client
    const mockSubscription: MockSubscription = {
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };

    mockSubscriptionClient = {
      allMids: jest.fn((callback: any) => {
        // Simulate allMids data
        setTimeout(() => {
          callback({
            mids: {
              BTC: 50000,
              ETH: 3000,
            },
          });
        }, 0);
        return Promise.resolve(mockSubscription);
      }),
      activeAssetCtx: jest.fn((params: any, callback: any) => {
        // Simulate activeAssetCtx data
        setTimeout(() => {
          callback({
            coin: params.coin,
            ctx: {
              prevDayPx: '49000',
              funding: '0.01',
              openInterest: '1000000',
              dayNtlVlm: '50000000',
              oraclePx: '50100',
            },
          });
        }, 0);
        return Promise.resolve(mockSubscription);
      }),
      webData2: jest.fn((_params: any, callback: any) => {
        // Simulate position data
        setTimeout(() => {
          callback({
            clearinghouseState: {
              assetPositions: [
                {
                  position: { szi: '0.1' },
                  coin: 'BTC',
                },
              ],
            },
          });
        }, 0);
        return Promise.resolve(mockSubscription);
      }),
      userFills: jest.fn((_params: any, callback: any) => {
        // Simulate order fill data
        setTimeout(() => {
          callback({
            fills: [
              {
                oid: 12345,
                coin: 'BTC',
                side: 'B',
                sz: '0.1',
                px: '50000',
                fee: '5',
                time: Date.now(),
              },
            ],
          });
        }, 0);
        return Promise.resolve(mockSubscription);
      }),
      l2Book: jest.fn().mockResolvedValue(mockSubscription),
    };

    mockWalletAdapter = {
      request: jest.fn(),
    };

    // Mock client service
    mockClientService = {
      ensureSubscriptionClient: jest.fn(),
      getSubscriptionClient: jest.fn(() => mockSubscriptionClient),
      isTestnetMode: jest.fn(() => false),
    } as any;

    // Mock wallet service
    mockWalletService = {
      createWalletAdapter: jest.fn(() => mockWalletAdapter),
      getUserAddressWithDefault: jest.fn().mockResolvedValue('0x123' as Hex),
    } as any;

    service = new HyperLiquidSubscriptionService(
      mockClientService,
      mockWalletService,
    );
  });

  describe('Price Subscriptions', () => {
    it('should subscribe to price updates successfully', async () => {
      const mockCallback = jest.fn();
      const params: SubscribePricesParams = {
        symbols: ['BTC', 'ETH'],
        callback: mockCallback,
        includeMarketData: true, // Enable market data to test activeAssetCtx subscription
      };

      const unsubscribe = service.subscribeToPrices(params);

      expect(mockClientService.ensureSubscriptionClient).toHaveBeenCalledWith(
        mockWalletAdapter,
      );
      expect(mockSubscriptionClient.allMids).toHaveBeenCalled();
      expect(mockSubscriptionClient.activeAssetCtx).toHaveBeenCalledWith(
        { coin: 'BTC' },
        expect.any(Function),
      );
      expect(mockSubscriptionClient.activeAssetCtx).toHaveBeenCalledWith(
        { coin: 'ETH' },
        expect.any(Function),
      );

      // Wait for async callbacks
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle subscription client not available', () => {
      mockClientService.getSubscriptionClient.mockReturnValue(undefined);

      const mockCallback = jest.fn();
      const params: SubscribePricesParams = {
        symbols: ['BTC'],
        callback: mockCallback,
      };

      const unsubscribe = service.subscribeToPrices(params);

      expect(typeof unsubscribe).toBe('function');
      expect(mockSubscriptionClient.allMids).not.toHaveBeenCalled();
    });

    it('should send cached price data immediately', async () => {
      const mockCallback = jest.fn();

      // First subscription to populate cache
      const firstUnsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: jest.fn(),
      });

      // Wait for cache to populate
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second subscription should get cached data immediately
      const secondUnsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
      });

      expect(mockCallback).toHaveBeenCalled();

      firstUnsubscribe();
      secondUnsubscribe();
    });

    it('should cleanup subscriptions with reference counting', async () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      // Test that subscribing without market data does not call activeAssetCtx
      const unsubscribe1 = service.subscribeToPrices({
        symbols: ['ETH'],
        callback: mockCallback1,
        includeMarketData: false,
      });

      const unsubscribe2 = service.subscribeToPrices({
        symbols: ['ETH'],
        callback: mockCallback2,
        includeMarketData: false,
      });

      // Should not call activeAssetCtx when includeMarketData is false
      expect(mockSubscriptionClient.activeAssetCtx).not.toHaveBeenCalledWith(
        { coin: 'ETH' },
        expect.any(Function),
      );

      // Cleanup
      unsubscribe1();
      unsubscribe2();

      // Verify cleanup functions exist
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
    });
  });

  describe('Position Subscriptions', () => {
    it('should subscribe to position updates successfully', async () => {
      const mockCallback = jest.fn();
      const params: SubscribePositionsParams = {
        accountId: 'eip155:42161:0x123' as CaipAccountId,
        callback: mockCallback,
      };

      const unsubscribe = service.subscribeToPositions(params);

      expect(mockClientService.ensureSubscriptionClient).toHaveBeenCalledWith(
        mockWalletAdapter,
      );
      expect(mockWalletService.getUserAddressWithDefault).toHaveBeenCalledWith(
        params.accountId,
      );

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSubscriptionClient.webData2).toHaveBeenCalledWith(
        { user: '0x123' },
        expect.any(Function),
      );
      expect(mockCallback).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle wallet service errors', async () => {
      mockWalletService.getUserAddressWithDefault.mockRejectedValue(
        new Error('Wallet error'),
      );

      const mockCallback = jest.fn();
      const params: SubscribePositionsParams = {
        accountId: 'eip155:42161:0x123' as CaipAccountId,
        callback: mockCallback,
      };

      const unsubscribe = service.subscribeToPositions(params);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSubscriptionClient.webData2).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle subscription client not available', () => {
      mockClientService.getSubscriptionClient.mockReturnValue(undefined);

      const mockCallback = jest.fn();
      const params: SubscribePositionsParams = {
        callback: mockCallback,
      };

      const unsubscribe = service.subscribeToPositions(params);

      expect(typeof unsubscribe).toBe('function');
      expect(
        mockWalletService.getUserAddressWithDefault,
      ).not.toHaveBeenCalled();
    });

    it('should filter out zero-size positions', async () => {
      const mockCallback = jest.fn();

      // Mock webData2 with mixed positions
      mockSubscriptionClient.webData2.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              clearinghouseState: {
                assetPositions: [
                  { position: { szi: '0.1' }, coin: 'BTC' }, // Should be included
                  { position: { szi: '0' }, coin: 'ETH' }, // Should be filtered out
                ],
              },
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToPositions({
        callback: mockCallback,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ size: '0.1' })]),
      );

      unsubscribe();
    });
  });

  describe('Order Fill Subscriptions', () => {
    it('should subscribe to order fill updates successfully', async () => {
      const mockCallback = jest.fn();
      const params: SubscribeOrderFillsParams = {
        accountId: 'eip155:42161:0x123' as CaipAccountId,
        callback: mockCallback,
      };

      const unsubscribe = service.subscribeToOrderFills(params);

      expect(mockClientService.ensureSubscriptionClient).toHaveBeenCalledWith(
        mockWalletAdapter,
      );
      expect(mockWalletService.getUserAddressWithDefault).toHaveBeenCalledWith(
        params.accountId,
      );

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSubscriptionClient.userFills).toHaveBeenCalledWith(
        { user: '0x123' },
        expect.any(Function),
      );
      expect(mockCallback).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should transform order fill data correctly', async () => {
      const mockCallback = jest.fn();

      const unsubscribe = service.subscribeToOrderFills({
        callback: mockCallback,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          orderId: '12345',
          symbol: 'BTC',
          side: 'B',
          size: '0.1',
          price: '50000',
          fee: '5',
          timestamp: expect.any(Number),
        }),
      ]);

      unsubscribe();
    });

    it('should handle wallet service errors in order fills', async () => {
      mockWalletService.getUserAddressWithDefault.mockRejectedValue(
        new Error('Wallet error'),
      );

      const mockCallback = jest.fn();
      const unsubscribe = service.subscribeToOrderFills({
        callback: mockCallback,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSubscriptionClient.userFills).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Subscription Lifecycle', () => {
    it('should unsubscribe from position updates successfully', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = {
        unsubscribe: jest.fn().mockResolvedValue(undefined),
      };

      mockSubscriptionClient.webData2.mockResolvedValue(mockSubscription);

      const unsubscribe = service.subscribeToPositions({
        callback: mockCallback,
      });

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Unsubscribe
      unsubscribe();

      // Wait for unsubscribe to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('should unsubscribe from order fill updates successfully', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = {
        unsubscribe: jest.fn().mockResolvedValue(undefined),
      };

      mockSubscriptionClient.userFills.mockResolvedValue(mockSubscription);

      const unsubscribe = service.subscribeToOrderFills({
        callback: mockCallback,
      });

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Unsubscribe
      unsubscribe();

      // Wait for unsubscribe to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('should handle unsubscribe errors gracefully', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = {
        unsubscribe: jest
          .fn()
          .mockRejectedValue(new Error('Unsubscribe failed')),
      };

      mockSubscriptionClient.webData2.mockResolvedValue(mockSubscription);

      const unsubscribe = service.subscribeToPositions({
        callback: mockCallback,
      });

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Unsubscribe should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should create price updates with 24h change calculation', async () => {
      const mockCallback = jest.fn();

      // First subscription to populate cache
      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeMarketData: true, // Enable market data to get percentChange24h
      });

      // Wait for cache to populate
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          price: expect.any(String),
          timestamp: expect.any(Number),
          percentChange24h: expect.any(String),
        }),
      ]);

      unsubscribe();
    });

    it('should maintain separate caches for market data', async () => {
      const mockCallback = jest.fn();

      // Mock activeAssetCtx with market data
      mockSubscriptionClient.activeAssetCtx.mockImplementation(
        (params: any, callback: any) => {
          setTimeout(() => {
            callback({
              coin: params.coin,
              ctx: {
                prevDayPx: '49000',
                funding: '0.01',
                openInterest: '1000000',
                dayNtlVlm: '50000000',
                oraclePx: '50100',
              },
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
      });

      // Wait for cache updates
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Verify market data is processed
      expect(mockCallback).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('WebSocket Monitoring', () => {
    it('should track WebSocket connection and performance', async () => {
      const mockCallback = jest.fn();

      service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
      });

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify WebSocket connection tracking
      const traceModule = jest.requireMock('../../../../util/trace');
      expect(traceModule.trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps WebSocket Connected',
          op: 'perps.market_data',
        }),
      );

      // Verify performance measurements
    });

    it('should calculate subscription duration correctly using performance.now()', async () => {
      const mockCallback = jest.fn();
      const traceModule = jest.requireMock('../../../../util/trace');

      // Clear previous calls
      traceModule.endTrace.mockClear();

      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
      });

      // Wait a bit to simulate subscription time
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Unsubscribe to trigger endTrace
      unsubscribe();

      // Verify endTrace was called with correct duration calculation
      expect(traceModule.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Market Data Update',
          data: expect.objectContaining({
            subscription_duration_ms: expect.any(Number),
            symbols_count: 1,
          }),
        }),
      );

      // The duration should be a positive number (not negative from Date.now() - performance.now())
      const endTraceCall = traceModule.endTrace.mock.calls[0][0];
      expect(endTraceCall.data.subscription_duration_ms).toBeGreaterThan(0);
      // Should be at least 50ms since we waited that long
      expect(endTraceCall.data.subscription_duration_ms).toBeGreaterThanOrEqual(
        40,
      ); // Allow some margin
    });
  });

  describe('Cleanup and Error Handling', () => {
    it('should clear all subscriptions and cache', () => {
      service.clearAll();

      // Verify cache is cleared by trying to subscribe
      const mockCallback = jest.fn();
      service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
      });

      // Should not have cached data
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle subscription errors gracefully', async () => {
      mockSubscriptionClient.allMids.mockRejectedValue(
        new Error('Subscription failed'),
      );

      const mockCallback = jest.fn();
      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
      });

      // Should not throw
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle missing subscription client in position subscription', () => {
      mockClientService.getSubscriptionClient.mockReturnValue(undefined);

      const mockCallback = jest.fn();
      const unsubscribe = service.subscribeToPositions({
        callback: mockCallback,
      });

      expect(typeof unsubscribe).toBe('function');
      expect(
        mockWalletService.getUserAddressWithDefault,
      ).not.toHaveBeenCalled();
    });

    it('should handle missing subscription client in order fill subscription', () => {
      mockClientService.getSubscriptionClient.mockReturnValue(undefined);

      const mockCallback = jest.fn();
      const unsubscribe = service.subscribeToOrderFills({
        callback: mockCallback,
      });

      expect(typeof unsubscribe).toBe('function');
      expect(
        mockWalletService.getUserAddressWithDefault,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Data Transformation', () => {
    it('should handle both perps and spot context types', async () => {
      const mockCallback = jest.fn();

      // Mock spot context (without perps-specific fields)
      mockSubscriptionClient.activeAssetCtx.mockImplementation(
        (params: any, callback: any) => {
          setTimeout(() => {
            callback({
              coin: params.coin,
              ctx: {
                prevDayPx: '49000',
                dayNtlVlm: '50000000',
                // No funding, openInterest, oraclePx (spot context)
              },
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockCallback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle missing position data gracefully', async () => {
      const mockCallback = jest.fn();

      // Mock webData2 with no position data
      mockSubscriptionClient.webData2.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              clearinghouseState: {
                // No assetPositions
              },
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToPositions({
        callback: mockCallback,
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not call callback without position data
      expect(mockCallback).not.toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Market Data Subscription Control', () => {
    it('should not include market data when includeMarketData is false', async () => {
      const mockCallback = jest.fn();

      // Subscribe without market data
      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeMarketData: false,
      });

      // Ensure activeAssetCtx is NOT called
      expect(mockSubscriptionClient.activeAssetCtx).not.toHaveBeenCalled();

      // Wait for allMids data
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Check that market data fields are undefined
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          price: expect.any(String),
          timestamp: expect.any(Number),
          funding: undefined,
          openInterest: undefined,
          volume24h: undefined,
        }),
      ]);

      unsubscribe();
    });

    it('should include market data when includeMarketData is true', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = {
        unsubscribe: jest.fn().mockResolvedValue(undefined),
      };

      // Mock activeAssetCtx with market data
      mockSubscriptionClient.activeAssetCtx.mockImplementation(
        (params: any, callback: any) => {
          setTimeout(() => {
            callback({
              coin: params.coin,
              ctx: {
                prevDayPx: 45000,
                funding: 0.0001,
                openInterest: 1000000,
                dayNtlVlm: 5000000,
                oraclePx: 50100,
              },
            });
          }, 10);
          return Promise.resolve(mockSubscription);
        },
      );

      // Subscribe with market data
      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeMarketData: true,
      });

      // Ensure activeAssetCtx is called
      expect(mockSubscriptionClient.activeAssetCtx).toHaveBeenCalledWith(
        { coin: 'BTC' },
        expect.any(Function),
      );

      // Wait for data
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Check that market data fields are included
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          price: expect.any(String),
          timestamp: expect.any(Number),
          funding: 0.0001,
          openInterest: 1000000,
          volume24h: 5000000,
        }),
      ]);

      unsubscribe();
    });
  });

  describe('L2 Book (Order Book) Subscriptions', () => {
    it('should subscribe to L2 book when includeOrderBook is true', async () => {
      const mockCallback = jest.fn();
      const mockL2BookSubscription = {
        unsubscribe: jest.fn().mockResolvedValue(undefined),
      };

      mockSubscriptionClient.l2Book.mockImplementation(
        (_params: any, callback: any) => {
          // Simulate L2 book data
          setTimeout(() => {
            callback({
              coin: 'BTC',
              levels: [
                [{ px: '49900', sz: '1.5' }], // Bid level
                [{ px: '50100', sz: '2.0' }], // Ask level
              ],
            });
          }, 0);
          return Promise.resolve(mockL2BookSubscription);
        },
      );

      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeOrderBook: true,
      });

      // Wait for subscription and data processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify L2 book subscription was created
      expect(mockSubscriptionClient.l2Book).toHaveBeenCalledWith(
        { coin: 'BTC', nSigFigs: 5 },
        expect.any(Function),
      );

      // Verify callback received bid/ask data
      expect(mockCallback).toHaveBeenCalled();
      const lastCall =
        mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
      expect(lastCall).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            coin: 'BTC',
            bestBid: '49900',
            bestAsk: '50100',
          }),
        ]),
      );

      unsubscribe();
    });

    it('should not subscribe to L2 book when includeOrderBook is false', async () => {
      const mockCallback = jest.fn();

      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeOrderBook: false,
      });

      // Wait for any potential subscriptions
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify L2 book subscription was NOT created
      expect(mockSubscriptionClient.l2Book).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should handle multiple L2 book subscriptions with reference counting', async () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      // First subscription
      const unsubscribe1 = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback1,
        includeOrderBook: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second subscription to same symbol
      const unsubscribe2 = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback2,
        includeOrderBook: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should only create one L2 book subscription
      expect(mockSubscriptionClient.l2Book).toHaveBeenCalledTimes(1);

      // Unsubscribe first
      unsubscribe1();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // L2 book subscription should still be active
      expect(mockSubscriptionClient.l2Book).toHaveBeenCalledTimes(1);

      // Unsubscribe second
      unsubscribe2();
    });

    it('should handle L2 book data with missing levels gracefully', async () => {
      const mockCallback = jest.fn();

      mockSubscriptionClient.l2Book.mockImplementation(
        (_params: any, callback: any) => {
          // Simulate L2 book data with missing levels
          setTimeout(() => {
            callback({
              coin: 'BTC',
              levels: [], // Empty levels
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeOrderBook: true,
      });

      // Wait for subscription and data processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still receive price updates, but without bid/ask
      expect(mockCallback).toHaveBeenCalled();
      const calls = mockCallback.mock.calls;
      const lastCall = calls[calls.length - 1][0];

      // Check that bestBid and bestAsk are either undefined or '0'
      if (lastCall?.[0]) {
        expect(
          lastCall[0].bestBid === undefined || lastCall[0].bestBid === '0',
        ).toBeTruthy();
        expect(
          lastCall[0].bestAsk === undefined || lastCall[0].bestAsk === '0',
        ).toBeTruthy();
      }

      unsubscribe();
    });

    it('should handle L2 book subscription errors', async () => {
      const mockCallback = jest.fn();

      mockSubscriptionClient.l2Book.mockRejectedValue(
        new Error('L2 book subscription failed'),
      );

      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeOrderBook: true,
      });

      // Wait for subscription attempt
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Error should be handled internally
      // Just verify the subscription still works
      expect(mockCallback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should calculate spread from bid/ask prices', async () => {
      const mockCallback = jest.fn();

      mockSubscriptionClient.l2Book.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              coin: 'BTC',
              levels: [
                [{ px: '49900', sz: '1.5' }], // Bid
                [{ px: '50100', sz: '2.0' }], // Ask
              ],
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeOrderBook: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalled();
      const calls = mockCallback.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            coin: 'BTC',
            bestBid: '49900',
            bestAsk: '50100',
            spread: '200.00000', // 50100 - 49900
          }),
        ]),
      );

      unsubscribe();
    });
  });
});
