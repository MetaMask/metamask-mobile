import {
  createMockInfrastructure,
  createMockMessenger,
} from '../../../components/UI/Perps/__mocks__/serviceMocks';
import { CandlePeriod } from '../constants/chartConfig';
import { MYXClientService } from '../services/MYXClientService';
import { WebSocketConnectionState } from '../types';
import type { PerpsPlatformDependencies } from '../types';
import type { MYXPoolSymbol, MYXTicker } from '../types/myx-types';
import {
  adaptMarketFromMYX,
  adaptMarketDataFromMYX,
  adaptPriceFromMYX,
  filterMYXExclusiveMarkets,
  buildPoolSymbolMap,
} from '../utils/myxAdapter';

import { MYXProvider } from './MYXProvider';

// ============================================================================
// Mocks
// ============================================================================

jest.mock('../../../core/AppConstants', () => ({
  __esModule: true,
  default: { ZERO_ADDRESS: '0x0000000000000000000000000000000000000000' },
}));
jest.mock('../services/MYXClientService');
jest.mock('../services/MYXWalletService', () => ({
  MYXWalletService: jest.fn().mockImplementation(() => ({
    createEthersSigner: jest.fn().mockReturnValue({}),
    createWalletClient: jest.fn().mockReturnValue({}),
    getUserAddress: jest.fn().mockReturnValue('0xuser123'),
  })),
}));
jest.mock('../utils/myxAdapter', () => ({
  adaptMarketFromMYX: jest.fn(),
  adaptMarketDataFromMYX: jest.fn(),
  adaptPriceFromMYX: jest.fn(),
  adaptCandleFromMYX: jest.fn(),
  adaptCandleFromMYXWebSocket: jest.fn(),
  adaptPositionFromMYX: jest.fn(),
  adaptOrderFromMYX: jest.fn(),
  adaptAccountStateFromMYX: jest.fn(),
  adaptOrderFillFromMYX: jest.fn(),
  adaptFundingFromMYX: jest.fn(),
  adaptUserHistoryFromMYX: jest.fn(),
  filterMYXExclusiveMarkets: jest.fn(),
  buildPoolSymbolMap: jest.fn(),
  toMYXKlineResolution: jest.fn().mockReturnValue('1h'),
}));
// WebSocketConnectionState is now defined inline in types/index.ts (no mock needed)

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
    chainId: 421614,
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
    chainId: 421614,
    poolId: '0xpool1',
    oracleId: 1,
    price: '1500.00',
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
        error: 'MYX provider requires messenger for wallet operations',
        walletConnected: false,
        networkSupported: true,
      });
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

    it('returns empty array on failure', async () => {
      mockClientService.getMarkets.mockRejectedValueOnce(
        new Error('Market fetch failed'),
      );

      const result = await provider.getMarkets();
      expect(result).toEqual([]);
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
        mockDeps.marketDataFormatters,
      );
    });

    it('filters out pools with no matching ticker', async () => {
      const pools = [makePool({ poolId: '0xpool1' })];
      const tickers = [makeTicker({ poolId: '0xDIFFERENT' })];
      mockClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockClientService.getTickers.mockResolvedValueOnce(tickers);

      const result = await provider.getMarketDataWithPrices();

      expect(result).toHaveLength(0);
      expect(mockAdaptMarketDataFromMYX).not.toHaveBeenCalled();
    });

    it('returns empty array on failure', async () => {
      mockClientService.getMarkets.mockRejectedValueOnce(
        new Error('Data error'),
      );

      const result = await provider.getMarketDataWithPrices();
      expect(result).toEqual([]);
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
        'https://sepolia.arbiscan.io',
      );
    });

    it('returns testnet explorer URL with address', () => {
      expect(provider.getBlockExplorerUrl('0xabc')).toBe(
        'https://sepolia.arbiscan.io/address/0xabc',
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
  // Authenticated Read Operations
  // ==========================================================================

  /* eslint-disable @typescript-eslint/no-explicit-any */
  describe('authenticated reads', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(() => {
      // Re-set MYXWalletService mock (cleared by outer jest.clearAllMocks)
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as {
        MYXWalletService: jest.Mock;
      };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({}),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };
      const messenger = createMsg();

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: messenger as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      // Pre-authenticate so all reads succeed
      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
    });

    describe('getPositions', () => {
      it('returns adapted positions after authentication', async () => {
        const mockRawPositions = [
          { size: '1.5', symbol: 'BTC', poolId: '0xpool1' },
        ];
        authClientService.listPositions.mockResolvedValue({
          data: mockRawPositions,
        } as any);
        const { adaptPositionFromMYX: mockAdapt } = jest.requireMock(
          '../utils/myxAdapter',
        ) as { adaptPositionFromMYX: jest.Mock };
        mockAdapt.mockReturnValue({
          symbol: 'BTC',
          size: '1.5',
          providerId: 'myx',
        });

        const result = await authProvider.getPositions();

        expect(result).toHaveLength(1);
        expect(result[0].symbol).toBe('BTC');
        expect(authClientService.listPositions).toHaveBeenCalledWith(
          '0xuser123',
        );
      });

      it('filters out zero-size positions', async () => {
        authClientService.listPositions.mockResolvedValue({
          data: [
            { size: '0', symbol: 'BTC', poolId: '0xpool1' },
            { size: '1.0', symbol: 'ETH', poolId: '0xpool2' },
          ],
        } as any);
        const { adaptPositionFromMYX: mockAdapt } = jest.requireMock(
          '../utils/myxAdapter',
        ) as { adaptPositionFromMYX: jest.Mock };
        mockAdapt.mockReturnValue({ symbol: 'ETH', size: '1.0' });

        const result = await authProvider.getPositions();

        expect(result).toHaveLength(1);
      });

      it('returns empty array when data is null', async () => {
        authClientService.listPositions.mockResolvedValue({
          data: null,
        } as any);

        const result = await authProvider.getPositions();

        expect(result).toEqual([]);
      });
    });

    describe('getAccountState', () => {
      it('returns adapted account state', async () => {
        authClientService.getChainId.mockReturnValue(421614);
        authClientService.getWalletQuoteTokenBalance.mockResolvedValue({
          data: '1000',
        } as any);
        authClientService.getAccountInfo.mockResolvedValue({
          data: { balance: '1000' },
        } as any);

        const { adaptAccountStateFromMYX: mockAdapt } = jest.requireMock(
          '../utils/myxAdapter',
        ) as { adaptAccountStateFromMYX: jest.Mock };
        mockAdapt.mockReturnValue({
          totalBalance: '1000',
          availableBalance: '800',
          marginUsed: '200',
          unrealizedPnl: '50',
          returnOnEquity: '5',
        });

        // Need pools cache for account info fetch
        authClientService.getMarkets.mockResolvedValue([makePool()]);
        mockFilterMYXExclusiveMarkets.mockImplementation((pools) => pools);
        mockBuildPoolSymbolMap.mockReturnValue(new Map());
        await authProvider.initialize();

        const result = await authProvider.getAccountState();

        expect(result.totalBalance).toBe('1000');
        expect(authClientService.getWalletQuoteTokenBalance).toHaveBeenCalled();
        expect(authClientService.getAccountInfo).toHaveBeenCalled();
      });
    });

    describe('getOrders', () => {
      it('returns adapted orders', async () => {
        authClientService.getOrderHistory.mockResolvedValue({
          data: [{ orderId: 'o1', orderStatus: 1 }],
        } as any);
        const { adaptOrderFromMYX: mockAdapt } = jest.requireMock(
          '../utils/myxAdapter',
        ) as { adaptOrderFromMYX: jest.Mock };
        mockAdapt.mockReturnValue({
          orderId: 'o1',
          status: 'open',
          symbol: 'BTC',
        });

        const result = await authProvider.getOrders();

        expect(result).toHaveLength(1);
        expect(result[0].orderId).toBe('o1');
      });

      it('returns empty array when data is null', async () => {
        authClientService.getOrderHistory.mockResolvedValue({
          data: null,
        } as any);

        const result = await authProvider.getOrders();

        expect(result).toEqual([]);
      });
    });

    describe('getOrderFills', () => {
      it('returns adapted fills for successful orders', async () => {
        authClientService.getOrderHistory.mockResolvedValue({
          data: [
            { orderId: 'o1', orderStatus: 9 }, // Successful (OrderStatusEnum.Successful = 9)
            { orderId: 'o2', orderStatus: 0 }, // Not successful
          ],
        } as any);
        const { adaptOrderFillFromMYX: mockAdapt } = jest.requireMock(
          '../utils/myxAdapter',
        ) as { adaptOrderFillFromMYX: jest.Mock };
        mockAdapt.mockReturnValue({ orderId: 'o1', symbol: 'BTC' });

        const result = await authProvider.getOrderFills();

        expect(result).toHaveLength(1);
      });
    });

    describe('getFunding', () => {
      it('returns adapted funding data', async () => {
        authClientService.getTradeFlow.mockResolvedValue({
          data: [{ amount: '100' }],
        } as any);
        const { adaptFundingFromMYX: mockAdapt } = jest.requireMock(
          '../utils/myxAdapter',
        ) as { adaptFundingFromMYX: jest.Mock };
        mockAdapt.mockReturnValue([{ amount: '100', symbol: 'BTC' }]);

        const result = await authProvider.getFunding();

        expect(result).toHaveLength(1);
      });

      it('returns empty array when data is null', async () => {
        authClientService.getTradeFlow.mockResolvedValue({
          data: null,
        } as any);

        const result = await authProvider.getFunding();

        expect(result).toEqual([]);
      });
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

  // ==========================================================================
  // Authentication flow (isReadyToTrade + ensureAuthenticated)
  // ==========================================================================

  describe('isReadyToTrade with messenger', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(() => {
      // Re-set MYXWalletService mock (cleared by outer jest.clearAllMocks)
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as {
        MYXWalletService: jest.Mock;
      };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({}),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const messenger = createMockMessenger();
      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: messenger as any,
      });
      // The new MYXProvider creates a new MYXClientService instance;
      // grab the latest one
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;
    });

    it('returns ready when already authenticated for current address', async () => {
      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.getAuthenticatedAddress.mockReturnValue('0xuser123');

      const result = await authProvider.isReadyToTrade();

      expect(result.ready).toBe(true);
      expect(result.walletConnected).toBe(true);
      expect(result.networkSupported).toBe(true);
      expect(result.authenticatedAddress).toBe('0xuser123');
    });

    it('authenticates and returns ready when not yet authenticated', async () => {
      authClientService.isAuthenticatedForAddress.mockReturnValue(false);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getAuthenticatedAddress.mockReturnValue('0xuser123');

      const result = await authProvider.isReadyToTrade();

      expect(result.ready).toBe(true);
      expect(result.walletConnected).toBe(true);
      expect(authClientService.authenticate).toHaveBeenCalledWith(
        expect.anything(), // signer
        expect.anything(), // walletClient
        '0xuser123', // address
      );
    });

    it('returns not ready when authentication fails', async () => {
      authClientService.isAuthenticatedForAddress.mockReturnValue(false);
      authClientService.authenticate.mockRejectedValue(
        new Error('Auth rejected by user'),
      );

      const result = await authProvider.isReadyToTrade();

      expect(result.ready).toBe(false);
      expect(result.error).toContain('Auth rejected by user');
      expect(result.walletConnected).toBe(false);
    });

    it('skips authentication when already authenticated', async () => {
      // First call returns not-authenticated, triggering auth
      authClientService.isAuthenticatedForAddress.mockReturnValue(false);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getAuthenticatedAddress.mockReturnValue('0xuser123');

      const result1 = await authProvider.isReadyToTrade();
      expect(result1.ready).toBe(true);
      expect(authClientService.authenticate).toHaveBeenCalledTimes(1);

      // Second call finds already-authenticated — should skip auth
      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockClear();

      const result2 = await authProvider.isReadyToTrade();
      expect(result2.ready).toBe(true);
      expect(authClientService.authenticate).not.toHaveBeenCalled();
    });

    it('re-authenticates when deduped auth was for a different address', async () => {
      // First call: not authenticated, authenticate succeeds
      let callCount = 0;
      authClientService.isAuthenticatedForAddress.mockImplementation(() => {
        callCount++;
        // Not authenticated for any address on first 3 checks
        // Authenticated after second authenticate call
        return callCount > 3;
      });
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getAuthenticatedAddress.mockReturnValue('0xuser123');

      const result = await authProvider.isReadyToTrade();

      expect(result.ready).toBe(true);
    });
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
});
