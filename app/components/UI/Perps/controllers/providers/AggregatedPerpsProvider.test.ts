import type { IPerpsProvider, Position, MarketInfo, Order } from '../types';
import { createMockInfrastructure } from '../../__mocks__/serviceMocks';
import { AggregatedPerpsProvider } from './AggregatedPerpsProvider';

// Create a comprehensive mock provider
const createMockProvider = (
  providerId: string,
): jest.Mocked<IPerpsProvider> => {
  const mockProvider: jest.Mocked<IPerpsProvider> = {
    protocolId: providerId,

    // Asset routes
    getDepositRoutes: jest.fn().mockReturnValue([]),
    getWithdrawalRoutes: jest.fn().mockReturnValue([]),

    // Read operations
    getPositions: jest.fn().mockResolvedValue([]),
    getAccountState: jest.fn().mockResolvedValue({
      availableBalance: '10000',
      totalBalance: '10000',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    }),
    getMarkets: jest.fn().mockResolvedValue([]),
    getMarketDataWithPrices: jest.fn().mockResolvedValue([]),
    getOrderFills: jest.fn().mockResolvedValue([]),
    getOrders: jest.fn().mockResolvedValue([]),
    getOpenOrders: jest.fn().mockResolvedValue([]),
    getFunding: jest.fn().mockResolvedValue([]),
    getHistoricalPortfolio: jest.fn().mockResolvedValue({
      accountValue1dAgo: '10000',
      timestamp: Date.now(),
    }),
    getUserNonFundingLedgerUpdates: jest.fn().mockResolvedValue([]),
    getUserHistory: jest.fn().mockResolvedValue([]),

    // Write operations
    placeOrder: jest
      .fn()
      .mockResolvedValue({ success: true, orderId: 'order-123' }),
    editOrder: jest
      .fn()
      .mockResolvedValue({ success: true, orderId: 'order-123' }),
    cancelOrder: jest.fn().mockResolvedValue({ success: true }),
    cancelOrders: jest.fn().mockResolvedValue({
      success: true,
      successCount: 1,
      failureCount: 0,
      results: [],
    }),
    closePosition: jest.fn().mockResolvedValue({ success: true }),
    closePositions: jest.fn().mockResolvedValue({
      success: true,
      successCount: 1,
      failureCount: 0,
      results: [],
    }),
    updatePositionTPSL: jest.fn().mockResolvedValue({ success: true }),
    updateMargin: jest.fn().mockResolvedValue({ success: true }),
    withdraw: jest.fn().mockResolvedValue({ success: true }),

    // Validation
    validateDeposit: jest.fn().mockResolvedValue({ isValid: true }),
    validateOrder: jest.fn().mockResolvedValue({ isValid: true }),
    validateClosePosition: jest.fn().mockResolvedValue({ isValid: true }),
    validateWithdrawal: jest.fn().mockResolvedValue({ isValid: true }),

    // Calculations
    calculateLiquidationPrice: jest.fn().mockResolvedValue('45000'),
    calculateMaintenanceMargin: jest.fn().mockResolvedValue(0.05),
    getMaxLeverage: jest.fn().mockResolvedValue(50),
    calculateFees: jest.fn().mockResolvedValue({ feeRate: 0.001 }),

    // Subscriptions
    subscribeToPrices: jest.fn().mockReturnValue(() => undefined),
    subscribeToPositions: jest.fn().mockReturnValue(() => undefined),
    subscribeToOrderFills: jest.fn().mockReturnValue(() => undefined),
    subscribeToOrders: jest.fn().mockReturnValue(() => undefined),
    subscribeToAccount: jest.fn().mockReturnValue(() => undefined),
    subscribeToOICaps: jest.fn().mockReturnValue(() => undefined),
    subscribeToCandles: jest.fn().mockReturnValue(() => undefined),
    subscribeToOrderBook: jest.fn().mockReturnValue(() => undefined),

    // Configuration
    setLiveDataConfig: jest.fn(),
    setUserFeeDiscount: jest.fn(),

    // Lifecycle
    toggleTestnet: jest
      .fn()
      .mockResolvedValue({ success: true, isTestnet: false }),
    initialize: jest.fn().mockResolvedValue({ success: true }),
    isReadyToTrade: jest.fn().mockResolvedValue({ ready: true }),
    disconnect: jest.fn().mockResolvedValue({ success: true }),
    ping: jest.fn().mockResolvedValue(undefined),

    // Block explorer
    getBlockExplorerUrl: jest.fn().mockReturnValue('https://explorer.example'),

    // HIP-3
    getAvailableDexs: jest.fn().mockResolvedValue([]),
  };

  return mockProvider;
};

