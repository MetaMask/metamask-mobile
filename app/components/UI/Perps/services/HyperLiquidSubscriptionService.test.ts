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
import { adaptAccountStateFromSDK } from '../utils/hyperLiquidAdapter';

// Mock HyperLiquid SDK types
interface MockSubscription {
  unsubscribe: jest.Mock;
}

// Mock adapter
jest.mock('../utils/hyperLiquidAdapter', () => ({
  adaptPositionFromSDK: jest.fn((assetPos: any) => ({
    coin: 'BTC',
    size: assetPos.position.szi,
    entryPrice: '50000',
    positionValue: '5000',
    unrealizedPnl: '100',
    marginUsed: '2500',
    leverage: { type: 'isolated', value: 2 },
    liquidationPrice: '40000',
    maxLeverage: 100,
    returnOnEquity: '4.0',
    cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
    takeProfitCount: 0,
    stopLossCount: 0,
  })),
  adaptOrderFromSDK: jest.fn((order: any) => ({
    orderId: order.oid.toString(),
    symbol: order.coin,
    side: order.side === 'B' ? 'buy' : 'sell',
    orderType: 'limit',
    size: order.sz,
    originalSize: order.sz,
    price: order.limitPx || '0',
    filledSize: '0',
    remainingSize: order.sz,
    status: 'open',
    timestamp: Date.now(),
    detailedOrderType: order.orderType || 'Limit',
    isTrigger: false,
    reduceOnly: false,
  })),
  adaptAccountStateFromSDK: jest.fn(() => ({
    availableBalance: '1000.00',
    marginUsed: '500.00',
    unrealizedPnl: '100.00',
    returnOnEquity: '20.0',
    totalBalance: '10100.00',
  })),
  parseAssetName: jest.fn((symbol: string) => ({
    symbol,
    dex: null,
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
  TraceName: {
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
              openInterest: '1000000', // Raw token units from API
              dayNtlVlm: '50000000',
              oraclePx: '50100',
              midPx: '50000', // Price used for openInterest USD conversion: 1M tokens * $50K = $50B
            },
          });
        }, 0);
        return Promise.resolve(mockSubscription);
      }),
      webData3: jest.fn((_params: any, callback: any) => {
        // Simulate webData3 data with perpDexStates structure
        // First callback immediately
        setTimeout(() => {
          callback({
            perpDexStates: [
              {
                clearinghouseState: {
                  assetPositions: [
                    {
                      position: { szi: '0.1' },
                      coin: 'BTC',
                    },
                  ],
                },
                openOrders: [
                  {
                    oid: 12345,
                    coin: 'BTC',
                    side: 'B',
                    sz: '0.5',
                    origSz: '1.0',
                    limitPx: '50000',
                    orderType: 'Limit',
                    timestamp: 1234567890000,
                    isTrigger: false,
                    reduceOnly: false,
                  },
                ],
                perpsAtOpenInterestCap: [],
              },
            ],
          });
        }, 0);

        // Second callback with changed data to ensure updates are triggered
        setTimeout(() => {
          callback({
            perpDexStates: [
              {
                clearinghouseState: {
                  assetPositions: [
                    {
                      position: { szi: '0.2' }, // Changed position size
                      coin: 'BTC',
                    },
                  ],
                },
                openOrders: [
                  {
                    oid: 12346, // Changed order ID
                    coin: 'BTC',
                    side: 'S',
                    sz: '0.3',
                    origSz: '0.5',
                    limitPx: '51000',
                    orderType: 'Limit',
                    timestamp: 1234567890001,
                    isTrigger: false,
                    reduceOnly: false,
                  },
                ],
                perpsAtOpenInterestCap: [],
              },
            ],
          });
        }, 10);

        return Promise.resolve(mockSubscription);
      }),
      webData2: jest.fn((_params: any, callback: any) => {
        // Simulate webData2 data with clearinghouseState (HIP-3 disabled)
        setTimeout(() => {
          callback({
            clearinghouseState: {
              assetPositions: [
                {
                  position: { szi: '0.1' },
                  coin: 'BTC',
                },
              ],
              marginSummary: {
                accountValue: '10000',
                totalMarginUsed: '500',
              },
              withdrawable: '9500',
            },
            openOrders: [
              {
                oid: 12345,
                coin: 'BTC',
                side: 'B',
                sz: '0.5',
                origSz: '1.0',
                limitPx: '50000',
                orderType: 'Limit',
                timestamp: 1234567890000,
                isTrigger: false,
                reduceOnly: false,
              },
            ],
            perpsAtOpenInterestCap: [],
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
      clearinghouseState: jest.fn(() => Promise.resolve(mockSubscription)),
      assetCtxs: jest.fn(() => Promise.resolve(mockSubscription)),
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
      true, // hip3Enabled - test expects webData3
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

      const unsubscribe = await service.subscribeToPrices(params);

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

    it('should handle subscription client not available', async () => {
      mockClientService.getSubscriptionClient.mockReturnValue(undefined);

      const mockCallback = jest.fn();
      const params: SubscribePricesParams = {
        symbols: ['BTC'],
        callback: mockCallback,
      };

      const unsubscribe = await service.subscribeToPrices(params);

      expect(typeof unsubscribe).toBe('function');
      expect(mockSubscriptionClient.allMids).not.toHaveBeenCalled();
    });

    it('should send cached price data immediately', async () => {
      const mockCallback = jest.fn();

      // First subscription to populate cache
      const firstUnsubscribe = await service.subscribeToPrices({
        symbols: ['BTC'],
        callback: jest.fn(),
      });

      // Wait for cache to populate
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second subscription should get cached data immediately
      const secondUnsubscribe = await service.subscribeToPrices({
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
      const unsubscribe1 = await service.subscribeToPrices({
        symbols: ['ETH'],
        callback: mockCallback1,
        includeMarketData: false,
      });

      const unsubscribe2 = await service.subscribeToPrices({
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

      expect(mockWalletService.getUserAddressWithDefault).toHaveBeenCalledWith(
        params.accountId,
      );

      // Wait for async operations (webData3 subscription setup)
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSubscriptionClient.webData3).toHaveBeenCalledWith(
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

      expect(mockSubscriptionClient.webData3).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle subscription client not available', async () => {
      mockClientService.getSubscriptionClient.mockReturnValue(undefined);

      const mockCallback = jest.fn();
      const params: SubscribePositionsParams = {
        callback: mockCallback,
      };

      const unsubscribe = service.subscribeToPositions(params);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(typeof unsubscribe).toBe('function');
      expect(mockSubscriptionClient.webData3).not.toHaveBeenCalled();
    });

    it('should filter out zero-size positions', async () => {
      const mockCallback = jest.fn();

      // Mock webData3 with mixed positions
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      { position: { szi: '0.1' }, coin: 'BTC' }, // Should be included
                      { position: { szi: '0' }, coin: 'ETH' }, // Should be filtered out
                    ],
                  },
                  openOrders: [],
                  perpsAtOpenInterestCap: [],
                },
              ],
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

      expect(mockCallback).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            orderId: '12345',
            symbol: 'BTC',
            side: 'B',
            size: '0.1',
            price: '50000',
            fee: '5',
            timestamp: expect.any(Number),
          }),
        ],
        undefined, // isSnapshot is undefined for mock data without it
      );

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

    it('should handle order fills with liquidation data', async () => {
      const mockCallback = jest.fn();

      // Update mock data to include liquidation
      mockSubscriptionClient.userFills.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              fills: [
                {
                  oid: BigInt(12345),
                  coin: 'BTC',
                  side: 'A',
                  sz: '0.1',
                  px: '45000',
                  fee: '5',
                  time: Date.now(),
                  closedPnl: '-500',
                  dir: 'Close Long',
                  feeToken: 'USDC',
                  liquidation: {
                    liquidatedUser: '0x123',
                    markPx: '44900',
                    method: 'market',
                  },
                },
              ],
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToOrderFills({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            orderId: '12345',
            symbol: 'BTC',
            liquidation: {
              liquidatedUser: '0x123',
              markPx: '44900',
              method: 'market',
            },
          }),
        ],
        undefined, // isSnapshot is undefined for mock data without it
      );

      unsubscribe();
    });

    it('should pass isSnapshot flag to callback', async () => {
      const mockCallback = jest.fn();

      // Update mock data to include isSnapshot: true (snapshot message)
      mockSubscriptionClient.userFills.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              fills: [
                {
                  oid: BigInt(12345),
                  coin: 'BTC',
                  side: 'B',
                  sz: '0.1',
                  px: '50000',
                  fee: '5',
                  time: Date.now(),
                },
              ],
              isSnapshot: true, // This is a snapshot message
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToOrderFills({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.any(Array),
        true, // isSnapshot should be passed through
      );

      unsubscribe();
    });
  });

  describe('Shared WebData3 Subscription', () => {
    it('should share webData3 subscription between positions and orders', async () => {
      const positionCallback = jest.fn();
      const orderCallback = jest.fn();

      // Mock getUserAddressWithDefault to return immediately
      mockWalletService.getUserAddressWithDefault.mockResolvedValue(
        '0x123' as Hex,
      );

      // Subscribe to positions first
      const unsubscribePositions = service.subscribeToPositions({
        callback: positionCallback,
      });

      // Wait for subscription to be established and initial callback
      // This will trigger the first webData3 callback which caches both positions and orders
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Verify position callback was called
      expect(positionCallback).toHaveBeenCalled();

      // Subscribe to orders - should reuse same webData3 subscription
      // and immediately get cached data
      const unsubscribeOrders = service.subscribeToOrders({
        callback: orderCallback,
      });

      // Orders should get cached data immediately (synchronously)
      // or after the second webData3 update with changed data
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should only call webData3 once for shared subscription
      expect(mockSubscriptionClient.webData3).toHaveBeenCalledTimes(1);

      // Both callbacks should be called with their respective data
      expect(positionCallback).toHaveBeenCalled();
      expect(orderCallback).toHaveBeenCalled();

      // Cleanup
      unsubscribePositions();
      unsubscribeOrders();
    });

    it('should maintain subscription when one subscriber unsubscribes', async () => {
      const positionCallback1 = jest.fn();
      const positionCallback2 = jest.fn();

      // Subscribe two position callbacks
      const unsubscribe1 = service.subscribeToPositions({
        callback: positionCallback1,
      });

      const unsubscribe2 = service.subscribeToPositions({
        callback: positionCallback2,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Unsubscribe first callback
      unsubscribe1();

      // Second callback should still receive updates
      mockSubscriptionClient.webData3.mock.calls[0][1]({
        perpDexStates: [
          {
            clearinghouseState: {
              assetPositions: [
                {
                  position: { coin: 'BTC', szi: '1.0' },
                },
              ],
            },
            openOrders: [],
            perpsAtOpenInterestCap: [],
          },
        ],
      });

      expect(positionCallback2).toHaveBeenCalled();

      unsubscribe2();
    });

    it('should cache positions and orders data', async () => {
      const positionCallback = jest.fn();

      // Setup webData3 mock to call callback with data
      mockSubscriptionClient.webData3.mockImplementation(
        (_addr: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      {
                        position: { szi: '1.0' },
                        coin: 'BTC',
                      },
                    ],
                  },
                  openOrders: [
                    {
                      oid: 123,
                      coin: 'BTC',
                      side: 'B',
                      sz: '0.5',
                      origSz: '0.5',
                      limitPx: '50000',
                      orderType: 'Limit',
                      timestamp: Date.now(),
                      isTrigger: false,
                      reduceOnly: false,
                    },
                  ],
                  perpsAtOpenInterestCap: [],
                },
              ],
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToPositions({
        callback: positionCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should receive cached data on new subscription
      const newCallback = jest.fn();
      const unsubscribe2 = service.subscribeToPositions({
        callback: newCallback,
      });

      // New subscriber should get cached data immediately
      expect(newCallback).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ coin: 'BTC' })]),
      );

      unsubscribe();
      unsubscribe2();
    });

    it('uses webData2 subscription when HIP-3 is disabled', async () => {
      // Arrange
      const positionCallback = jest.fn();
      const orderCallback = jest.fn();
      const accountCallback = jest.fn();
      const oiCapCallback = jest.fn();

      // Create service with HIP-3 disabled
      const serviceWithoutHip3 = new HyperLiquidSubscriptionService(
        mockClientService,
        mockWalletService,
        false, // hip3Enabled = false
        [], // enabledDexs
      );

      mockWalletService.getUserAddressWithDefault.mockResolvedValue(
        '0x123' as Hex,
      );

      // Mock webData2 to call callback with clearinghouseState data
      mockSubscriptionClient.webData2.mockImplementation(
        (_addr: any, callback: any) => {
          setTimeout(() => {
            callback({
              clearinghouseState: {
                assetPositions: [
                  {
                    position: {
                      coin: 'BTC',
                      szi: '1.5',
                      entryPx: '50000',
                      positionValue: '75000',
                      unrealizedPnl: '5000',
                      returnOnEquity: '0.1',
                      leverage: { type: 'cross', value: 10 },
                      liquidationPx: '45000',
                      marginUsed: '7500',
                    },
                  },
                ],
                marginSummary: {
                  accountValue: '100000',
                  totalMarginUsed: '7500',
                  totalNtlPos: '75000',
                  totalRawUsd: '100000',
                },
                withdrawable: '92500',
                crossMarginSummary: {
                  accountValue: '100000',
                  totalMarginUsed: '7500',
                  totalNtlPos: '75000',
                  totalRawUsd: '100000',
                },
                time: Date.now(),
              },
              openOrders: [
                {
                  oid: 456,
                  coin: 'ETH',
                  side: 'A',
                  sz: '2.0',
                  origSz: '2.0',
                  limitPx: '3000',
                  orderType: 'Limit',
                  timestamp: Date.now(),
                  isTrigger: false,
                  reduceOnly: false,
                },
              ],
              perpsAtOpenInterestCap: ['BTC', 'DOGE'],
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      // Act
      const unsubscribePositions = serviceWithoutHip3.subscribeToPositions({
        callback: positionCallback,
      });
      const unsubscribeOrders = serviceWithoutHip3.subscribeToOrders({
        callback: orderCallback,
      });
      const unsubscribeAccount = serviceWithoutHip3.subscribeToAccount({
        callback: accountCallback,
      });
      const unsubscribeOICaps = serviceWithoutHip3.subscribeToOICaps({
        callback: oiCapCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Assert
      expect(mockSubscriptionClient.webData2).toHaveBeenCalledTimes(1);
      expect(mockSubscriptionClient.webData2).toHaveBeenCalledWith(
        { user: '0x123' },
        expect.any(Function),
      );
      expect(mockSubscriptionClient.webData3).not.toHaveBeenCalled();

      expect(positionCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            coin: 'BTC',
            size: '1.5',
          }),
        ]),
      );

      expect(orderCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            orderId: '456',
            symbol: 'ETH',
          }),
        ]),
      );

      expect(accountCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          totalBalance: expect.any(String),
          marginUsed: expect.any(String),
        }),
      );

      expect(oiCapCallback).toHaveBeenCalledWith(['BTC', 'DOGE']);

      // Cleanup
      unsubscribePositions();
      unsubscribeOrders();
      unsubscribeAccount();
      unsubscribeOICaps();
    });
  });

  describe('Subscription Lifecycle', () => {
    it('should unsubscribe from position updates successfully', async () => {
      const mockCallback = jest.fn();
      const mockSubscription = {
        unsubscribe: jest.fn().mockResolvedValue(undefined),
      };

      mockSubscriptionClient.webData3.mockResolvedValue(mockSubscription);

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

      mockSubscriptionClient.webData3.mockResolvedValue(mockSubscription);

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
      const unsubscribe = await service.subscribeToPrices({
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

      const unsubscribe = await service.subscribeToPrices({
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

  describe('Cleanup and Error Handling', () => {
    it('should clear all subscriptions and cache', async () => {
      service.clearAll();

      // Verify cache is cleared by trying to subscribe
      const mockCallback = jest.fn();
      await service.subscribeToPrices({
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
      const unsubscribe = await service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
      });

      // Should not throw
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle missing subscription client in position subscription', async () => {
      mockClientService.getSubscriptionClient.mockReturnValue(undefined);

      const mockCallback = jest.fn();
      const unsubscribe = service.subscribeToPositions({
        callback: mockCallback,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(typeof unsubscribe).toBe('function');
      expect(mockSubscriptionClient.webData3).not.toHaveBeenCalled();
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

      const unsubscribe = await service.subscribeToPrices({
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

      // Mock webData3 with no position data
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [], // Empty array instead of undefined
                  },
                  openOrders: [], // Also need openOrders array
                  perpsAtOpenInterestCap: [],
                },
              ],
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

      // Should call callback with empty positions to fix loading state
      // This ensures the UI can transition from loading to empty state for new users without cached positions
      expect(mockCallback).toHaveBeenCalledWith([]);

      // Verify it was only called once (not repeatedly)
      expect(mockCallback).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });

  describe('Market Data Subscription Control', () => {
    it('should not include market data when includeMarketData is false', async () => {
      const mockCallback = jest.fn();

      // Subscribe without market data
      const unsubscribe = await service.subscribeToPrices({
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
                openInterest: 1000000, // Raw token units from API
                dayNtlVlm: 5000000,
                oraclePx: 50100,
                midPx: 50000, // Price used for openInterest USD conversion: 1M tokens * $50K = $50B
              },
            });
          }, 10);
          return Promise.resolve(mockSubscription);
        },
      );

      // Subscribe with market data
      const unsubscribe = await service.subscribeToPrices({
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
          openInterest: 50000000000, // 1M tokens * $50K price = $50B
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

      const unsubscribe = await service.subscribeToPrices({
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

      const unsubscribe = await service.subscribeToPrices({
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
      const unsubscribe1 = await service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback1,
        includeOrderBook: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second subscription to same symbol
      const unsubscribe2 = await service.subscribeToPrices({
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

      const unsubscribe = await service.subscribeToPrices({
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

      const unsubscribe = await service.subscribeToPrices({
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

      const unsubscribe = await service.subscribeToPrices({
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

  describe('TP/SL Order Processing', () => {
    it('should process Take Profit orders correctly', async () => {
      const mockCallback = jest.fn();

      // Mock webData3 with TP/SL trigger orders
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      {
                        position: { szi: '1.0', coin: 'BTC' },
                        coin: 'BTC',
                      },
                    ],
                  },
                  openOrders: [
                    {
                      oid: 123,
                      coin: 'BTC',
                      side: 'S', // Sell order (opposite of long position)
                      sz: '1.0',
                      triggerPx: '55000', // Take profit trigger price
                      orderType: 'Take Profit',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                  ],
                  perpsAtOpenInterestCap: [],
                },
              ],
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

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should receive position with takeProfitPrice set
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          takeProfitPrice: '55000',
          takeProfitCount: 1,
          stopLossCount: 0,
        }),
      ]);

      unsubscribe();
    });

    it('should process Stop Loss orders correctly', async () => {
      const mockCallback = jest.fn();

      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      {
                        position: { szi: '1.0', coin: 'BTC' },
                        coin: 'BTC',
                      },
                    ],
                  },
                  openOrders: [
                    {
                      oid: 124,
                      coin: 'BTC',
                      side: 'S',
                      sz: '1.0',
                      triggerPx: '45000', // Stop loss trigger price
                      orderType: 'Stop',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                  ],
                  perpsAtOpenInterestCap: [],
                },
              ],
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

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should receive position with stopLossPrice set
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          stopLossPrice: '45000',
          takeProfitCount: 0,
          stopLossCount: 1,
        }),
      ]);

      unsubscribe();
    });

    it('should handle multiple TP/SL orders for same position', async () => {
      const mockCallback = jest.fn();

      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      {
                        position: { szi: '2.0', coin: 'BTC' },
                        coin: 'BTC',
                      },
                    ],
                  },
                  openOrders: [
                    {
                      oid: 125,
                      coin: 'BTC',
                      side: 'S',
                      sz: '1.0',
                      triggerPx: '55000',
                      orderType: 'Take Profit',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                    {
                      oid: 126,
                      coin: 'BTC',
                      side: 'S',
                      sz: '1.0',
                      triggerPx: '56000',
                      orderType: 'Take Profit',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                    {
                      oid: 127,
                      coin: 'BTC',
                      side: 'S',
                      sz: '0.5',
                      triggerPx: '45000',
                      orderType: 'Stop',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                  ],
                  perpsAtOpenInterestCap: [],
                },
              ],
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

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should receive position with correct counts but only last TP/SL prices
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          takeProfitCount: 2,
          stopLossCount: 1,
          // Should have the last processed prices
          takeProfitPrice: expect.any(String),
          stopLossPrice: '45000',
        }),
      ]);

      unsubscribe();
    });

    it('should fallback to price-based TP/SL detection when orderType is ambiguous', async () => {
      const mockCallback = jest.fn();

      // Mock the adapter to include entryPrice before setting up webData3 mock
      const mockAdapter = jest.requireMock('../utils/hyperLiquidAdapter');
      mockAdapter.adaptPositionFromSDK.mockImplementationOnce(() => ({
        coin: 'BTC',
        size: '1.0',
        entryPrice: '50000',
        positionValue: '50000',
        unrealizedPnl: '5000',
        marginUsed: '25000',
        leverage: { type: 'cross', value: 2 },
        liquidationPrice: '40000',
        maxLeverage: 100,
        returnOnEquity: '10.0',
        cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
        takeProfitCount: 0,
        stopLossCount: 0,
      }));

      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      {
                        position: {
                          szi: '1.0',
                          coin: 'BTC',
                          entryPrice: '50000', // Entry price for comparison
                        },
                        coin: 'BTC',
                      },
                    ],
                  },
                  openOrders: [
                    {
                      oid: 128,
                      coin: 'BTC',
                      side: 'S',
                      sz: '1.0',
                      triggerPx: '55000', // Above entry price = Take Profit for long
                      orderType: 'Trigger', // Ambiguous order type
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                    {
                      oid: 129,
                      coin: 'BTC',
                      side: 'S',
                      sz: '1.0',
                      triggerPx: '45000', // Below entry price = Stop Loss for long
                      orderType: 'Trigger', // Ambiguous order type
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                  ],
                  perpsAtOpenInterestCap: [],
                },
              ],
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

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should correctly identify TP/SL based on trigger price vs entry price
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          takeProfitPrice: '55000', // Above entry price
          stopLossPrice: '45000', // Below entry price
          takeProfitCount: 0, // Count is handled separately in the service
          stopLossCount: 0, // Count is handled separately in the service
        }),
      ]);

      unsubscribe();
    });

    it('should handle short position TP/SL logic correctly', async () => {
      const mockCallback = jest.fn();

      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      {
                        position: {
                          szi: '-1.0', // Short position (negative size)
                          coin: 'BTC',
                          entryPrice: '50000',
                        },
                        coin: 'BTC',
                      },
                    ],
                  },
                  openOrders: [
                    {
                      oid: 130,
                      coin: 'BTC',
                      side: 'B', // Buy order (opposite of short position)
                      sz: '1.0',
                      triggerPx: '45000', // Below entry price = Take Profit for short
                      orderType: 'Trigger',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                    {
                      oid: 131,
                      coin: 'BTC',
                      side: 'B',
                      sz: '1.0',
                      triggerPx: '55000', // Above entry price = Stop Loss for short
                      orderType: 'Trigger',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                  ],
                  perpsAtOpenInterestCap: [],
                },
              ],
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      // Mock the adapter for short position
      const mockAdapter = jest.requireMock('../utils/hyperLiquidAdapter');
      mockAdapter.adaptPositionFromSDK.mockImplementationOnce(() => ({
        coin: 'BTC',
        size: '-1.0', // Short position
        entryPrice: '50000',
        positionValue: '50000',
        unrealizedPnl: '5000',
        marginUsed: '25000',
        leverage: { type: 'cross', value: 2 },
        liquidationPrice: '60000',
        maxLeverage: 100,
        returnOnEquity: '10.0',
        cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
        takeProfitCount: 0,
        stopLossCount: 0,
      }));

      const unsubscribe = service.subscribeToPositions({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // For short positions: TP when trigger < entry, SL when trigger > entry
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          takeProfitPrice: '45000', // Below entry price for short
          stopLossPrice: '55000', // Above entry price for short
          takeProfitCount: 0, // Count is handled separately in the service
          stopLossCount: 0, // Count is handled separately in the service
        }),
      ]);

      unsubscribe();
    });

    it('should include TP/SL orders in the orders list', async () => {
      const mockCallback = jest.fn();

      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      {
                        position: { szi: '1.0', coin: 'BTC' },
                        coin: 'BTC',
                      },
                    ],
                  },
                  openOrders: [
                    {
                      oid: 132,
                      coin: 'BTC',
                      side: 'S',
                      sz: '1.0',
                      triggerPx: '55000',
                      orderType: 'Take Profit',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                    {
                      oid: 133,
                      coin: 'BTC',
                      side: 'B',
                      sz: '0.5',
                      limitPx: '49000',
                      orderType: 'Limit',
                      reduceOnly: false,
                      isPositionTpsl: false,
                    },
                  ],
                  perpsAtOpenInterestCap: [],
                },
              ],
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      const unsubscribe = service.subscribeToOrders({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should include both TP/SL and regular orders
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          orderId: '132',
          symbol: 'BTC',
          detailedOrderType: 'Take Profit',
        }),
        expect.objectContaining({
          orderId: '133',
          symbol: 'BTC',
          detailedOrderType: 'Limit',
        }),
      ]);

      unsubscribe();
    });

    it('should handle positions without matching TP/SL orders', async () => {
      const mockCallback = jest.fn();

      // Mock the adapter to return both positions
      const mockAdapter = jest.requireMock('../utils/hyperLiquidAdapter');
      mockAdapter.adaptPositionFromSDK
        .mockImplementationOnce((_assetPos: any) => ({
          coin: 'BTC',
          size: '1.0',
          entryPrice: '50000',
          positionValue: '50000',
          unrealizedPnl: '5000',
          marginUsed: '25000',
          leverage: { type: 'cross', value: 2 },
          liquidationPrice: '40000',
          maxLeverage: 100,
          returnOnEquity: '10.0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        }))
        .mockImplementationOnce(() => ({
          coin: 'ETH',
          size: '2.0',
          entryPrice: '3000',
          positionValue: '6000',
          unrealizedPnl: '1000',
          marginUsed: '3000',
          leverage: { type: 'isolated', value: 2 },
          liquidationPrice: '2500',
          maxLeverage: 50,
          returnOnEquity: '16.7',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        }));

      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: {
                    assetPositions: [
                      {
                        position: { szi: '1.0', coin: 'BTC' },
                        coin: 'BTC',
                      },
                      {
                        position: { szi: '2.0', coin: 'ETH' },
                        coin: 'ETH',
                      },
                    ],
                  },
                  openOrders: [
                    {
                      oid: 134,
                      coin: 'BTC', // Only BTC has TP/SL orders
                      side: 'S',
                      sz: '1.0',
                      triggerPx: '55000',
                      orderType: 'Take Profit',
                      reduceOnly: true,
                      isPositionTpsl: true,
                    },
                  ],
                  perpsAtOpenInterestCap: [],
                },
              ],
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

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should handle positions with and without TP/SL
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          coin: 'BTC',
          takeProfitPrice: '55000',
          takeProfitCount: 1,
          stopLossCount: 0,
        }),
        expect.objectContaining({
          coin: 'ETH',
          takeProfitPrice: undefined,
          stopLossPrice: undefined,
          takeProfitCount: 0,
          stopLossCount: 0,
        }),
      ]);

      unsubscribe();
    });
  });

  describe('Race condition prevention', () => {
    it('should prevent duplicate allMids subscriptions when multiple subscribeToPrices calls happen simultaneously', async () => {
      const callbacks = [jest.fn(), jest.fn(), jest.fn()];
      const unsubscribes: (() => void)[] = [];

      // Call subscribeToPrices multiple times simultaneously
      const subscribePromises = callbacks.map(async (callback) => {
        const unsubscribe = await service.subscribeToPrices({
          symbols: ['BTC'],
          callback,
        });
        unsubscribes.push(unsubscribe);
        return new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Wait for all subscriptions to complete
      await Promise.all(subscribePromises);

      // Should only create one allMids subscription despite multiple simultaneous calls
      expect(mockSubscriptionClient.allMids).toHaveBeenCalledTimes(1);

      // All callbacks should still work
      await new Promise((resolve) => setTimeout(resolve, 50));
      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalled();
      });

      // Cleanup
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    });

    it('should retry allMids subscription if initial attempt fails', async () => {
      const callback = jest.fn();
      const mockUnsubscribeFn = jest.fn();
      const mockSubscriptionObj = {
        unsubscribe: mockUnsubscribeFn,
      };

      // Make first attempt fail
      mockSubscriptionClient.allMids.mockImplementationOnce(() =>
        Promise.reject(new Error('Connection failed')),
      );

      // Second attempt succeeds
      mockSubscriptionClient.allMids.mockImplementationOnce((cb: any) => {
        setTimeout(() => {
          cb({
            mids: {
              BTC: '50000',
            },
          });
        }, 10);
        return Promise.resolve(mockSubscriptionObj);
      });

      // First subscription attempt
      const unsubscribe1 = await service.subscribeToPrices({
        symbols: ['BTC'],
        callback,
      });

      // Wait for first attempt to fail
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Second subscription attempt should retry
      const unsubscribe2 = await service.subscribeToPrices({
        symbols: ['ETH'],
        callback,
      });

      // Wait for second attempt to succeed
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have tried twice total
      expect(mockSubscriptionClient.allMids).toHaveBeenCalledTimes(2);

      // Cleanup
      unsubscribe1();
      unsubscribe2();
    });
  });

  it('should not repeatedly notify subscribers with empty positions', async () => {
    const mockCallback = jest.fn();

    // Mock webData3 to send multiple empty updates
    mockSubscriptionClient.webData3.mockImplementation(
      (_params: any, callback: any) => {
        // Send first update
        setTimeout(() => {
          callback({
            perpDexStates: [
              {
                clearinghouseState: {
                  assetPositions: [],
                },
                openOrders: [],
                perpsAtOpenInterestCap: [],
              },
            ],
          });
        }, 0);

        // Send second update (still empty)
        setTimeout(() => {
          callback({
            perpDexStates: [
              {
                clearinghouseState: {
                  assetPositions: [],
                },
                openOrders: [],
                perpsAtOpenInterestCap: [],
              },
            ],
          });
        }, 20);

        return Promise.resolve({
          unsubscribe: jest.fn().mockResolvedValue(undefined),
        });
      },
    );

    const unsubscribe = service.subscribeToPositions({
      callback: mockCallback,
    });

    // Wait for both updates to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should only be called once with empty positions (initial notification)
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith([]);

    unsubscribe();
  });

  it('should notify price subscribers on first update even with zero prices', async () => {
    const mockCallback = jest.fn();

    // Mock allMids with zero prices
    mockSubscriptionClient.allMids.mockImplementation((callback: any) => {
      // Send first update
      setTimeout(() => {
        callback({
          mids: {
            BTC: '0',
            ETH: '0',
          },
        });
      }, 0);
      return Promise.resolve({
        unsubscribe: jest.fn().mockResolvedValue(undefined),
      });
    });

    const unsubscribe = await service.subscribeToPrices({
      symbols: ['BTC', 'ETH'],
      callback: mockCallback,
    });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should call callback with zero prices to enable UI state
    expect(mockCallback).toHaveBeenCalledWith([
      expect.objectContaining({
        coin: 'BTC',
        price: '0',
      }),
      expect.objectContaining({
        coin: 'ETH',
        price: '0',
      }),
    ]);

    unsubscribe();
  });

  describe('HIP-3 Feature Flags and Multi-DEX Support', () => {
    it('initializes service with HIP-3 DEXs enabled', () => {
      const hip3Service = new HyperLiquidSubscriptionService(
        mockClientService,
        mockWalletService,
        true, // hip3Enabled
        ['dex1', 'dex2'], // enabledDexs
      );

      expect(hip3Service).toBeDefined();
    });

    it('returns only main DEX when equity is disabled', () => {
      const service = new HyperLiquidSubscriptionService(
        mockClientService,
        mockWalletService,
        false, // hip3Enabled
        [],
      );

      expect(service).toBeDefined();
    });

    it('updates feature flags and establishes new DEX subscriptions', async () => {
      // Start with market data subscribers to trigger assetCtxs subscriptions
      const mockCallback = jest.fn();
      const mockInfoClient = {
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC' }, { name: 'ETH' }],
        }),
      };
      mockClientService.getInfoClient = jest.fn(() => mockInfoClient as any);

      const assetCtxsSubscription = {
        unsubscribe: jest.fn().mockResolvedValue(undefined),
      };
      mockSubscriptionClient.assetCtxs = jest
        .fn()
        .mockResolvedValue(assetCtxsSubscription);

      // Subscribe to prices with market data to create market data subscribers
      await service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeMarketData: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Now update feature flags to enable new DEXs
      await service.updateFeatureFlags(true, ['newdex1', 'newdex2'], [], []);

      expect(mockInfoClient.meta).toHaveBeenCalledWith({ dex: 'newdex1' });
      expect(mockInfoClient.meta).toHaveBeenCalledWith({ dex: 'newdex2' });
    });

    it('handles errors when establishing assetCtxs subscriptions for new DEXs', async () => {
      const mockCallback = jest.fn();

      // Mock successful meta call but failing assetCtxs subscription
      const mockInfoClient = {
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC' }],
        }),
      };
      mockClientService.getInfoClient = jest.fn(() => mockInfoClient as any);

      // Make assetCtxs subscription fail
      mockSubscriptionClient.assetCtxs = jest
        .fn()
        .mockRejectedValue(new Error('AssetCtxs subscription failed'));

      // Subscribe to prices with market data to create market data subscribers
      await service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeMarketData: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update feature flags - should handle error gracefully without throwing
      await service.updateFeatureFlags(true, ['failingdex'], [], []);

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Verify updateFeatureFlags completed without throwing
      expect(mockInfoClient.meta).toHaveBeenCalledWith({ dex: 'failingdex' });
    });

    it('handles errors when establishing clearinghouseState subscriptions for new DEXs', async () => {
      const mockPositionCallback = jest.fn();
      mockSubscriptionClient.clearinghouseState = jest
        .fn()
        .mockRejectedValue(new Error('Subscription failed'));

      // Subscribe to positions first
      service.subscribeToPositions({
        callback: mockPositionCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Update feature flags - should handle error gracefully
      await expect(
        service.updateFeatureFlags(true, ['failingdex2'], [], []),
      ).resolves.not.toThrow();
    });

    it('handles getUserAddress errors during feature flag updates', async () => {
      const mockPositionCallback = jest.fn();
      mockWalletService.getUserAddressWithDefault.mockRejectedValue(
        new Error('Wallet error'),
      );

      // Subscribe to positions first
      service.subscribeToPositions({
        callback: mockPositionCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update feature flags - should handle wallet error gracefully
      await expect(
        service.updateFeatureFlags(true, ['newdex'], [], []),
      ).resolves.not.toThrow();

      // Reset mock for other tests
      mockWalletService.getUserAddressWithDefault.mockResolvedValue(
        '0x123' as Hex,
      );
    });

    it('does not establish subscriptions when no new DEXs are added', async () => {
      const mockCallback = jest.fn();
      await service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeMarketData: true,
      });

      const initialCallCount = mockSubscriptionClient.assetCtxs
        ? (mockSubscriptionClient.assetCtxs as jest.Mock).mock.calls.length
        : 0;

      // Update with same DEXs (no new ones)
      await service.updateFeatureFlags(false, [], [], []);

      // Should not create new subscriptions
      const finalCallCount = mockSubscriptionClient.assetCtxs
        ? (mockSubscriptionClient.assetCtxs as jest.Mock).mock.calls.length
        : 0;
      expect(finalCallCount).toBe(initialCallCount);
    });
  });

  describe('Market Data Cache Initialization', () => {
    it('caches funding rates from initial market data', async () => {
      const mockCallback = jest.fn();
      const mockInfoClient = {
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC' }, { name: 'ETH' }, { name: 'SOL' }],
        }),
        metaAndAssetCtxs: jest.fn().mockResolvedValue([
          {}, // meta object (first element)
          [
            // assetCtxs array (second element)
            {
              funding: '0.0001',
              prevDayPx: '49000',
              openInterest: '1000000',
              dayNtlVlm: '50000000',
              oraclePx: '50100',
            },
            {
              funding: '0.0002',
              prevDayPx: '2900',
              openInterest: '500000',
              dayNtlVlm: '10000000',
              oraclePx: '3010',
            },
            {
              funding: '0.00015',
              prevDayPx: '95',
              openInterest: '200000',
              dayNtlVlm: '5000000',
              oraclePx: '98',
            },
          ],
        ]),
      };

      mockClientService.getInfoClient = jest.fn(() => mockInfoClient as any);

      const unsubscribe = await service.subscribeToPrices({
        symbols: ['BTC', 'ETH', 'SOL'],
        callback: mockCallback,
        includeMarketData: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Verify meta was called to cache funding rates
      expect(mockInfoClient.meta).toHaveBeenCalled();
      expect(mockInfoClient.metaAndAssetCtxs).toHaveBeenCalled();

      unsubscribe();
    });

    it('handles errors when caching initial market data', async () => {
      const mockCallback = jest.fn();
      const mockInfoClient = {
        meta: jest.fn().mockRejectedValue(new Error('Meta fetch failed')),
        metaAndAssetCtxs: jest
          .fn()
          .mockRejectedValue(new Error('AssetCtxs fetch failed')),
      };

      mockClientService.getInfoClient = jest.fn(() => mockInfoClient as any);

      // Should not throw even if initial cache fails
      const unsubscribe = await service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeMarketData: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Subscription should still work despite cache error
      expect(unsubscribe).toBeDefined();
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('skips caching when includeMarketData is false', async () => {
      const mockCallback = jest.fn();
      const mockInfoClient = {
        meta: jest.fn(),
        metaAndAssetCtxs: jest.fn(),
      };

      mockClientService.getInfoClient = jest.fn(() => mockInfoClient as any);

      const unsubscribe = await service.subscribeToPrices({
        symbols: ['BTC'],
        callback: mockCallback,
        includeMarketData: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should not call meta/metaAndAssetCtxs when market data not requested
      expect(mockInfoClient.meta).not.toHaveBeenCalled();
      expect(mockInfoClient.metaAndAssetCtxs).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('handles partial market data in cache', async () => {
      const mockCallback = jest.fn();
      const mockInfoClient = {
        meta: jest.fn().mockResolvedValue({
          universe: [{ name: 'BTC' }, { name: 'ETH' }],
        }),
        metaAndAssetCtxs: jest.fn().mockResolvedValue([
          {},
          [
            {
              funding: '0.0001',
              prevDayPx: '49000',
            },
            null, // Missing asset context for ETH
          ],
        ]),
      };

      mockClientService.getInfoClient = jest.fn(() => mockInfoClient as any);

      const unsubscribe = await service.subscribeToPrices({
        symbols: ['BTC', 'ETH'],
        callback: mockCallback,
        includeMarketData: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should handle partial data gracefully
      expect(mockCallback).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Multi-DEX Error Handling', () => {
    it('handles webData3 subscription errors gracefully', async () => {
      const mockCallback = jest.fn();
      mockSubscriptionClient.webData3 = jest
        .fn()
        .mockRejectedValue(new Error('WebData3 subscription failed'));

      const unsubscribe = service.subscribeToPositions({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should return unsubscribe function despite error
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('handles clearinghouseState subscription errors for HIP-3 DEXs', async () => {
      const mockCallback = jest.fn();
      mockSubscriptionClient.clearinghouseState = jest
        .fn()
        .mockRejectedValue(new Error('ClearinghouseState subscription failed'));

      // Create service with HIP-3 enabled
      const hip3Service = new HyperLiquidSubscriptionService(
        mockClientService,
        mockWalletService,
        true,
        ['failingdex'],
      );

      const unsubscribe = hip3Service.subscribeToPositions({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 30));

      // Should handle error gracefully
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('handles unsubscribe errors for HIP-3 clearinghouseState', async () => {
      const mockCallback = jest.fn();
      const mockInfoClient = {
        frontendOpenOrders: jest.fn().mockResolvedValue([]),
      };
      mockClientService.getInfoClient = jest.fn(() => mockInfoClient as any);

      const clearinghouseStateSubscription = {
        unsubscribe: jest
          .fn()
          .mockRejectedValue(new Error('Unsubscribe failed')),
      };

      mockSubscriptionClient.clearinghouseState = jest.fn(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              user: '0x123',
              clearinghouseState: {
                assetPositions: [],
              },
            });
          }, 0);
          return Promise.resolve(clearinghouseStateSubscription);
        },
      );

      // Create service with HIP-3 enabled
      const hip3Service = new HyperLiquidSubscriptionService(
        mockClientService,
        mockWalletService,
        true,
        ['testdex'],
      );

      const unsubscribe = hip3Service.subscribeToPositions({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 30));

      // Unsubscribe should not throw even if underlying unsubscribe fails
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Cache Initialization Checks', () => {
    it('returns false for OI caps cache before initialization', () => {
      const result = service.isOICapsCacheInitialized();

      expect(result).toBe(false);
    });

    it('returns false for orders cache before initialization', () => {
      const result = service.isOrdersCacheInitialized();

      expect(result).toBe(false);
    });

    it('returns false for positions cache before initialization', () => {
      const result = service.isPositionsCacheInitialized();

      expect(result).toBe(false);
    });

    it('returns null for cached positions before initialization', () => {
      const result = service.getCachedPositions();

      expect(result).toBeNull();
    });

    it('returns null for cached orders before initialization', () => {
      const result = service.getCachedOrders();

      expect(result).toBeNull();
    });
  });

  describe('OI Cap Subscriptions', () => {
    it('subscribes to OI cap updates successfully', async () => {
      const mockCallback = jest.fn();

      const unsubscribe = service.subscribeToOICaps({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSubscriptionClient.webData3).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('immediately provides cached OI caps if available', async () => {
      const mockCallback = jest.fn();

      // Mock webData3 to provide OI caps data
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          setTimeout(() => {
            callback({
              perpDexStates: [
                {
                  clearinghouseState: { assetPositions: [] },
                  openOrders: [],
                  perpsAtOpenInterestCap: ['BTC', 'ETH'],
                },
              ],
            });
          }, 0);
          return Promise.resolve({
            unsubscribe: jest.fn().mockResolvedValue(undefined),
          });
        },
      );

      // First subscription to populate cache
      const unsubscribe1 = service.subscribeToOICaps({ callback: jest.fn() });
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Second subscription should get cached data immediately
      const unsubscribe2 = service.subscribeToOICaps({
        callback: mockCallback,
      });

      expect(mockCallback).toHaveBeenCalledWith(['BTC', 'ETH']);

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('Account Subscriptions', () => {
    it('subscribes to account updates successfully', async () => {
      const mockCallback = jest.fn();

      const unsubscribe = service.subscribeToAccount({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockSubscriptionClient.webData3).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('immediately provides cached account state if available', async () => {
      const mockCallback = jest.fn();

      // First subscription to populate cache
      const unsubscribe1 = service.subscribeToAccount({
        callback: jest.fn(),
      });
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Second subscription should get cached data immediately
      const unsubscribe2 = service.subscribeToAccount({
        callback: mockCallback,
      });

      expect(mockCallback).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('aggregateAccountStates - returnOnEquity calculation', () => {
    it('calculates positive ROE when unrealizedPnl is positive', async () => {
      // Override the adapter mock
      jest.mocked(adaptAccountStateFromSDK).mockImplementation(() => ({
        availableBalance: '100',
        totalBalance: '1100',
        marginUsed: '1000',
        unrealizedPnl: '100',
        returnOnEquity: '10.0',
      }));

      const mockCallback = jest.fn();

      // Mock webData3
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          const mockData = {
            perpDexStates: [
              {
                clearinghouseState: { assetPositions: [] },
                openOrders: [],
                perpsAtOpenInterestCap: [],
              },
            ],
          };

          setTimeout(() => callback(mockData), 10);
          return { unsubscribe: jest.fn() };
        },
      );

      const unsubscribe = service.subscribeToAccount({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalled();
      const accountState = mockCallback.mock.calls[0][0];
      expect(accountState.marginUsed).toBe('1000');
      expect(accountState.unrealizedPnl).toBe('100');
      expect(accountState.returnOnEquity).toBe('10.0');

      unsubscribe();
    });

    it('calculates negative ROE when unrealizedPnl is negative', async () => {
      // Override the adapter mock
      jest.mocked(adaptAccountStateFromSDK).mockImplementation(() => ({
        availableBalance: '0',
        totalBalance: '950',
        marginUsed: '1000',
        unrealizedPnl: '-50',
        returnOnEquity: '-5.0',
      }));

      const mockCallback = jest.fn();

      // Mock webData3
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          const mockData = {
            perpDexStates: [
              {
                clearinghouseState: { assetPositions: [] },
                openOrders: [],
                perpsAtOpenInterestCap: [],
              },
            ],
          };

          setTimeout(() => callback(mockData), 10);
          return { unsubscribe: jest.fn() };
        },
      );

      const unsubscribe = service.subscribeToAccount({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalled();
      const accountState = mockCallback.mock.calls[0][0];
      expect(accountState.marginUsed).toBe('1000');
      expect(accountState.unrealizedPnl).toBe('-50');
      expect(accountState.returnOnEquity).toBe('-5.0');

      unsubscribe();
    });

    it('returns zero ROE when marginUsed is zero', async () => {
      // Override the adapter mock
      jest.mocked(adaptAccountStateFromSDK).mockImplementation(() => ({
        availableBalance: '1000',
        totalBalance: '1000',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
      }));

      const mockCallback = jest.fn();

      // Mock webData3
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          const mockData = {
            perpDexStates: [
              {
                clearinghouseState: { assetPositions: [] },
                openOrders: [],
                perpsAtOpenInterestCap: [],
              },
            ],
          };

          setTimeout(() => callback(mockData), 10);
          return { unsubscribe: jest.fn() };
        },
      );

      const unsubscribe = service.subscribeToAccount({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalled();
      const accountState = mockCallback.mock.calls[0][0];
      expect(accountState.marginUsed).toBe('0');
      expect(accountState.unrealizedPnl).toBe('0');
      expect(accountState.returnOnEquity).toBe('0');

      unsubscribe();
    });

    it('calculates correct ROE with mixed profit and loss positions', async () => {
      // Override the adapter mock
      jest.mocked(adaptAccountStateFromSDK).mockImplementation(() => ({
        availableBalance: '75',
        totalBalance: '1575',
        marginUsed: '1500',
        unrealizedPnl: '75',
        returnOnEquity: '5.0',
      }));

      const mockCallback = jest.fn();

      // Mock webData3 - simulates account with multiple positions
      // marginUsed=1500, unrealizedPnl=75 → ROE=5.0%
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          const mockData = {
            perpDexStates: [
              {
                clearinghouseState: { assetPositions: [] },
                openOrders: [],
                perpsAtOpenInterestCap: [],
              },
            ],
          };

          setTimeout(() => callback(mockData), 10);
          return { unsubscribe: jest.fn() };
        },
      );

      const unsubscribe = service.subscribeToAccount({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalled();
      const accountState = mockCallback.mock.calls[0][0];
      expect(accountState.marginUsed).toBe('1500');
      expect(accountState.unrealizedPnl).toBe('75');
      expect(accountState.returnOnEquity).toBe('5.0');

      unsubscribe();
    });

    it('calculates high ROE with large percentage gains', async () => {
      // Override the adapter mock
      jest.mocked(adaptAccountStateFromSDK).mockImplementation(() => ({
        availableBalance: '200',
        totalBalance: '300',
        marginUsed: '100',
        unrealizedPnl: '200',
        returnOnEquity: '200.0',
      }));

      const mockCallback = jest.fn();

      // Mock webData3
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          const mockData = {
            perpDexStates: [
              {
                clearinghouseState: { assetPositions: [] },
                openOrders: [],
                perpsAtOpenInterestCap: [],
              },
            ],
          };

          setTimeout(() => callback(mockData), 10);
          return { unsubscribe: jest.fn() };
        },
      );

      const unsubscribe = service.subscribeToAccount({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalled();
      const accountState = mockCallback.mock.calls[0][0];
      expect(accountState.marginUsed).toBe('100');
      expect(accountState.unrealizedPnl).toBe('200');
      expect(accountState.returnOnEquity).toBe('200.0');

      unsubscribe();
    });

    it('rounds ROE to one decimal place', async () => {
      // Override the adapter mock
      jest.mocked(adaptAccountStateFromSDK).mockImplementation(() => ({
        availableBalance: '100',
        totalBalance: '433',
        marginUsed: '333',
        unrealizedPnl: '100',
        returnOnEquity: '30.0',
      }));

      const mockCallback = jest.fn();

      // Mock webData3
      mockSubscriptionClient.webData3.mockImplementation(
        (_params: any, callback: any) => {
          const mockData = {
            perpDexStates: [
              {
                clearinghouseState: { assetPositions: [] },
                openOrders: [],
                perpsAtOpenInterestCap: [],
              },
            ],
          };

          setTimeout(() => callback(mockData), 10);
          return { unsubscribe: jest.fn() };
        },
      );

      const unsubscribe = service.subscribeToAccount({
        callback: mockCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalled();
      const accountState = mockCallback.mock.calls[0][0];
      expect(accountState.marginUsed).toBe('333');
      expect(accountState.unrealizedPnl).toBe('100');
      expect(accountState.returnOnEquity).toBe('30.0');

      unsubscribe();
    });
  });
});
