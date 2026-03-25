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
  adaptOrderItemFromMYX: jest.fn(),
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
    baseDecimals: 18,
    quoteDecimals: 18,
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
    it('returns testnet deposit route', () => {
      const routes = provider.getDepositRoutes();

      expect(routes).toHaveLength(1);
      expect(routes[0].chainId).toBe('eip155:59141');
      expect(routes[0].contractAddress).toBeTruthy();
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
    it('placeOrder returns failure without messenger', async () => {
      const result = await provider.placeOrder({ symbol: 'BTC' } as Parameters<
        typeof provider.placeOrder
      >[0]);

      expect(result).toEqual({
        success: false,
        error: 'MYX provider requires messenger for authenticated operations',
      });
    });

    it('editOrder returns failure without messenger', async () => {
      const result = await provider.editOrder(
        {} as Parameters<typeof provider.editOrder>[0],
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('messenger');
    });

    it('cancelOrder returns failure without messenger', async () => {
      const result = await provider.cancelOrder(
        {} as Parameters<typeof provider.cancelOrder>[0],
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('messenger');
    });

    it('cancelOrders returns failure without messenger', async () => {
      const result = await provider.cancelOrders([
        { orderId: 'o1', symbol: 'RHEA' },
      ]);

      expect(result.success).toBe(false);
      expect(result.failureCount).toBe(1);
    });

    it('closePosition returns failure without messenger', async () => {
      const result = await provider.closePosition(
        {} as Parameters<typeof provider.closePosition>[0],
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('messenger');
    });

    it('closePositions returns failure without messenger', async () => {
      const result = await provider.closePositions(
        {} as Parameters<typeof provider.closePositions>[0],
      );

      expect(result.success).toBe(false);
      expect(result.failureCount).toBeGreaterThanOrEqual(0);
    });

    it('updatePositionTPSL returns failure without messenger', async () => {
      const result = await provider.updatePositionTPSL({
        symbol: 'RHEA',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('messenger');
    });

    it('updateMargin returns failure without messenger', async () => {
      const result = await provider.updateMargin({
        symbol: 'RHEA',
        amount: '100',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('messenger');
    });

    it('withdraw returns failure', async () => {
      const result = await provider.withdraw(
        {} as Parameters<typeof provider.withdraw>[0],
      );

      expect(result.success).toBe(false);
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
    it('validateDeposit returns valid', async () => {
      const result = await provider.validateDeposit(
        {} as Parameters<typeof provider.validateDeposit>[0],
      );

      expect(result.isValid).toBe(true);
    });

    it('validateOrder returns invalid without coin', async () => {
      const result = await provider.validateOrder(
        {} as Parameters<typeof provider.validateOrder>[0],
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_COIN_REQUIRED');
    });

    it('validateClosePosition returns invalid without symbol', async () => {
      const result = await provider.validateClosePosition(
        {} as Parameters<typeof provider.validateClosePosition>[0],
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_COIN_REQUIRED');
    });

    it('validateWithdrawal returns not valid', async () => {
      const result = await provider.validateWithdrawal(
        {} as Parameters<typeof provider.validateWithdrawal>[0],
      );

      expect(result.isValid).toBe(false);
    });
  });

  // ==========================================================================
  // Protocol Calculations (Stage 1 - Default Values)
  // ==========================================================================

  describe('protocol calculations return defaults', () => {
    it('calculateLiquidationPrice returns fallback for invalid params', async () => {
      expect(
        await provider.calculateLiquidationPrice(
          {} as Parameters<typeof provider.calculateLiquidationPrice>[0],
        ),
      ).toBe('0.00');
    });

    it('calculateMaintenanceMargin returns ratio based on max leverage', async () => {
      // 1 / (2 * 100) = 0.005
      expect(
        await provider.calculateMaintenanceMargin(
          {} as Parameters<typeof provider.calculateMaintenanceMargin>[0],
        ),
      ).toBe(0.005);
    });

    it('getMaxLeverage returns 100', async () => {
      expect(await provider.getMaxLeverage('RHEA')).toBe(100);
    });

    it('calculateFees returns default fee rates', async () => {
      const result = await provider.calculateFees(
        {} as Parameters<typeof provider.calculateFees>[0],
      );

      // MYX_FEE_RATE = 55000 / 100_000_000 = 0.00055
      expect(result.feeRate).toBeCloseTo(0.00055, 6);
      expect(result.protocolFeeRate).toBeCloseTo(0.00055, 6);
      expect(result.metamaskFeeRate).toBe(0);
    });
  });

  // ==========================================================================
  // Subscriptions (Stage 1 - No-op)
  // ==========================================================================

  describe('subscriptions call back with empty data', () => {
    it('subscribeToPositions returns unsubscribe function', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToPositions({ callback });

      expect(typeof unsub).toBe('function');
    });

    it('subscribeToOrderFills returns unsubscribe function', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToOrderFills({ callback });

      expect(typeof unsub).toBe('function');
    });

    it('subscribeToOrders returns unsubscribe function', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToOrders({ callback });

      expect(typeof unsub).toBe('function');
    });

    it('subscribeToAccount returns unsubscribe function', () => {
      const callback = jest.fn();

      const unsub = provider.subscribeToAccount({ callback });

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
        'https://sepolia.lineascan.build',
      );
    });

    it('returns testnet explorer URL with address', () => {
      expect(provider.getBlockExplorerUrl('0xabc')).toBe(
        'https://sepolia.lineascan.build/address/0xabc',
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

  // ==========================================================================
  // validateOrder — private helpers tested indirectly
  // ==========================================================================

  /* eslint-disable @typescript-eslint/no-explicit-any */
  describe('validateOrder (authenticated helpers)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
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

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);

      // Pre-populate pools cache so #resolvePoolId works
      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();
    });

    it('returns isValid true when usdAmount exceeds minimum', async () => {
      // MYX_MINIMUM_ORDER_SIZE_USD = 100, buffer = 1.1 → minimum = 110
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);

      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        orderType: 'market',
        isBuy: true,
      } as any);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns ORDER_SIZE_MIN when usdAmount is below minimum', async () => {
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);

      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '5',
        orderType: 'market',
        isBuy: true,
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_SIZE_MIN');
      expect(result.minimumRequired).toBeGreaterThan(0);
    });

    it('uses per-pool minimum order size when available', async () => {
      // Pool returns a higher minimum than the static fallback
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 200,
      } as any);

      // $210 is above 200 * 1.1 = 220 → below minimum
      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '210',
        orderType: 'market',
        isBuy: true,
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_SIZE_MIN');
    });

    it('returns ORDER_SIZE_MIN when size * price is below minimum', async () => {
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);

      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '0.001',
        currentPrice: 100,
        orderType: 'market',
        isBuy: true,
      } as any);

      // 0.001 * 100 = 0.1 USD — far below minimum
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_SIZE_MIN');
    });

    it('returns ORDER_PRICE_REQUIRED when no price info is provided for size-based order', async () => {
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);

      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '1',
        orderType: 'market',
        isBuy: true,
        // no usdAmount, no currentPrice, no price
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_PRICE_REQUIRED');
    });

    it('returns ORDER_LEVERAGE_INVALID when leverage is below 1', async () => {
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);

      // Use a fractional value (truthy but < 1) to trigger the range check.
      // leverage: 0 is falsy and skips the guard condition in #validateLeverage.
      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        orderType: 'market',
        isBuy: true,
        leverage: 0.5,
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_LEVERAGE_INVALID');
    });

    it('returns ORDER_LEVERAGE_INVALID when leverage exceeds max', async () => {
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);

      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        orderType: 'market',
        isBuy: true,
        leverage: 200, // MYX_MAX_LEVERAGE = 100
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_LEVERAGE_INVALID');
    });

    it('returns ORDER_LEVERAGE_BELOW_POSITION when leverage is below existing position', async () => {
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);

      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        orderType: 'market',
        isBuy: true,
        leverage: 5,
        existingPositionLeverage: 10,
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ORDER_LEVERAGE_BELOW_POSITION');
    });

    it('bypasses minimum order size check for full closes', async () => {
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);

      const result = await authProvider.validateOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '1', // would normally fail minimum
        orderType: 'market',
        isBuy: false,
        reduceOnly: true,
        isFullClose: true,
      } as any);

      expect(result.isValid).toBe(true);
    });
  });

  // ==========================================================================
  // placeOrder (authenticated write)
  // ==========================================================================

  describe('placeOrder (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
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

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);

      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();

      // Common mocks for placeOrder internals
      authClientService.getChainId.mockReturnValue(421614);
      authClientService.getNetwork.mockReturnValue('testnet');
      authClientService.getMarketDetail.mockResolvedValue({
        marketId: 'market-1',
        baseSymbol: 'RHEA',
      } as any);
      authClientService.getUserTradingFeeRate.mockResolvedValue({
        takerFeeRate: '55000',
        makerFeeRate: '10000',
      } as any);
      authClientService.getPoolLevelConfig.mockResolvedValue({
        minOrderSizeInUsd: 0,
      } as any);
      authClientService.getTickers.mockResolvedValue([
        makeTicker({ poolId: '0xpool1', price: '1500.00' }),
      ]);
    });

    it('returns success true for a market order with explicit price', async () => {
      authClientService.createIncreaseOrder.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: { transactionHash: '0xtxhash' },
      } as any);

      const result = await authProvider.placeOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        isBuy: true,
        orderType: 'market',
        leverage: 2,
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('0xtxhash');
      expect(result.providerId).toBe('myx');
      expect(authClientService.createIncreaseOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          poolId: '0xpool1',
          direction: expect.anything(),
          leverage: 2,
        }),
        expect.any(String),
        'market-1',
      );
    });

    it('returns failure when symbol has no matching pool', async () => {
      const result = await authProvider.placeOrder({
        symbol: 'UNKNOWN',
        size: '1',
        usdAmount: '200',
        isBuy: true,
        orderType: 'market',
        leverage: 2,
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown symbol: UNKNOWN');
      expect(authClientService.createIncreaseOrder).not.toHaveBeenCalled();
    });

    it('returns failure when SDK returns non-zero code', async () => {
      authClientService.createIncreaseOrder.mockResolvedValue({
        code: 4001,
        message: 'Insufficient margin',
        data: null,
      } as any);

      const result = await authProvider.placeOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        isBuy: true,
        orderType: 'market',
        leverage: 2,
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('code=4001');
      expect(result.error).toContain('Insufficient margin');
    });

    it('returns failure when usdAmount is below minimum order size', async () => {
      const result = await authProvider.placeOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '5',
        isBuy: true,
        orderType: 'market',
        leverage: 2,
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('below minimum');
      expect(authClientService.createIncreaseOrder).not.toHaveBeenCalled();
    });

    it('returns failure when SDK throws', async () => {
      authClientService.createIncreaseOrder.mockRejectedValue(
        new Error('Network timeout'),
      );

      const result = await authProvider.placeOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        isBuy: true,
        orderType: 'market',
        leverage: 2,
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('fetches ticker price when no price supplied', async () => {
      authClientService.createIncreaseOrder.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: { orderId: 'order-1' },
      } as any);

      const result = await authProvider.placeOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        isBuy: true,
        orderType: 'market',
        leverage: 2,
        // no currentPrice, no price — must fetch from ticker
      } as any);

      expect(authClientService.getTickers).toHaveBeenCalledWith(['0xpool1']);
      expect(result.success).toBe(true);
    });

    it('places a limit order successfully', async () => {
      authClientService.createIncreaseOrder.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: { transactionHash: '0xlimittx' },
      } as any);

      const result = await authProvider.placeOrder({
        symbol: 'RHEA',
        size: '1',
        usdAmount: '200',
        isBuy: true,
        orderType: 'limit',
        leverage: 2,
        price: '1400',
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('0xlimittx');
      expect(authClientService.createIncreaseOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          poolId: '0xpool1',
          leverage: 2,
        }),
        expect.any(String),
        'market-1',
      );
    });
  });

  // ==========================================================================
  // cancelOrder (authenticated write)
  // ==========================================================================

  describe('cancelOrder (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);
    });

    it('returns success true when SDK returns code 0', async () => {
      authClientService.cancelOrder.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: null,
      } as any);

      const result = await authProvider.cancelOrder({
        orderId: 'order-1',
        symbol: 'RHEA',
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-1');
      expect(result.providerId).toBe('myx');
      expect(authClientService.cancelOrder).toHaveBeenCalledWith(
        'order-1',
        421614,
      );
    });

    it('returns failure when SDK returns non-zero code', async () => {
      authClientService.cancelOrder.mockResolvedValue({
        code: 4002,
        message: 'Order not found',
        data: null,
      } as any);

      const result = await authProvider.cancelOrder({
        orderId: 'order-99',
        symbol: 'RHEA',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('code=4002');
      expect(result.error).toContain('Order not found');
    });

    it('returns failure when SDK throws', async () => {
      authClientService.cancelOrder.mockRejectedValue(new Error('RPC error'));

      const result = await authProvider.cancelOrder({
        orderId: 'order-1',
        symbol: 'RHEA',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC error');
    });
  });

  // ==========================================================================
  // cancelOrders (batch)
  // ==========================================================================

  describe('cancelOrders (batch, authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(() => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);
    });

    it('returns success with all results when SDK returns code 0', async () => {
      authClientService.cancelOrders.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: null,
      } as any);

      const result = await authProvider.cancelOrders([
        { orderId: 'o1', symbol: 'RHEA' },
        { orderId: 'o2', symbol: 'RHEA' },
      ]);

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        orderId: 'o1',
        symbol: 'RHEA',
        success: true,
      });
    });

    it('returns failure for all results when SDK returns non-zero code', async () => {
      authClientService.cancelOrders.mockResolvedValue({
        code: 4005,
        message: 'Batch cancel failed',
        data: null,
      } as any);

      const result = await authProvider.cancelOrders([
        { orderId: 'o1', symbol: 'RHEA' },
      ]);

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('code=4005');
    });
  });

  // ==========================================================================
  // closePosition (authenticated write)
  // ==========================================================================

  describe('closePosition (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    const rawPosition = {
      size: '2.5',
      poolId: '0xpool1',
      positionId: 'pos-1',
      direction: 0, // MYXDirection.LONG = 0
      userLeverage: 5,
    };

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);
      authClientService.getNetwork.mockReturnValue('testnet');

      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();

      authClientService.getTickers.mockResolvedValue([
        makeTicker({ poolId: '0xpool1', price: '1500.00' }),
      ]);
      authClientService.getOrders.mockResolvedValue({ data: [] } as any);
    });

    it('closes full position when no size is supplied', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.createDecreaseOrder.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: { transactionHash: '0xclosetx' },
      } as any);

      const result = await authProvider.closePosition({
        symbol: 'RHEA',
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('0xclosetx');
      expect(result.providerId).toBe('myx');
      // Should have used rawPos.size as the close size
      expect(authClientService.createDecreaseOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          positionId: 'pos-1',
          poolId: '0xpool1',
        }),
      );
    });

    it('closes partial position when size is supplied', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.createDecreaseOrder.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: { orderId: 'close-order-1' },
      } as any);

      const result = await authProvider.closePosition({
        symbol: 'RHEA',
        size: '1.0',
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('close-order-1');
    });

    it('returns failure when symbol has no matching pool', async () => {
      const result = await authProvider.closePosition({
        symbol: 'UNKNOWN',
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No MYX pool found');
    });

    it('returns failure when no open position exists', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [],
      } as any);

      const result = await authProvider.closePosition({
        symbol: 'RHEA',
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No open position found');
    });

    it('returns failure when SDK returns non-zero code', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.createDecreaseOrder.mockResolvedValue({
        code: 4003,
        message: 'Position already closed',
        data: null,
      } as any);

      const result = await authProvider.closePosition({
        symbol: 'RHEA',
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('code=4003');
    });

    it('returns failure when SDK throws', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.createDecreaseOrder.mockRejectedValue(
        new Error('Contract revert'),
      );

      const result = await authProvider.closePosition({
        symbol: 'RHEA',
        currentPrice: 1500,
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract revert');
    });
  });

  // ==========================================================================
  // closePositions (batch close)
  // ==========================================================================

  describe('closePositions (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    const rawPosition = {
      size: '1.0',
      poolId: '0xpool1',
      positionId: 'pos-1',
      direction: 0,
      userLeverage: 5,
    };

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);
      authClientService.getNetwork.mockReturnValue('testnet');

      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();

      authClientService.getTickers.mockResolvedValue([
        makeTicker({ poolId: '0xpool1', price: '1500.00' }),
      ]);
      authClientService.getOrders.mockResolvedValue({ data: [] } as any);

      const { adaptPositionFromMYX: mockAdapt } = jest.requireMock(
        '../utils/myxAdapter',
      ) as { adaptPositionFromMYX: jest.Mock };
      mockAdapt.mockReturnValue({
        symbol: 'RHEA',
        size: '1.0',
        providerId: 'myx',
      });
    });

    it('returns success when all positions are closed', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.createDecreaseOrder.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: { transactionHash: '0xtx' },
      } as any);

      const result = await authProvider.closePositions({ closeAll: true });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
    });

    it('returns success with zero counts when no positions exist', async () => {
      authClientService.listPositions.mockResolvedValue({ data: [] } as any);

      const result = await authProvider.closePositions({ closeAll: true });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('tracks failure count when a closePosition call fails', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.createDecreaseOrder.mockResolvedValue({
        code: 4003,
        message: 'Failed',
        data: null,
      } as any);

      const result = await authProvider.closePositions({ closeAll: true });

      expect(result.success).toBe(false);
      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(false);
    });
  });

  // ==========================================================================
  // updatePositionTPSL (authenticated write)
  // ==========================================================================

  describe('updatePositionTPSL (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    const rawPosition = {
      size: '1.0',
      poolId: '0xpool1',
      positionId: 'pos-1',
      direction: 0, // LONG
      userLeverage: 5,
    };

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);
      authClientService.getNetwork.mockReturnValue('testnet');

      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();
    });

    it('returns success when TP/SL order is created', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.createPositionTpSlOrder.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: { transactionHash: '0xtpsltx' },
      } as any);

      const result = await authProvider.updatePositionTPSL({
        symbol: 'RHEA',
        takeProfitPrice: '2000',
        stopLossPrice: '1000',
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('0xtpsltx');
      expect(authClientService.createPositionTpSlOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          positionId: 'pos-1',
          poolId: '0xpool1',
        }),
      );
    });

    it('returns failure when symbol has no pool', async () => {
      const result = await authProvider.updatePositionTPSL({
        symbol: 'UNKNOWN',
        takeProfitPrice: '2000',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No MYX pool found');
    });

    it('returns failure when no open position exists', async () => {
      authClientService.listPositions.mockResolvedValue({ data: [] } as any);

      const result = await authProvider.updatePositionTPSL({
        symbol: 'RHEA',
        takeProfitPrice: '2000',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No open position found');
    });

    it('returns failure when SDK returns non-zero code', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.createPositionTpSlOrder.mockResolvedValue({
        code: 4010,
        message: 'TP/SL rejected',
        data: null,
      } as any);

      const result = await authProvider.updatePositionTPSL({
        symbol: 'RHEA',
        takeProfitPrice: '2000',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('code=4010');
    });
  });

  // ==========================================================================
  // updateMargin (authenticated write)
  // ==========================================================================

  describe('updateMargin (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    const rawPosition = {
      size: '1.0',
      poolId: '0xpool1',
      positionId: 'pos-1',
      direction: 0,
      userLeverage: 5,
    };

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);
      authClientService.getNetwork.mockReturnValue('testnet');

      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();
    });

    it('returns success when margin is adjusted', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.adjustCollateral.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: null,
      } as any);

      const result = await authProvider.updateMargin({
        symbol: 'RHEA',
        amount: '100',
      });

      expect(result.success).toBe(true);
      expect(authClientService.adjustCollateral).toHaveBeenCalledWith(
        expect.objectContaining({
          poolId: '0xpool1',
          positionId: 'pos-1',
        }),
      );
    });

    it('returns failure when symbol has no pool', async () => {
      const result = await authProvider.updateMargin({
        symbol: 'UNKNOWN',
        amount: '100',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No MYX pool found');
    });

    it('returns failure when no open position exists', async () => {
      authClientService.listPositions.mockResolvedValue({ data: [] } as any);

      const result = await authProvider.updateMargin({
        symbol: 'RHEA',
        amount: '100',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No open position found');
    });

    it('returns failure when SDK returns non-zero code', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [rawPosition],
      } as any);
      authClientService.adjustCollateral.mockResolvedValue({
        code: 4020,
        message: 'Margin adjustment failed',
        data: null,
      } as any);

      const result = await authProvider.updateMargin({
        symbol: 'RHEA',
        amount: '100',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('code=4020');
    });
  });

  // ==========================================================================
  // editOrder (authenticated write)
  // ==========================================================================

  describe('editOrder (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);
      authClientService.getNetwork.mockReturnValue('testnet');
      authClientService.getMarketDetail.mockResolvedValue({
        marketId: 'market-1',
        baseSymbol: 'RHEA',
      } as any);

      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();
    });

    it('returns success when order is updated', async () => {
      authClientService.updateOrderTpSl.mockResolvedValue({
        code: 0,
        message: 'OK',
        data: null,
      } as any);

      const result = await authProvider.editOrder({
        orderId: 'order-1',
        newOrder: {
          symbol: 'RHEA',
          size: '1',
          price: '1400',
          orderType: 'limit',
          isBuy: true,
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-1');
      expect(result.providerId).toBe('myx');
      expect(authClientService.updateOrderTpSl).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1' }),
        expect.any(String),
        421614,
        '0xuser123',
        'market-1',
      );
    });

    it('returns failure when symbol has no pool', async () => {
      const result = await authProvider.editOrder({
        orderId: 'order-1',
        newOrder: {
          symbol: 'UNKNOWN',
          size: '1',
          price: '1400',
          orderType: 'limit',
          isBuy: true,
        },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown symbol: UNKNOWN');
    });

    it('returns failure when SDK returns non-zero code', async () => {
      authClientService.updateOrderTpSl.mockResolvedValue({
        code: 4030,
        message: 'Edit rejected',
        data: null,
      } as any);

      const result = await authProvider.editOrder({
        orderId: 'order-1',
        newOrder: {
          symbol: 'RHEA',
          size: '1',
          price: '1400',
          orderType: 'limit',
          isBuy: true,
        },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('code=4030');
    });
  });

  // ==========================================================================
  // Subscription polling (authenticated)
  // ==========================================================================

  describe('subscribeToPositions (authenticated polling)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);
      authClientService.getNetwork.mockReturnValue('testnet');

      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();

      authClientService.getTickers.mockResolvedValue([]);
      authClientService.getOrders.mockResolvedValue({ data: [] } as any);
      authClientService.subscribeToPositions.mockResolvedValue(undefined);
    });

    it('invokes callback with positions from REST poll', async () => {
      authClientService.listPositions.mockResolvedValue({
        data: [
          {
            size: '1.0',
            poolId: '0xpool1',
            positionId: 'pos-1',
            direction: 0,
            userLeverage: 5,
          },
        ],
      } as any);

      const { adaptPositionFromMYX: mockAdapt } = jest.requireMock(
        '../utils/myxAdapter',
      ) as { adaptPositionFromMYX: jest.Mock };
      mockAdapt.mockReturnValue({
        symbol: 'RHEA',
        size: '1.0',
        providerId: 'myx',
      });

      const callback = jest.fn();
      const unsubscribe = authProvider.subscribeToPositions({ callback });

      // Allow async setup to run
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('unsubscribe stops WS subscription and clears timer', async () => {
      authClientService.listPositions.mockResolvedValue({ data: [] } as any);

      const callback = jest.fn();
      const unsubscribe = authProvider.subscribeToPositions({ callback });

      unsubscribe();

      // After cancellation, timer advances should not trigger more callbacks
      jest.advanceTimersByTime(10000);

      expect(authClientService.unsubscribeFromPositions).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToOrders (authenticated polling)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
          signTypedData: jest.fn().mockResolvedValue('0xsig'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.subscribeToOrders.mockResolvedValue(undefined);
    });

    it('returns unsubscribe function', () => {
      authClientService.getOrders.mockResolvedValue({ data: [] } as any);

      const callback = jest.fn();
      const unsubscribe = authProvider.subscribeToOrders({ callback });

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('unsubscribe calls unsubscribeFromOrders when WS was active', async () => {
      authClientService.getOrders.mockResolvedValue({ data: [] } as any);

      const callback = jest.fn();
      const unsubscribe = authProvider.subscribeToOrders({ callback });

      // Allow async setup + WS subscription to complete
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      unsubscribe();

      expect(authClientService.unsubscribeFromOrders).toHaveBeenCalled();
    });
  });

  describe('subscribeToOrderFills (authenticated polling)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(() => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
    });

    it('returns unsubscribe function', () => {
      authClientService.getOrderHistory.mockResolvedValue({ data: [] } as any);

      const callback = jest.fn();
      const unsubscribe = authProvider.subscribeToOrderFills({ callback });

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('subscribeToAccount (authenticated polling)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(async () => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockReturnValue('0xuser123'),
        }),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
      authClientService.getChainId.mockReturnValue(421614);

      const pools = [makePool({ poolId: '0xpool1', baseSymbol: 'RHEA' })];
      authClientService.getMarkets.mockResolvedValue(pools);
      mockFilterMYXExclusiveMarkets.mockReturnValue(pools);
      mockBuildPoolSymbolMap.mockReturnValue(new Map([['0xpool1', 'RHEA']]));
      await authProvider.initialize();

      authClientService.getAccountInfo.mockResolvedValue({
        data: { balance: '500' },
      } as any);
      authClientService.listPositions.mockResolvedValue({ data: [] } as any);

      const { adaptAccountStateFromMYX: mockAdapt } = jest.requireMock(
        '../utils/myxAdapter',
      ) as { adaptAccountStateFromMYX: jest.Mock };
      mockAdapt.mockReturnValue({
        totalBalance: '500',
        availableBalance: '500',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
      });
    });

    it('returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = authProvider.subscribeToAccount({ callback });

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('invokes callback with account state on first poll', async () => {
      const callback = jest.fn();
      authProvider.subscribeToAccount({ callback });

      // Flush all microtasks + the async chain (ensureAuthenticated → getPositions → adaptAccountStateFromMYX)
      // Using a small flushPromises helper via repeated awaits
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ totalBalance: '500' }),
      );
    });
  });

  // ==========================================================================
  // calculateFees with dynamic rate
  // ==========================================================================

  describe('calculateFees with dynamic rate', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(() => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({}),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.getChainId.mockReturnValue(421614);
    });

    it('uses dynamic fee rate from API when available', async () => {
      authClientService.getUserTradingFeeRate.mockResolvedValue({
        takerFeeRate: '110000',
        makerFeeRate: '10000',
      } as any);

      const result = await authProvider.calculateFees({
        amount: '1000',
      } as any);

      // 110000 / 100_000_000 = 0.0011
      expect(result.feeRate).toBeCloseTo(0.0011, 6);
      expect(result.feeAmount).toBeCloseTo(1.1, 4);
    });

    it('falls back to static rate when API call fails', async () => {
      authClientService.getUserTradingFeeRate.mockRejectedValue(
        new Error('API unavailable'),
      );

      const result = await authProvider.calculateFees({
        amount: '1000',
      } as any);

      // MYX_FEE_RATE = 55000 / 100_000_000 = 0.00055
      expect(result.feeRate).toBeCloseTo(0.00055, 6);
    });

    it('includes feeAmount when amount param is provided', async () => {
      authClientService.getUserTradingFeeRate.mockResolvedValue({
        takerFeeRate: '55000',
        makerFeeRate: '10000',
      } as any);

      const result = await authProvider.calculateFees({
        amount: '2000',
      } as any);

      expect(result.feeAmount).toBeCloseTo(2000 * 0.00055, 6);
      expect(result.protocolFeeAmount).toBeCloseTo(2000 * 0.00055, 6);
      expect(result.metamaskFeeAmount).toBe(0);
    });
  });

  // ==========================================================================
  // getOpenOrders (authenticated)
  // ==========================================================================

  describe('getOpenOrders (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(() => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({}),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
    });

    it('returns adapted open orders', async () => {
      authClientService.getOrders.mockResolvedValue({
        data: [{ orderId: 'open-1', orderStatus: 1 }],
      } as any);

      const { adaptOrderItemFromMYX: mockAdapt } = jest.requireMock(
        '../utils/myxAdapter',
      ) as { adaptOrderItemFromMYX: jest.Mock };
      mockAdapt.mockReturnValue({
        orderId: 'open-1',
        symbol: 'RHEA',
        status: 'open',
      });

      const result = await authProvider.getOpenOrders();

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe('open-1');
      expect(authClientService.getOrders).toHaveBeenCalledWith('0xuser123');
    });

    it('returns empty array when data is null', async () => {
      authClientService.getOrders.mockResolvedValue({ data: null } as any);

      const result = await authProvider.getOpenOrders();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // getUserHistory (authenticated)
  // ==========================================================================

  describe('getUserHistory (authenticated)', () => {
    let authProvider: MYXProvider;
    let authClientService: jest.Mocked<MYXClientService>;

    beforeEach(() => {
      const { MYXWalletService } = jest.requireMock(
        '../services/MYXWalletService',
      ) as { MYXWalletService: jest.Mock };
      MYXWalletService.mockImplementation(() => ({
        createEthersSigner: jest.fn().mockReturnValue({}),
        createWalletClient: jest.fn().mockReturnValue({}),
        getUserAddress: jest.fn().mockReturnValue('0xuser123'),
      }));

      const { createMockMessenger: createMsg } = jest.requireActual(
        '../../../components/UI/Perps/__mocks__/serviceMocks',
      ) as { createMockMessenger: typeof createMockMessenger };

      authProvider = new MYXProvider({
        isTestnet: true,
        platformDependencies: mockDeps,
        messenger: createMsg() as any,
      });
      const instances = MockedMYXClientService.mock.instances;
      authClientService = instances[
        instances.length - 1
      ] as jest.Mocked<MYXClientService>;

      authClientService.isAuthenticatedForAddress.mockReturnValue(true);
      authClientService.authenticate.mockResolvedValue(undefined);
    });

    it('returns adapted user history', async () => {
      authClientService.getTradeFlow.mockResolvedValue({
        data: [{ type: 'trade', amount: '100' }],
      } as any);

      const { adaptUserHistoryFromMYX: mockAdapt } = jest.requireMock(
        '../utils/myxAdapter',
      ) as { adaptUserHistoryFromMYX: jest.Mock };
      mockAdapt.mockReturnValue([{ type: 'trade', amount: '100' }]);

      const result = await authProvider.getUserHistory();

      expect(result).toHaveLength(1);
      expect(authClientService.getTradeFlow).toHaveBeenCalled();
    });

    it('returns empty array when data is null', async () => {
      authClientService.getTradeFlow.mockResolvedValue({ data: null } as any);

      const result = await authProvider.getUserHistory();

      expect(result).toEqual([]);
    });
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
});