// Helper to create mock position
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
    cumulativeFunding: { allTime: '10', sinceOpen: '5', sinceChange: '2' },
    takeProfitCount: 0,
    stopLossCount: 0,
  }) as Position;

// Helper to create mock market
const createMockMarket = (name: string): MarketInfo =>
  ({
    name,
    szDecimals: 3,
    maxLeverage: 50,
    marginTableId: 0,
  }) as MarketInfo;

// Helper to create mock order
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

describe('AggregatedPerpsProvider', () => {
  let aggregatedProvider: AggregatedPerpsProvider;
  let mockHLProvider: jest.Mocked<IPerpsProvider>;
  let mockMYXProvider: jest.Mocked<IPerpsProvider>;
  let mockInfrastructure: ReturnType<typeof createMockInfrastructure>;

  beforeEach(() => {
    mockHLProvider = createMockProvider('hyperliquid');
    mockMYXProvider = createMockProvider('myx');
    mockInfrastructure = createMockInfrastructure();

    aggregatedProvider = new AggregatedPerpsProvider({
      providers: new Map([
        ['hyperliquid', mockHLProvider],
        ['myx', mockMYXProvider],
      ]),
      defaultProvider: 'hyperliquid',
      infrastructure: mockInfrastructure,
    });
  });

  describe('constructor', () => {
    it('should initialize with provided providers', () => {
      expect(aggregatedProvider.getProviderIds()).toContain('hyperliquid');
      expect(aggregatedProvider.getProviderIds()).toContain('myx');
    });

    it('should have protocolId set to "aggregated"', () => {
      expect(aggregatedProvider.protocolId).toBe('aggregated');
    });
  });

  describe('Read Operations - getPositions', () => {
    it('should aggregate positions from all providers', async () => {
      mockHLProvider.getPositions.mockResolvedValue([
        createMockPosition('BTC', '0.1'),
      ]);
      mockMYXProvider.getPositions.mockResolvedValue([
        createMockPosition('ETH', '1.0'),
      ]);

      const positions = await aggregatedProvider.getPositions();

      expect(positions).toHaveLength(2);
      expect(positions).toContainEqual(
        expect.objectContaining({ symbol: 'BTC', providerId: 'hyperliquid' }),
      );
      expect(positions).toContainEqual(
        expect.objectContaining({ symbol: 'ETH', providerId: 'myx' }),
      );
    });

    it('should inject providerId into each position', async () => {
      mockHLProvider.getPositions.mockResolvedValue([
        createMockPosition('BTC', '0.1'),
      ]);

      const positions = await aggregatedProvider.getPositions();

      expect(positions[0].providerId).toBe('hyperliquid');
    });

    it('should handle partial failures gracefully', async () => {
      mockHLProvider.getPositions.mockResolvedValue([
        createMockPosition('BTC', '0.1'),
      ]);
      mockMYXProvider.getPositions.mockRejectedValue(
        new Error('Provider unavailable'),
      );

      const positions = await aggregatedProvider.getPositions();

      // Should still return positions from successful provider
      expect(positions).toHaveLength(1);
      expect(positions[0].providerId).toBe('hyperliquid');
    });

    it('should return empty array when all providers fail', async () => {
      mockHLProvider.getPositions.mockRejectedValue(new Error('Error 1'));
      mockMYXProvider.getPositions.mockRejectedValue(new Error('Error 2'));

      const positions = await aggregatedProvider.getPositions();

      expect(positions).toEqual([]);
    });
  });

  describe('Read Operations - getMarkets', () => {
    it('should aggregate markets from all providers', async () => {
      mockHLProvider.getMarkets.mockResolvedValue([createMockMarket('BTC')]);
      mockMYXProvider.getMarkets.mockResolvedValue([createMockMarket('ETH')]);

      const markets = await aggregatedProvider.getMarkets();

      expect(markets).toHaveLength(2);
      expect(markets).toContainEqual(
        expect.objectContaining({ name: 'BTC', providerId: 'hyperliquid' }),
      );
      expect(markets).toContainEqual(
        expect.objectContaining({ name: 'ETH', providerId: 'myx' }),
      );
    });

    it('should keep same market from different providers', async () => {
      mockHLProvider.getMarkets.mockResolvedValue([createMockMarket('BTC')]);
      mockMYXProvider.getMarkets.mockResolvedValue([createMockMarket('BTC')]);

      const markets = await aggregatedProvider.getMarkets();

      // Both should be kept since they have different providerIds
      expect(markets).toHaveLength(2);
    });
  });

  describe('Read Operations - getOrders', () => {
    it('should aggregate orders from all providers', async () => {
      mockHLProvider.getOrders.mockResolvedValue([
        createMockOrder('hl-order', 'BTC'),
      ]);
      mockMYXProvider.getOrders.mockResolvedValue([
        createMockOrder('myx-order', 'ETH'),
      ]);

      const orders = await aggregatedProvider.getOrders();

      expect(orders).toHaveLength(2);
      expect(orders).toContainEqual(
        expect.objectContaining({
          orderId: 'hl-order',
          providerId: 'hyperliquid',
        }),
      );
      expect(orders).toContainEqual(
        expect.objectContaining({ orderId: 'myx-order', providerId: 'myx' }),
      );
    });
  });

  describe('Write Operations - placeOrder', () => {
    it('should route to default provider when no providerId specified', async () => {
      await aggregatedProvider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      });

      expect(mockHLProvider.placeOrder).toHaveBeenCalled();
      expect(mockMYXProvider.placeOrder).not.toHaveBeenCalled();
    });

    it('should route to specified provider when providerId is provided', async () => {
      await aggregatedProvider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        providerId: 'myx',
      });

      expect(mockMYXProvider.placeOrder).toHaveBeenCalled();
      expect(mockHLProvider.placeOrder).not.toHaveBeenCalled();
    });

    it('should inject providerId into result', async () => {
      mockMYXProvider.placeOrder.mockResolvedValue({
        success: true,
        orderId: 'myx-order-123',
      });

      const result = await aggregatedProvider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        providerId: 'myx',
      });

      expect(result.providerId).toBe('myx');
      expect(result.orderId).toBe('myx-order-123');
    });

    it('should fall back to default when specified provider not found', async () => {
      await aggregatedProvider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        providerId: 'unknown-provider',
      });

      // Should fall back to default (hyperliquid)
      expect(mockHLProvider.placeOrder).toHaveBeenCalled();
    });
  });

  describe('Write Operations - cancelOrder', () => {
    it('should route to specified provider', async () => {
      await aggregatedProvider.cancelOrder({
        orderId: 'order-123',
        symbol: 'BTC',
        providerId: 'myx',
      });

      expect(mockMYXProvider.cancelOrder).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-123' }),
      );
    });

    it('should inject providerId into result', async () => {
      mockMYXProvider.cancelOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      const result = await aggregatedProvider.cancelOrder({
        orderId: 'order-123',
        symbol: 'BTC',
        providerId: 'myx',
      });

      expect(result.providerId).toBe('myx');
    });
  });

  describe('Write Operations - closePosition', () => {
    it('should route to specified provider', async () => {
      await aggregatedProvider.closePosition({
        symbol: 'BTC',
        providerId: 'myx',
      });

      expect(mockMYXProvider.closePosition).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate order with specified provider', async () => {
      await aggregatedProvider.validateOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        providerId: 'myx',
      });

      expect(mockMYXProvider.validateOrder).toHaveBeenCalled();
    });

    it('should use default provider for validateDeposit', async () => {
      await aggregatedProvider.validateDeposit({
        amount: '100',
        assetId: 'eip155:42161/erc20:0x1234/default',
      });

      expect(mockHLProvider.validateDeposit).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should initialize default provider', async () => {
      await aggregatedProvider.initialize();

      expect(mockHLProvider.initialize).toHaveBeenCalled();
    });

    it('should disconnect all providers', async () => {
      await aggregatedProvider.disconnect();

      expect(mockHLProvider.disconnect).toHaveBeenCalled();
      expect(mockMYXProvider.disconnect).toHaveBeenCalled();
    });

    it('should delegate isReadyToTrade to default provider', async () => {
      mockHLProvider.isReadyToTrade.mockResolvedValue({
        ready: true,
        walletConnected: true,
        networkSupported: true,
      });

      const result = await aggregatedProvider.isReadyToTrade();

      expect(result.ready).toBe(true);
      expect(mockHLProvider.isReadyToTrade).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should apply setLiveDataConfig to all providers', () => {
      aggregatedProvider.setLiveDataConfig({ priceThrottleMs: 1000 });

      expect(mockHLProvider.setLiveDataConfig).toHaveBeenCalledWith({
        priceThrottleMs: 1000,
      });
      expect(mockMYXProvider.setLiveDataConfig).toHaveBeenCalledWith({
        priceThrottleMs: 1000,
      });
    });

    it('should apply setUserFeeDiscount to all providers', () => {
      aggregatedProvider.setUserFeeDiscount(1000);

      expect(mockHLProvider.setUserFeeDiscount).toHaveBeenCalledWith(1000);
      expect(mockMYXProvider.setUserFeeDiscount).toHaveBeenCalledWith(1000);
    });
  });

  describe('Provider Management', () => {
    it('should add new provider', () => {
      const newProvider = createMockProvider('new-provider');
      aggregatedProvider.addProvider('new-provider', newProvider);

      expect(aggregatedProvider.hasProvider('new-provider')).toBe(true);
      expect(aggregatedProvider.getProviderIds()).toContain('new-provider');
    });

    it('should remove provider', () => {
      const removed = aggregatedProvider.removeProvider('myx');

      expect(removed).toBe(true);
      expect(aggregatedProvider.hasProvider('myx')).toBe(false);
    });

    it('should return false when removing non-existent provider', () => {
      const removed = aggregatedProvider.removeProvider('non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('Asset Routes', () => {
    it('should delegate getDepositRoutes to default provider', () => {
      aggregatedProvider.getDepositRoutes();

      expect(mockHLProvider.getDepositRoutes).toHaveBeenCalled();
    });

    it('should delegate getWithdrawalRoutes to default provider', () => {
      aggregatedProvider.getWithdrawalRoutes();

      expect(mockHLProvider.getWithdrawalRoutes).toHaveBeenCalled();
    });
  });

  describe('Calculations', () => {
    it('should delegate calculateLiquidationPrice to default provider', async () => {
      await aggregatedProvider.calculateLiquidationPrice({
        entryPrice: 50000,
        leverage: 10,
        direction: 'long',
      });

      expect(mockHLProvider.calculateLiquidationPrice).toHaveBeenCalled();
    });

    it('should delegate getMaxLeverage to default provider', async () => {
      await aggregatedProvider.getMaxLeverage('BTC');

      expect(mockHLProvider.getMaxLeverage).toHaveBeenCalledWith('BTC');
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to prices via multiplexer', () => {
      const callback = jest.fn();
      aggregatedProvider.subscribeToPrices({
        symbols: ['BTC'],
        callback,
      });

      expect(mockHLProvider.subscribeToPrices).toHaveBeenCalled();
      expect(mockMYXProvider.subscribeToPrices).toHaveBeenCalled();
    });

    it('should delegate account subscription to default provider', () => {
      const callback = jest.fn();
      aggregatedProvider.subscribeToAccount({ callback });

      expect(mockHLProvider.subscribeToAccount).toHaveBeenCalled();
    });
  });
});
