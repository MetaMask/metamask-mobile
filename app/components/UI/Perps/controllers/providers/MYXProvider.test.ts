import { MYXProvider } from './MYXProvider';
import { MYXClientService } from '../../services/MYXClientService';
import { createMockInfrastructure } from '../../__mocks__/serviceMocks';
import type { PerpsPlatformDependencies } from '../types';
import type { MYXPoolSymbol, MYXTicker } from '../../types/myx-types';
import {
  adaptMarketFromMYX,
  adaptMarketDataFromMYX,
  adaptPriceFromMYX,
  filterMYXExclusiveMarkets,
  buildPoolSymbolMap,
} from '../../utils/myxAdapter';
import { WebSocketConnectionState } from '../../services/HyperLiquidClientService';
import { CandlePeriod } from '../../constants/chartConfig';

// ============================================================================
// Mocks
// ============================================================================

jest.mock('../../services/MYXClientService');
jest.mock('../../utils/myxAdapter', () => ({
  adaptMarketFromMYX: jest.fn(),
  adaptMarketDataFromMYX: jest.fn(),
  adaptPriceFromMYX: jest.fn(),
  filterMYXExclusiveMarkets: jest.fn(),
  buildPoolSymbolMap: jest.fn(),
}));
jest.mock('../../services/HyperLiquidClientService', () => ({
  WebSocketConnectionState: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    Connecting: 'connecting',
    Reconnecting: 'reconnecting',
  },
}));

const MockedMYXClientService = MYXClientService as jest.MockedClass<
  typeof MYXClientService
>;
const mockAdaptMarketFromMYX = adaptMarketFromMYX as jest.MockedFunction<
  typeof adaptMarketFromMYX
>;
const mockAdaptMarketDataFromMYX =
  adaptMarketDataFromMYX as jest.MockedFunction<typeof adaptMarketDataFromMYX>;
const mockAdaptPriceFromMYX = adaptPriceFromMYX as jest.MockedFunction<
  typeof adaptPriceFromMYX
>;
const mockFilterMYXExclusiveMarkets =
  filterMYXExclusiveMarkets as jest.MockedFunction<
    typeof filterMYXExclusiveMarkets
  >;
const mockBuildPoolSymbolMap = buildPoolSymbolMap as jest.MockedFunction<
  typeof buildPoolSymbolMap
>;

// ============================================================================
// Test Fixtures
// ============================================================================

function makePool(overrides: Partial<MYXPoolSymbol> = {}): MYXPoolSymbol {
  return {
    chainId: 97,
    marketId: 'market-1',
    poolId: '0xpool1',
    baseSymbol: 'RHEA',
    quoteSymbol: 'USDT',
    baseTokenIcon: '',
    baseToken: '0xbase',
    quoteToken: '0xquote',
    ...overrides,
  };
}

function makeTicker(overrides: Partial<MYXTicker> = {}): MYXTicker {
  return {
    chainId: 97,
    poolId: '0xpool1',
    oracleId: 1,
    price: '1500000000000000000000000000000000',
    change: '2.5',
    high: '0',
    low: '0',
    volume: '1000000',
    turnover: '0',
    ...overrides,
  };
}

function createProvider(
  deps: jest.Mocked<PerpsPlatformDependencies>,
  isTestnet = true,
): MYXProvider {
  return new MYXProvider({
    isTestnet,
    platformDependencies: deps,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('MYXProvider', () => {
  let provider: MYXProvider;
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let mockClientService: jest.Mocked<MYXClientService>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockDeps = createMockInfrastructure();

    // Setup default adapter mock returns
    mockFilterMYXExclusiveMarkets.mockImplementation((pools) => pools);
    mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
    mockAdaptMarketFromMYX.mockReturnValue({
      name: 'RHEA',
      szDecimals: 18,
      maxLeverage: 100,
      marginTableId: 0,
      minimumOrderSize: 10,
      providerId: 'myx',
    });

    provider = createProvider(mockDeps);

    // Get reference to the mocked client service instance
    mockClientService = MockedMYXClientService.mock
      .instances[0] as jest.Mocked<MYXClientService>;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================

  describe('constructor', () => {
    it('sets protocolId to myx', () => {
      expect(provider.protocolId).toBe('myx');
    });

    it('defaults to testnet when isTestnet is undefined', () => {
      const defaultProvider = new MYXProvider({
        platformDependencies: mockDeps,
      });

      expect(defaultProvider.protocolId).toBe('myx');
      // Constructor logs the isTestnet value
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXProvider] Constructor complete',
        expect.objectContaining({ isTestnet: true }),
      );
    });

    it('initializes MYXClientService with correct config', () => {
      expect(MockedMYXClientService).toHaveBeenCalledWith(mockDeps, {
        isTestnet: true,
      });
    });

    it('logs constructor completion', () => {
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXProvider] Constructor complete',
        expect.objectContaining({
          protocolId: 'myx',
          isTestnet: true,
        }),
      );
    });
  });

  // ==========================================================================
  // Initialization & Lifecycle
  // ==========================================================================

  describe('initialize', () => {
    it('returns success after fetching and filtering markets', async () => {
      const pools = [makePool()];
      mockClientService.getMarkets.mockResolvedValueOnce(pools);

      const result = await provider.initialize();

      expect(result).toEqual({ success: true });
      expect(mockClientService.getMarkets).toHaveBeenCalled();
      expect(mockFilterMYXExclusiveMarkets).toHaveBeenCalledWith(pools);
      expect(mockBuildPoolSymbolMap).toHaveBeenCalled();
    });

    it('returns failure with error message on SDK failure', async () => {
      mockClientService.getMarkets.mockRejectedValueOnce(
        new Error('Init failed'),
      );

      const result = await provider.initialize();

      expect(result).toEqual({
        success: false,
        error: 'Init failed',
      });
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('returns success and calls clientService.disconnect', async () => {
      const result = await provider.disconnect();

      expect(result).toEqual({ success: true });
      expect(mockClientService.disconnect).toHaveBeenCalled();
    });

    it('returns failure when disconnect throws', async () => {
      mockClientService.disconnect.mockImplementation(() => {
        throw new Error('Disconnect error');
      });

      const result = await provider.disconnect();

      expect(result).toEqual({
        success: false,
        error: 'Disconnect error',
      });
    });
  });

  describe('ping', () => {
    it('delegates to clientService.ping', async () => {
      mockClientService.ping.mockResolvedValueOnce(undefined);

      await provider.ping(3000);

      expect(mockClientService.ping).toHaveBeenCalledWith(3000);
    });

    it('delegates without timeout argument', async () => {
      mockClientService.ping.mockResolvedValueOnce(undefined);

      await provider.ping();

      expect(mockClientService.ping).toHaveBeenCalledWith(undefined);
    });
  });

  describe('toggleTestnet', () => {
    it('returns failure with testnet-only message', async () => {
      const result = await provider.toggleTestnet();

      expect(result).toEqual({
        success: false,
        isTestnet: true,
        error: 'MYX mainnet not yet available',
      });
    });
  });

  describe('isReadyToTrade', () => {
    it('returns not ready with trading not supported message', async () => {
      const result = await provider.isReadyToTrade();

      expect(result).toEqual({
        ready: false,
        error: 'MYX trading not yet supported',
        walletConnected: false,
        networkSupported: true,
      });
    });

    it('reports networkSupported false for mainnet provider', async () => {
      const mainnetProvider = createProvider(mockDeps, false);

      const result = await mainnetProvider.isReadyToTrade();

      expect(result.networkSupported).toBe(false);
    });
  });

  // ==========================================================================
  // Market Data Operations
  // ==========================================================================

  describe('getMarkets', () => {
    it('fetches markets, filters, and adapts them', async () => {
      const pools = [
        makePool(),
        makePool({ poolId: '0xpool2', baseSymbol: 'PARTI' }),
      ];
      mockClientService.getMarkets.mockResolvedValueOnce(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValueOnce(pools);

      const result = await provider.getMarkets();

      expect(mockClientService.getMarkets).toHaveBeenCalled();
      expect(mockFilterMYXExclusiveMarkets).toHaveBeenCalledWith(pools);
      expect(mockAdaptMarketFromMYX).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('throws error on failure', async () => {
      mockClientService.getMarkets.mockRejectedValueOnce(
        new Error('Market fetch failed'),
      );

      await expect(provider.getMarkets()).rejects.toThrow(
        'Market fetch failed',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('getMarketDataWithPrices', () => {
    it('fetches markets if cache is empty then returns market data', async () => {
      const pools = [makePool()];
      const tickers = [makeTicker()];
      mockClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockClientService.getTickers.mockResolvedValueOnce(tickers);
      mockAdaptMarketDataFromMYX.mockReturnValue({
        symbol: 'RHEA',
        name: 'Rhea Finance',
        maxLeverage: '100x',
        price: '$1,500.00',
        change24h: '+$37.50',
        change24hPercent: '+2.50%',
        volume: '$1.00M',
        providerId: 'myx',
      });

      const result = await provider.getMarketDataWithPrices();

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('RHEA');
      expect(mockAdaptMarketDataFromMYX).toHaveBeenCalledWith(
        pools[0],
        tickers[0],
      );
    });

    it('passes undefined ticker when pool has no matching ticker', async () => {
      const pools = [makePool({ poolId: '0xpool1' })];
      const tickers = [makeTicker({ poolId: '0xDIFFERENT' })];
      mockClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockClientService.getTickers.mockResolvedValueOnce(tickers);
      mockAdaptMarketDataFromMYX.mockReturnValue({
        symbol: 'RHEA',
        name: 'Rhea Finance',
        maxLeverage: '100x',
        price: '$0.00',
        change24h: '+$0.00',
        change24hPercent: '+0.00%',
        volume: '$0.00',
        providerId: 'myx',
      });

      const result = await provider.getMarketDataWithPrices();

      expect(result).toHaveLength(1);
      expect(mockAdaptMarketDataFromMYX).toHaveBeenCalledWith(
        pools[0],
        undefined,
      );
    });

    it('throws error on failure', async () => {
      mockClientService.getMarkets.mockRejectedValueOnce(
        new Error('Data error'),
      );

      await expect(provider.getMarketDataWithPrices()).rejects.toThrow(
        'Data error',
      );
    });
  });

  // ==========================================================================
  // Price Subscriptions
  // ==========================================================================

  describe('subscribeToPrices', () => {
    beforeEach(async () => {
      // Pre-populate pools cache via initialize
      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      mockClientService.getMarkets.mockResolvedValueOnce(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);

      await provider.initialize();
    });

    it('starts price polling and returns unsubscribe function', () => {
      const callback = jest.fn();

      const unsubscribe = provider.subscribeToPrices({
        symbols: ['RHEA'],
        callback,
      });

      expect(mockClientService.startPricePolling).toHaveBeenCalledWith(
        ['0xpool1'],
        expect.any(Function),
      );
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls callback with empty array when no pool IDs match', () => {
      const callback = jest.fn();

      provider.subscribeToPrices({
        symbols: ['NONEXISTENT'],
        callback,
      });

      jest.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledWith([]);
    });

    it('transforms tickers to PriceUpdate format in polling callback', () => {
      const callback = jest.fn();
      mockAdaptPriceFromMYX.mockReturnValue({
        price: '1500',
        change24h: 2.5,
      });

      provider.subscribeToPrices({
        symbols: ['RHEA'],
        callback,
      });

      // Get the polling callback that was passed to startPricePolling
      const pollingCallback =
        mockClientService.startPricePolling.mock.calls[0][1];

      // Simulate polling callback
      pollingCallback([makeTicker({ poolId: '0xpool1' })]);

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'RHEA',
          price: '1500',
          providerId: 'myx',
          percentChange24h: '2.50',
        }),
      ]);
    });

    it('unsubscribe stops price polling', () => {
      const callback = jest.fn();

      const unsubscribe = provider.subscribeToPrices({
        symbols: ['RHEA'],
        callback,
      });

      unsubscribe();

      expect(mockClientService.stopPricePolling).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Asset Routes (Stage 1 - Stubbed)
  // ==========================================================================

  describe('getDepositRoutes', () => {
    it('returns empty array', () => {
      expect(provider.getDepositRoutes()).toEqual([]);
    });
  });

  describe('getWithdrawalRoutes', () => {
    it('returns empty array', () => {
      expect(provider.getWithdrawalRoutes()).toEqual([]);
    });
  });

  // ==========================================================================
  // Trading Operations (Stage 1 - All Stubbed)
  // ==========================================================================

  describe('trading operations return not-supported errors', () => {
    it('placeOrder returns failure', async () => {
      const result = await provider.placeOrder(
        {} as Parameters<typeof provider.placeOrder>[0],
      );

      expect(result).toEqual({
        success: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('editOrder returns failure', async () => {
      const result = await provider.editOrder(
        {} as Parameters<typeof provider.editOrder>[0],
      );

      expect(result).toEqual({
        success: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('cancelOrder returns failure', async () => {
      const result = await provider.cancelOrder(
        {} as Parameters<typeof provider.cancelOrder>[0],
      );

      expect(result).toEqual({
        success: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('cancelOrders returns zero counts', async () => {
      const result = await provider.cancelOrders(
        {} as Parameters<typeof provider.cancelOrders>[0],
      );

      expect(result).toEqual({
        success: false,
        successCount: 0,
        failureCount: 0,
        results: [],
      });
    });

    it('closePosition returns failure', async () => {
      const result = await provider.closePosition(
        {} as Parameters<typeof provider.closePosition>[0],
      );

      expect(result).toEqual({
        success: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('closePositions returns zero counts', async () => {
      const result = await provider.closePositions(
        {} as Parameters<typeof provider.closePositions>[0],
      );

      expect(result).toEqual({
        success: false,
        successCount: 0,
        failureCount: 0,
        results: [],
      });
    });

    it('updatePositionTPSL returns failure', async () => {
      const result = await provider.updatePositionTPSL(
        {} as Parameters<typeof provider.updatePositionTPSL>[0],
      );

      expect(result).toEqual({
        success: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('updateMargin returns failure', async () => {
      const result = await provider.updateMargin({
        symbol: 'RHEA',
        amount: '100',
        isAdd: true,
      });

      expect(result).toEqual({
        success: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('withdraw returns failure', async () => {
      const result = await provider.withdraw(
        {} as Parameters<typeof provider.withdraw>[0],
      );

      expect(result).toEqual({
        success: false,
        error: 'MYX trading not yet supported',
      });
    });
  });

  // ==========================================================================
  // Account Operations (Stage 1 - Empty Returns)
  // ==========================================================================

  describe('account operations return empty defaults', () => {
    it('getPositions returns empty array', async () => {
      expect(await provider.getPositions()).toEqual([]);
    });

    it('getAccountState returns zeroed state', async () => {
      const result = await provider.getAccountState();

      expect(result).toEqual({
        availableBalance: '0',
        totalBalance: '0',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
      });
    });

    it('getOrders returns empty array', async () => {
      expect(await provider.getOrders()).toEqual([]);
    });

    it('getOpenOrders returns empty array', async () => {
      expect(await provider.getOpenOrders()).toEqual([]);
    });

    it('getOrderFills returns empty array', async () => {
      expect(await provider.getOrderFills()).toEqual([]);
    });

    it('getOrFetchFills returns empty array', async () => {
      expect(await provider.getOrFetchFills()).toEqual([]);
    });

    it('getFunding returns empty array', async () => {
      expect(await provider.getFunding()).toEqual([]);
    });

    it('getHistoricalPortfolio returns zeroed result', async () => {
      const result = await provider.getHistoricalPortfolio();

      expect(result.accountValue1dAgo).toBe('0');
      expect(result.timestamp).toBeDefined();
    });

    it('getUserNonFundingLedgerUpdates returns empty array', async () => {
      expect(await provider.getUserNonFundingLedgerUpdates()).toEqual([]);
    });

    it('getUserHistory returns empty array', async () => {
      expect(await provider.getUserHistory()).toEqual([]);
    });
  });

  // ==========================================================================
  // Validation Operations (Stage 1 - All Invalid)
  // ==========================================================================

  describe('validation operations return invalid', () => {
    it('validateDeposit returns not valid', async () => {
      const result = await provider.validateDeposit(
        {} as Parameters<typeof provider.validateDeposit>[0],
      );

      expect(result).toEqual({
        isValid: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('validateOrder returns not valid', async () => {
      const result = await provider.validateOrder(
        {} as Parameters<typeof provider.validateOrder>[0],
      );

      expect(result).toEqual({
        isValid: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('validateClosePosition returns not valid', async () => {
      const result = await provider.validateClosePosition(
        {} as Parameters<typeof provider.validateClosePosition>[0],
      );

      expect(result).toEqual({
        isValid: false,
        error: 'MYX trading not yet supported',
      });
    });

    it('validateWithdrawal returns not valid', async () => {
      const result = await provider.validateWithdrawal(
        {} as Parameters<typeof provider.validateWithdrawal>[0],
      );

      expect(result).toEqual({
        isValid: false,
        error: 'MYX trading not yet supported',
      });
    });
  });

  // ==========================================================================
  // Protocol Calculations (Stage 1 - Default Values)
  // ==========================================================================

  describe('protocol calculations return defaults', () => {
    it('calculateLiquidationPrice returns "0"', async () => {
      expect(
        await provider.calculateLiquidationPrice(
          {} as Parameters<typeof provider.calculateLiquidationPrice>[0],
        ),
      ).toBe('0');
    });

    it('calculateMaintenanceMargin returns 0', async () => {
      expect(
        await provider.calculateMaintenanceMargin(
          {} as Parameters<typeof provider.calculateMaintenanceMargin>[0],
        ),
      ).toBe(0);
    });

    it('getMaxLeverage returns 100', async () => {
      expect(await provider.getMaxLeverage('RHEA')).toBe(100);
    });

    it('calculateFees returns default fee rates', async () => {
      const result = await provider.calculateFees(
        {} as Parameters<typeof provider.calculateFees>[0],
      );

      expect(result).toEqual({
        feeRate: 0.0005,
        protocolFeeRate: 0.0005,
      });
    });
  });

  // ==========================================================================
  // Subscriptions (Stage 1 - No-op)
  // ==========================================================================

  describe('subscriptions call back with empty data', () => {
    it('subscribeToPositions calls back with empty array', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToPositions({ callback });
      jest.advanceTimersByTime(1);

      expect(callback).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToOrderFills calls back with empty array', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToOrderFills({ callback });
      jest.advanceTimersByTime(1);

      expect(callback).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToOrders calls back with empty array', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToOrders({ callback });
      jest.advanceTimersByTime(1);

      expect(callback).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToAccount calls back with zeroed state', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToAccount({ callback });
      jest.advanceTimersByTime(1);

      expect(callback).toHaveBeenCalledWith({
        availableBalance: '0',
        totalBalance: '0',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
      });
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToOICaps calls back with empty array', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToOICaps({ callback });
      jest.advanceTimersByTime(1);

      expect(callback).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToCandles calls back with empty candles', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToCandles({
        symbol: 'RHEA',
        interval: CandlePeriod.OneHour,
        callback,
      });
      jest.advanceTimersByTime(1);

      expect(callback).toHaveBeenCalledWith({
        symbol: 'RHEA',
        interval: CandlePeriod.OneHour,
        candles: [],
      });
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToOrderBook calls back with empty book', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToOrderBook({
        symbol: 'RHEA',
        callback,
      });
      jest.advanceTimersByTime(1);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          bids: [],
          asks: [],
          spread: '0',
          spreadPercentage: '0',
          midPrice: '0',
          maxTotal: '0',
        }),
      );
      expect(typeof unsub).toBe('function');
    });
  });

  describe('setLiveDataConfig', () => {
    it('does not throw (no-op)', () => {
      expect(() => provider.setLiveDataConfig({})).not.toThrow();
    });
  });

  // ==========================================================================
  // Connection State (Stage 1 - REST Only)
  // ==========================================================================

  describe('connection state', () => {
    it('getWebSocketConnectionState returns Connected', () => {
      expect(provider.getWebSocketConnectionState()).toBe(
        WebSocketConnectionState.Connected,
      );
    });

    it('subscribeToConnectionState returns noop unsubscribe', () => {
      const listener = jest.fn();
      const unsub = provider.subscribeToConnectionState(listener);

      expect(typeof unsub).toBe('function');
      // Listener not called since REST has no state changes
      expect(listener).not.toHaveBeenCalled();
    });

    it('reconnect is a no-op', async () => {
      await expect(provider.reconnect()).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Block Explorer
  // ==========================================================================

  describe('getBlockExplorerUrl', () => {
    it('returns testnet explorer URL without address', () => {
      expect(provider.getBlockExplorerUrl()).toBe(
        'https://testnet.bscscan.com',
      );
    });

    it('returns testnet explorer URL with address', () => {
      expect(provider.getBlockExplorerUrl('0xabc')).toBe(
        'https://testnet.bscscan.com/address/0xabc',
      );
    });

    it('returns mainnet explorer URL without address', () => {
      const mainnetProvider = createProvider(mockDeps, false);

      expect(mainnetProvider.getBlockExplorerUrl()).toBe('https://bscscan.com');
    });

    it('returns mainnet explorer URL with address', () => {
      const mainnetProvider = createProvider(mockDeps, false);

      expect(mainnetProvider.getBlockExplorerUrl('0xdef')).toBe(
        'https://bscscan.com/address/0xdef',
      );
    });
  });

  // ==========================================================================
  // Fee Discount
  // ==========================================================================

  describe('setUserFeeDiscount', () => {
    it('does not throw (no-op)', () => {
      expect(() => provider.setUserFeeDiscount(100)).not.toThrow();
      expect(() => provider.setUserFeeDiscount(undefined)).not.toThrow();
    });
  });

  // ==========================================================================
  // HIP-3 Operations (N/A for MYX)
  // ==========================================================================

  describe('getAvailableDexs', () => {
    it('returns empty array', async () => {
      expect(await provider.getAvailableDexs()).toEqual([]);
    });
  });
});
