import type { PerpsPlatformDependencies } from '@metamask/perps-controller';
import type { SignerLike } from '@myx-trade/sdk';

import { createMockInfrastructure } from '../../../components/UI/Perps/__mocks__/serviceMocks';
import { MYX_PRICE_POLLING_INTERVAL_MS } from '../constants/myxConfig';
import type { MYXPoolSymbol, MYXTicker } from '../types/myx-types';

import { MYXClientService } from './MYXClientService';

/** Minimal mock that satisfies SignerLike for test authenticate() calls */
const mockSignerLike = {
  getAddress: () => Promise.resolve('0xuser'),
  signMessage: () => Promise.resolve('0xsig'),
  sendTransaction: () => Promise.resolve({ hash: '0xtx' }),
} as SignerLike;

// ============================================================================
// Mock @myx-trade/sdk
// Uses the same pattern as HyperLiquidClientService.test.ts:
// 'mock'-prefixed variables at module level are hoisted by Jest's babel plugin
// and can be referenced inside jest.mock() factories.
// ============================================================================

const mockGetPoolSymbolAll = jest.fn().mockResolvedValue([]);
const mockGetTickerList = jest.fn().mockResolvedValue([]);
const mockWsConnect = jest.fn();
const mockWsDisconnect = jest.fn();
const mockListPositions = jest.fn();
const mockGetOrders = jest.fn();
const mockGetOrderHistory = jest.fn();
const mockGetPositionHistory = jest.fn();
const mockGetAccountInfo = jest.fn();
const mockGetWalletQuoteTokenBalance = jest.fn();
const mockGetTradeFlow = jest.fn();
const mockGetKlineList = jest.fn();
const mockGetMarketDetail = jest.fn();
const mockGetBaseDetail = jest.fn();
const mockSubscribeKline = jest.fn();
const mockUnsubscribeKline = jest.fn();
const mockSubscribePosition = jest.fn();
const mockUnsubscribePosition = jest.fn();
const mockSubscribeOrder = jest.fn();
const mockUnsubscribeOrder = jest.fn();
const mockAuth = jest.fn();
const mockWsAuth = jest.fn();
const mockCreateIncreaseOrder = jest.fn();
const mockCreateDecreaseOrder = jest.fn();
const mockCancelOrder = jest.fn();
const mockCancelOrders = jest.fn();
const mockCreatePositionTpSlOrder = jest.fn();
const mockUpdateOrderTpSl = jest.fn();
const mockAdjustCollateral = jest.fn();
const mockGetPoolOpenOrders = jest.fn();
const mockGetOraclePrice = jest.fn();
const mockGetNetworkFee = jest.fn();
const mockGetPoolLevelConfig = jest.fn();
const mockGetUserTradingFeeRate = jest.fn();

jest.mock('@myx-trade/sdk', () => ({
  MyxClient: jest.fn(() => ({
    markets: {
      getPoolSymbolAll: mockGetPoolSymbolAll,
      getTickerList: mockGetTickerList,
      getKlineList: mockGetKlineList,
      getMarketDetail: mockGetMarketDetail,
      getBaseDetail: mockGetBaseDetail,
      getPoolLevelConfig: mockGetPoolLevelConfig,
    },
    subscription: {
      connect: mockWsConnect,
      disconnect: mockWsDisconnect,
      subscribeKline: mockSubscribeKline,
      unsubscribeKline: mockUnsubscribeKline,
      subscribePosition: mockSubscribePosition,
      unsubscribePosition: mockUnsubscribePosition,
      subscribeOrder: mockSubscribeOrder,
      unsubscribeOrder: mockUnsubscribeOrder,
      auth: mockWsAuth,
    },
    position: {
      listPositions: mockListPositions,
      getPositionHistory: mockGetPositionHistory,
      adjustCollateral: mockAdjustCollateral,
    },
    order: {
      getOrders: mockGetOrders,
      getOrderHistory: mockGetOrderHistory,
      createIncreaseOrder: mockCreateIncreaseOrder,
      createDecreaseOrder: mockCreateDecreaseOrder,
      cancelOrder: mockCancelOrder,
      cancelOrders: mockCancelOrders,
      createPositionTpSlOrder: mockCreatePositionTpSlOrder,
      updateOrderTpSl: mockUpdateOrderTpSl,
    },
    account: {
      getAccountInfo: mockGetAccountInfo,
      getWalletQuoteTokenBalance: mockGetWalletQuoteTokenBalance,
    },
    api: {
      getTradeFlow: mockGetTradeFlow,
      getPoolOpenOrders: mockGetPoolOpenOrders,
    },
    utils: {
      getOraclePrice: mockGetOraclePrice,
      getNetworkFee: mockGetNetworkFee,
      getUserTradingFeeRate: mockGetUserTradingFeeRate,
    },
    auth: mockAuth,
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  })),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

function makePool(overrides: Partial<MYXPoolSymbol> = {}): MYXPoolSymbol {
  return {
    chainId: 59141,
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
    chainId: 59141,
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

// ============================================================================
// Tests
// ============================================================================

describe('MYXClientService', () => {
  let service: MYXClientService;
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;

  beforeEach(() => {
    jest.useFakeTimers();
    // clearAllMocks resets call counts/results but preserves implementations.
    // Do NOT use resetAllMocks — it strips mockImplementation from MyxClient,
    // causing all subsequent `new MyxClient()` calls to return empty objects.
    jest.clearAllMocks();

    mockDeps = createMockInfrastructure();
    service = new MYXClientService(mockDeps, { isTestnet: true });
  });

  afterEach(() => {
    service.disconnect();
    jest.useRealTimers();
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================

  describe('constructor', () => {
    it('initializes with testnet configuration', () => {
      const isTestnet = service.getIsTestnet();

      expect(isTestnet).toBe(true);
    });

    it('initializes with mainnet configuration', () => {
      const mainnetService = new MYXClientService(mockDeps, {
        isTestnet: false,
      });

      expect(mainnetService.getIsTestnet()).toBe(false);
      mainnetService.disconnect();
    });

    it('logs initialization details', () => {
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] Initialized with SDK',
        expect.objectContaining({
          isTestnet: true,
          chainId: 59141,
        }),
      );
    });
  });

  // ==========================================================================
  // getMarkets
  // ==========================================================================

  describe('getMarkets', () => {
    it('fetches markets from SDK and caches them', async () => {
      const pools = [
        makePool(),
        makePool({ poolId: '0xpool2', baseSymbol: 'PARTI' }),
      ];
      mockGetPoolSymbolAll.mockResolvedValueOnce(pools);

      const result = await service.getMarkets();

      expect(result).toEqual(pools);
      expect(mockGetPoolSymbolAll).toHaveBeenCalledTimes(1);
    });

    it('returns cached markets within TTL', async () => {
      const pools = [makePool()];
      mockGetPoolSymbolAll.mockResolvedValueOnce(pools);

      await service.getMarkets();
      const cachedResult = await service.getMarkets();

      expect(cachedResult).toEqual(pools);
      expect(mockGetPoolSymbolAll).toHaveBeenCalledTimes(1);
    });

    it('refetches markets after cache TTL expires', async () => {
      const pools = [makePool()];
      const updatedPools = [makePool(), makePool({ poolId: '0xpool2' })];
      mockGetPoolSymbolAll.mockResolvedValueOnce(pools);
      mockGetPoolSymbolAll.mockResolvedValueOnce(updatedPools);

      await service.getMarkets();

      // Advance past cache TTL (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);

      const result = await service.getMarkets();

      expect(result).toEqual(updatedPools);
      expect(mockGetPoolSymbolAll).toHaveBeenCalledTimes(2);
    });

    it('returns stale cache on error when cache exists', async () => {
      const pools = [makePool()];
      mockGetPoolSymbolAll.mockResolvedValueOnce(pools);

      await service.getMarkets();

      // Expire cache
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);

      mockGetPoolSymbolAll.mockRejectedValueOnce(new Error('API down'));

      const result = await service.getMarkets();

      expect(result).toEqual(pools);
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('throws error when fetch fails with no cache', async () => {
      mockGetPoolSymbolAll.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getMarkets()).rejects.toThrow('Network error');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('handles null response from SDK', async () => {
      mockGetPoolSymbolAll.mockResolvedValueOnce(null);

      const result = await service.getMarkets();

      expect(result).toEqual([]);
    });

    it('logs fetching and results', async () => {
      const pools = [makePool()];
      mockGetPoolSymbolAll.mockResolvedValueOnce(pools);

      await service.getMarkets();

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] Fetching markets via SDK',
      );
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] Markets fetched',
        { count: 1 },
      );
    });
  });

  // ==========================================================================
  // getTickers
  // ==========================================================================

  describe('getTickers', () => {
    it('returns empty array for empty poolIds', async () => {
      const result = await service.getTickers([]);

      expect(result).toEqual([]);
      expect(mockGetTickerList).not.toHaveBeenCalled();
    });

    it('fetches tickers for given pool IDs', async () => {
      const tickers = [makeTicker()];
      mockGetTickerList.mockResolvedValueOnce(tickers);

      const result = await service.getTickers(['0xpool1']);

      expect(result).toEqual(tickers);
      expect(mockGetTickerList).toHaveBeenCalledWith({
        chainId: 59141,
        poolIds: ['0xpool1'],
      });
    });

    it('handles null response from SDK', async () => {
      mockGetTickerList.mockResolvedValueOnce(null);

      const result = await service.getTickers(['0xpool1']);

      expect(result).toEqual([]);
    });

    it('throws error on SDK failure', async () => {
      mockGetTickerList.mockRejectedValueOnce(new Error('Ticker fetch failed'));

      await expect(service.getTickers(['0xpool1'])).rejects.toThrow(
        'Ticker fetch failed',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getAllTickers
  // ==========================================================================

  describe('getAllTickers', () => {
    it('fetches markets then tickers for all pool IDs', async () => {
      const pools = [
        makePool({ poolId: '0xpool1' }),
        makePool({ poolId: '0xpool2', baseSymbol: 'PARTI' }),
      ];
      const tickers = [
        makeTicker({ poolId: '0xpool1' }),
        makeTicker({ poolId: '0xpool2' }),
      ];
      mockGetPoolSymbolAll.mockResolvedValueOnce(pools);
      mockGetTickerList.mockResolvedValueOnce(tickers);

      const result = await service.getAllTickers();

      expect(result).toEqual(tickers);
      expect(mockGetTickerList).toHaveBeenCalledWith({
        chainId: 59141,
        poolIds: ['0xpool1', '0xpool2'],
      });
    });

    it('returns empty array when no markets exist', async () => {
      mockGetPoolSymbolAll.mockResolvedValueOnce([]);

      const result = await service.getAllTickers();

      expect(result).toEqual([]);
      expect(mockGetTickerList).not.toHaveBeenCalled();
    });

    it('throws error on failure', async () => {
      mockGetPoolSymbolAll.mockRejectedValueOnce(new Error('Markets failed'));

      await expect(service.getAllTickers()).rejects.toThrow('Markets failed');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Price Polling
  // ==========================================================================

  describe('startPricePolling', () => {
    it('fetches tickers immediately and invokes callback', async () => {
      const tickers = [makeTicker()];
      mockGetTickerList.mockResolvedValueOnce(tickers);
      const callback = jest.fn();

      service.startPricePolling(['0xpool1'], callback);

      // Allow the immediate poll to complete
      await jest.advanceTimersByTimeAsync(0);

      expect(callback).toHaveBeenCalledWith(tickers);
    });

    it('schedules subsequent poll after interval', async () => {
      const tickers1 = [makeTicker({ price: '1000' })];
      const tickers2 = [makeTicker({ price: '2000' })];
      mockGetTickerList.mockResolvedValueOnce(tickers1);
      mockGetTickerList.mockResolvedValueOnce(tickers2);
      const callback = jest.fn();

      service.startPricePolling(['0xpool1'], callback);

      // Complete first poll
      await jest.advanceTimersByTimeAsync(0);
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance to next polling interval
      await jest.advanceTimersByTimeAsync(MYX_PRICE_POLLING_INTERVAL_MS);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(tickers2);
    });

    it('stops previous polling when starting new one', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      mockGetTickerList.mockResolvedValue([makeTicker()]);

      service.startPricePolling(['0xpool1'], callback1);
      service.startPricePolling(['0xpool2'], callback2);

      await jest.advanceTimersByTimeAsync(0);

      // Only the second callback receives updates after re-start
      expect(callback2).toHaveBeenCalled();
    });

    it('continues polling even when a poll fails', async () => {
      const tickers = [makeTicker()];
      mockGetTickerList.mockRejectedValueOnce(new Error('Temporary failure'));
      mockGetTickerList.mockResolvedValueOnce(tickers);
      const callback = jest.fn();

      service.startPricePolling(['0xpool1'], callback);

      // First poll fails
      await jest.advanceTimersByTimeAsync(0);
      expect(callback).not.toHaveBeenCalled();

      // Next poll succeeds
      await jest.advanceTimersByTimeAsync(MYX_PRICE_POLLING_INTERVAL_MS);
      expect(callback).toHaveBeenCalledWith(tickers);
    });

    it('does not invoke callback if polling stopped during fetch', async () => {
      const tickers = [makeTicker()];
      mockGetTickerList.mockImplementation(async () => {
        // Simulate stopping polling during the async fetch
        service.stopPricePolling();
        return tickers;
      });
      const callback = jest.fn();

      service.startPricePolling(['0xpool1'], callback);
      await jest.advanceTimersByTimeAsync(0);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('stopPricePolling', () => {
    it('clears active polling', async () => {
      mockGetTickerList.mockResolvedValue([makeTicker()]);
      const callback = jest.fn();

      service.startPricePolling(['0xpool1'], callback);
      await jest.advanceTimersByTimeAsync(0);

      callback.mockClear();
      service.stopPricePolling();

      // Advance past multiple polling intervals
      await jest.advanceTimersByTimeAsync(MYX_PRICE_POLLING_INTERVAL_MS * 3);

      expect(callback).not.toHaveBeenCalled();
    });

    it('is safe to call when no polling is active', () => {
      expect(() => service.stopPricePolling()).not.toThrow();
    });

    it('logs when stopping', () => {
      service.stopPricePolling();

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] Stopped price polling',
      );
    });
  });

  // ==========================================================================
  // ping
  // ==========================================================================

  describe('ping', () => {
    it('resolves when SDK call succeeds', async () => {
      mockGetTickerList.mockResolvedValueOnce([]);

      await expect(service.ping()).resolves.toBeUndefined();
    });

    it('throws on SDK failure', async () => {
      mockGetTickerList.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(service.ping()).rejects.toThrow('Connection refused');
    });

    it('throws on timeout', async () => {
      mockGetTickerList.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      );

      const pingPromise = service.ping(100);

      // Advance timer past the timeout
      jest.advanceTimersByTime(150);

      await expect(pingPromise).rejects.toThrow('MYX ping timeout');
    });

    it('uses default 5000ms timeout', async () => {
      mockGetTickerList.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      );

      const pingPromise = service.ping();
      jest.advanceTimersByTime(5001);

      await expect(pingPromise).rejects.toThrow('MYX ping timeout');
    });

    it('clears timeout on successful ping', async () => {
      mockGetTickerList.mockResolvedValueOnce([]);
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      await service.ping();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  // ==========================================================================
  // disconnect
  // ==========================================================================

  describe('disconnect', () => {
    it('stops polling and clears cache', async () => {
      const pools = [makePool()];
      mockGetPoolSymbolAll.mockResolvedValueOnce(pools);
      await service.getMarkets();

      service.disconnect();

      // After disconnect, next getMarkets call requires a new fetch
      mockGetPoolSymbolAll.mockResolvedValueOnce([
        makePool({ poolId: '0xnew' }),
      ]);
      const result = await service.getMarkets();

      expect(result).toEqual([makePool({ poolId: '0xnew' })]);
    });

    it('logs disconnection', () => {
      service.disconnect();

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] Disconnected',
      );
    });
  });

  // ==========================================================================
  // getIsTestnet
  // ==========================================================================

  describe('getIsTestnet', () => {
    it('returns true for testnet configuration', () => {
      expect(service.getIsTestnet()).toBe(true);
    });

    it('returns false for mainnet configuration', () => {
      const mainnetService = new MYXClientService(mockDeps, {
        isTestnet: false,
      });

      expect(mainnetService.getIsTestnet()).toBe(false);
      mainnetService.disconnect();
    });
  });

  // ==========================================================================
  // Error Context
  // ==========================================================================

  describe('error context', () => {
    it('includes testnet tag in error context for testnet service', async () => {
      mockGetPoolSymbolAll.mockRejectedValueOnce(new Error('fail'));

      try {
        await service.getMarkets();
      } catch {
        // expected
      }

      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            network: 'testnet',
            service: 'MYXClientService',
          }),
        }),
      );
    });

    it('includes mainnet tag in error context for mainnet service', async () => {
      const mainnetService = new MYXClientService(mockDeps, {
        isTestnet: false,
      });
      mockGetPoolSymbolAll.mockRejectedValueOnce(new Error('fail'));

      try {
        await mainnetService.getMarkets();
      } catch {
        // expected
      }

      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            network: 'mainnet',
          }),
        }),
      );

      mainnetService.disconnect();
    });
  });

  // ==========================================================================
  // Authenticated Read Operations
  // ==========================================================================

  describe('listPositions', () => {
    it('delegates to SDK and returns result', async () => {
      const mockResult = { code: 9200, data: [{ poolId: '0x1', size: '100' }] };
      mockListPositions.mockResolvedValueOnce(mockResult);

      const result = await service.listPositions('0xuser');

      expect(result).toEqual(mockResult);
      expect(mockListPositions).toHaveBeenCalledWith('0xuser');
    });

    it('wraps and rethrows errors', async () => {
      mockListPositions.mockRejectedValueOnce(new Error('API error'));

      await expect(service.listPositions('0xuser')).rejects.toThrow(
        'API error',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('getOrders', () => {
    it('delegates to SDK and returns result', async () => {
      const mockResult = { code: 9200, data: [] };
      mockGetOrders.mockResolvedValueOnce(mockResult);

      const result = await service.getOrders('0xuser');

      expect(result).toEqual(mockResult);
      expect(mockGetOrders).toHaveBeenCalledWith('0xuser');
    });

    it('wraps and rethrows errors', async () => {
      mockGetOrders.mockRejectedValueOnce(new Error('Order error'));

      await expect(service.getOrders('0xuser')).rejects.toThrow('Order error');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('getOrderHistory', () => {
    it('delegates to SDK with params and address', async () => {
      const params = { limit: 50, chainId: 59141 };
      const mockResult = { code: 9200, data: [] };
      mockGetOrderHistory.mockResolvedValueOnce(mockResult);

      const result = await service.getOrderHistory(
        params as Parameters<typeof service.getOrderHistory>[0],
        '0xuser',
      );

      expect(result).toEqual(mockResult);
      expect(mockGetOrderHistory).toHaveBeenCalledWith(params, '0xuser');
    });

    it('wraps and rethrows errors', async () => {
      mockGetOrderHistory.mockRejectedValueOnce(new Error('History error'));

      await expect(
        service.getOrderHistory(
          { limit: 50 } as Parameters<typeof service.getOrderHistory>[0],
          '0xuser',
        ),
      ).rejects.toThrow('History error');
    });
  });

  describe('getPositionHistory', () => {
    it('delegates to SDK with params and address', async () => {
      const params = { limit: 50 };
      const mockResult = { code: 9200, data: [] };
      mockGetPositionHistory.mockResolvedValueOnce(mockResult);

      const result = await service.getPositionHistory(
        params as Parameters<typeof service.getPositionHistory>[0],
        '0xuser',
      );

      expect(result).toEqual(mockResult);
      expect(mockGetPositionHistory).toHaveBeenCalledWith(params, '0xuser');
    });

    it('wraps and rethrows errors', async () => {
      mockGetPositionHistory.mockRejectedValueOnce(new Error('Pos history'));

      await expect(
        service.getPositionHistory(
          { limit: 50 } as Parameters<typeof service.getPositionHistory>[0],
          '0xuser',
        ),
      ).rejects.toThrow('Pos history');
    });
  });

  describe('getAccountInfo', () => {
    it('delegates to SDK with chainId, address, poolId', async () => {
      const mockResult = { code: 9200, data: { totalCollateral: '1000' } };
      mockGetAccountInfo.mockResolvedValueOnce(mockResult);

      const result = await service.getAccountInfo(59141, '0xuser', '0xpool1');

      expect(result).toEqual(mockResult);
      expect(mockGetAccountInfo).toHaveBeenCalledWith(
        59141,
        '0xuser',
        '0xpool1',
      );
    });

    it('wraps and rethrows errors', async () => {
      mockGetAccountInfo.mockRejectedValueOnce(new Error('Account error'));

      await expect(
        service.getAccountInfo(59141, '0xuser', '0xpool1'),
      ).rejects.toThrow('Account error');
    });
  });

  describe('getWalletQuoteTokenBalance', () => {
    it('delegates to SDK', async () => {
      const mockResult = { code: 9200, data: '500000000' };
      mockGetWalletQuoteTokenBalance.mockResolvedValueOnce(mockResult);

      const result = await service.getWalletQuoteTokenBalance(59141, '0xuser');

      expect(result).toEqual(mockResult);
      expect(mockGetWalletQuoteTokenBalance).toHaveBeenCalledWith({
        address: '0xuser',
        chainId: 59141,
        tokenAddress: '0xD984fd34f91F92DA0586e1bE82E262fF27DC431b',
      });
    });

    it('wraps and rethrows errors', async () => {
      mockGetWalletQuoteTokenBalance.mockRejectedValueOnce(
        new Error('Balance error'),
      );

      await expect(
        service.getWalletQuoteTokenBalance(59141, '0xuser'),
      ).rejects.toThrow('Balance error');
    });
  });

  describe('getTradeFlow', () => {
    it('delegates to SDK with params and address', async () => {
      const params = { limit: 50 };
      const mockResult = { code: 9200, data: [] };
      mockGetTradeFlow.mockResolvedValueOnce(mockResult);

      const result = await service.getTradeFlow(
        params as Parameters<typeof service.getTradeFlow>[0],
        '0xuser',
      );

      expect(result).toEqual(mockResult);
      expect(mockGetTradeFlow).toHaveBeenCalledWith({
        ...params,
        accessToken: 'mock-token',
        address: '0xuser',
      });
    });

    it('wraps and rethrows errors', async () => {
      mockGetTradeFlow.mockRejectedValueOnce(new Error('Flow error'));

      await expect(
        service.getTradeFlow(
          { limit: 50 } as Parameters<typeof service.getTradeFlow>[0],
          '0xuser',
        ),
      ).rejects.toThrow('Flow error');
    });
  });

  // ==========================================================================
  // Kline (Candle) Data
  // ==========================================================================

  describe('getKlineData', () => {
    it('fetches kline data from SDK', async () => {
      const klineData = [
        {
          time: 1700000000,
          open: '50000',
          close: '51000',
          high: '52000',
          low: '49000',
        },
      ];
      mockGetKlineList.mockResolvedValueOnce(klineData);

      const result = await service.getKlineData({
        poolId: '0xpool1',
        interval: '1h' as Parameters<
          typeof service.getKlineData
        >[0]['interval'],
        limit: 100,
      });

      expect(result).toEqual(klineData);
      expect(mockGetKlineList).toHaveBeenCalledWith(
        expect.objectContaining({
          poolId: '0xpool1',
          chainId: 59141,
          interval: '1h',
          limit: 100,
        }),
      );
    });

    it('returns empty array when SDK returns null', async () => {
      mockGetKlineList.mockResolvedValueOnce(null);

      const result = await service.getKlineData({
        poolId: '0xpool1',
        interval: '1h' as Parameters<
          typeof service.getKlineData
        >[0]['interval'],
        limit: 100,
      });

      expect(result).toEqual([]);
    });

    it('wraps and rethrows errors', async () => {
      mockGetKlineList.mockRejectedValueOnce(new Error('Kline error'));

      await expect(
        service.getKlineData({
          poolId: '0xpool1',
          interval: '1h' as Parameters<
            typeof service.getKlineData
          >[0]['interval'],
          limit: 100,
        }),
      ).rejects.toThrow('Kline error');
    });
  });

  // ==========================================================================
  // Global ID
  // ==========================================================================

  describe('getGlobalId', () => {
    it('fetches globalId from market detail and caches it', async () => {
      mockGetMarketDetail.mockResolvedValueOnce({ globalId: 42 });

      const result = await service.getGlobalId('0xpool1');

      expect(result).toBe(42);
      expect(mockGetMarketDetail).toHaveBeenCalledWith({
        chainId: 59141,
        poolId: '0xpool1',
      });
    });

    it('returns cached globalId on subsequent calls', async () => {
      mockGetMarketDetail.mockResolvedValueOnce({ globalId: 42 });

      await service.getGlobalId('0xpool1');
      const result = await service.getGlobalId('0xpool1');

      expect(result).toBe(42);
      expect(mockGetMarketDetail).toHaveBeenCalledTimes(1);
    });

    it('wraps and rethrows errors', async () => {
      mockGetMarketDetail.mockRejectedValueOnce(new Error('Detail error'));

      await expect(service.getGlobalId('0xpool1')).rejects.toThrow(
        'Detail error',
      );
    });
  });

  // ==========================================================================
  // Kline WebSocket Subscriptions
  // ==========================================================================

  describe('subscribeToKline', () => {
    it('delegates to SDK subscription', () => {
      const callback = jest.fn();

      service.subscribeToKline(
        42,
        '1h' as Parameters<typeof service.subscribeToKline>[1],
        callback,
      );

      expect(mockSubscribeKline).toHaveBeenCalledWith(42, '1h', callback);
    });
  });

  describe('unsubscribeFromKline', () => {
    it('delegates to SDK unsubscription', () => {
      const callback = jest.fn();

      service.unsubscribeFromKline(
        42,
        '1h' as Parameters<typeof service.unsubscribeFromKline>[1],
        callback,
      );

      expect(mockUnsubscribeKline).toHaveBeenCalledWith(42, '1h', callback);
    });
  });

  // ==========================================================================
  // Simple Getters
  // ==========================================================================

  describe('getChainId', () => {
    it('returns testnet chain ID', () => {
      expect(service.getChainId()).toBe(59141);
    });

    it('returns mainnet chain ID', () => {
      const mainnetService = new MYXClientService(mockDeps, {
        isTestnet: false,
      });

      expect(mainnetService.getChainId()).toBe(56);
      mainnetService.disconnect();
    });
  });

  describe('getNetwork', () => {
    it('returns testnet for testnet service', () => {
      expect(service.getNetwork()).toBe('testnet');
    });

    it('returns mainnet for mainnet service', () => {
      const mainnetService = new MYXClientService(mockDeps, {
        isTestnet: false,
      });

      expect(mainnetService.getNetwork()).toBe('mainnet');
      mainnetService.disconnect();
    });
  });

  describe('isAuthenticated', () => {
    it('returns false before authentication', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('returns true after successful authentication', async () => {
      // authenticate() calls myxClient.auth() synchronously, then sets #authenticated
      await service.authenticate(mockSignerLike, {}, '0xuser');

      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('isAuthenticatedForAddress', () => {
    it('returns false before authentication', () => {
      expect(service.isAuthenticatedForAddress('0xuser')).toBe(false);
    });

    it('returns true for the authenticated address', async () => {
      await service.authenticate(mockSignerLike, {}, '0xuser');

      expect(service.isAuthenticatedForAddress('0xuser')).toBe(true);
    });

    it('returns true regardless of address casing', async () => {
      await service.authenticate(mockSignerLike, {}, '0xUser');

      expect(service.isAuthenticatedForAddress('0xuser')).toBe(true);
      expect(service.isAuthenticatedForAddress('0xUSER')).toBe(true);
    });

    it('returns false for a different address', async () => {
      await service.authenticate(mockSignerLike, {}, '0xuser');

      expect(service.isAuthenticatedForAddress('0xother')).toBe(false);
    });

    it('returns false after disconnect', async () => {
      await service.authenticate(mockSignerLike, {}, '0xuser');
      service.disconnect();

      expect(service.isAuthenticatedForAddress('0xuser')).toBe(false);
    });
  });

  // ==========================================================================
  // authenticate
  // ==========================================================================

  describe('authenticate', () => {
    it('calls SDK auth with signer, getAccessToken, and walletClient', async () => {
      const walletClient = {};

      await service.authenticate(mockSignerLike, walletClient, '0xuser');

      expect(mockAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          signer: mockSignerLike,
          walletClient,
          getAccessToken: expect.any(Function),
        }),
      );
    });

    it('skips if already authenticated', async () => {
      await service.authenticate(mockSignerLike, {}, '0xuser');
      mockAuth.mockClear();

      await service.authenticate(mockSignerLike, {}, '0xuser');

      expect(mockAuth).not.toHaveBeenCalled();
    });

    it('deduplicates concurrent auth calls', async () => {
      // Slow auth: resolve after a tick
      let resolveAuth: () => void = () => undefined;
      mockAuth.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveAuth = resolve;
          }),
      );

      const p1 = service.authenticate(mockSignerLike, {}, '0xuser');
      const p2 = service.authenticate(mockSignerLike, {}, '0xuser');

      resolveAuth();
      await Promise.all([p1, p2]);

      // Only one SDK auth call despite two authenticate() calls
      expect(mockAuth).toHaveBeenCalledTimes(1);
    });

    it('wraps and rethrows SDK auth errors', async () => {
      mockAuth.mockImplementationOnce(() => {
        throw new Error('Auth failed');
      });

      await expect(
        service.authenticate(mockSignerLike, {}, '0xuser'),
      ).rejects.toThrow('Auth failed');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('logs WebSocket auth success', async () => {
      mockWsAuth.mockResolvedValueOnce(undefined);

      await service.authenticate(mockSignerLike, {}, '0xuser');

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] WebSocket auth successful',
      );
    });

    it('logs WebSocket auth failure without throwing', async () => {
      mockWsAuth.mockRejectedValueOnce(new Error('WS auth error'));

      await expect(
        service.authenticate(mockSignerLike, {}, '0xuser'),
      ).resolves.toBeUndefined();

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] WebSocket auth failed (REST auth OK, WS subscriptions will use polling fallback)',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  // ==========================================================================
  // getAuthenticatedAddress
  // ==========================================================================

  describe('getAuthenticatedAddress', () => {
    it('returns null before authentication', () => {
      expect(service.getAuthenticatedAddress()).toBeNull();
    });

    it('returns the lowercased authenticated address', async () => {
      await service.authenticate(mockSignerLike, {}, '0xUser');

      expect(service.getAuthenticatedAddress()).toBe('0xuser');
    });

    it('returns null after disconnect', async () => {
      await service.authenticate(mockSignerLike, {}, '0xuser');
      service.disconnect();

      expect(service.getAuthenticatedAddress()).toBeNull();
    });
  });

  // ==========================================================================
  // getPoolOpenOrders
  // ==========================================================================

  describe('getPoolOpenOrders', () => {
    it('delegates to SDK api.getPoolOpenOrders and returns data array', async () => {
      const mockOrders = [{ orderId: 'ord-1', poolId: '0xpool1' }];
      mockGetPoolOpenOrders.mockResolvedValueOnce({ data: mockOrders });

      const result = await service.getPoolOpenOrders('0xuser');

      expect(result).toEqual(mockOrders);
      expect(mockGetPoolOpenOrders).toHaveBeenCalledWith(
        'mock-token',
        '0xuser',
        59141,
      );
    });

    it('returns empty array when SDK response has no data', async () => {
      mockGetPoolOpenOrders.mockResolvedValueOnce({ data: null });

      const result = await service.getPoolOpenOrders('0xuser');

      expect(result).toEqual([]);
    });

    it('wraps and rethrows errors', async () => {
      mockGetPoolOpenOrders.mockRejectedValueOnce(
        new Error('Open orders error'),
      );

      await expect(service.getPoolOpenOrders('0xuser')).rejects.toThrow(
        'Open orders error',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getBaseDetail
  // ==========================================================================

  describe('getBaseDetail', () => {
    it('delegates to SDK and returns normalized result', async () => {
      mockGetBaseDetail.mockResolvedValueOnce({
        fundingRate: '0.0001',
        longPosition: 5000,
        shortPosition: 3000,
        volume: '1000000',
      });

      const result = await service.getBaseDetail('0xpool1');

      expect(result).toEqual({
        fundingRate: '0.0001',
        longPosition: 5000,
        shortPosition: 3000,
        volume: '1000000',
      });
      expect(mockGetBaseDetail).toHaveBeenCalledWith({
        chainId: 59141,
        poolId: '0xpool1',
      });
    });

    it('returns zero defaults when SDK fields are missing', async () => {
      mockGetBaseDetail.mockResolvedValueOnce({});

      const result = await service.getBaseDetail('0xpool1');

      expect(result).toEqual({
        fundingRate: '0',
        longPosition: 0,
        shortPosition: 0,
        volume: '0',
      });
    });

    it('wraps and rethrows errors', async () => {
      mockGetBaseDetail.mockRejectedValueOnce(new Error('Base detail error'));

      await expect(service.getBaseDetail('0xpool1')).rejects.toThrow(
        'Base detail error',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getWalletQuoteTokenBalance — mainnet token address
  // ==========================================================================

  describe('getWalletQuoteTokenBalance (mainnet)', () => {
    it('uses the mainnet collateral token address', async () => {
      const mainnetService = new MYXClientService(mockDeps, {
        isTestnet: false,
      });
      mockGetWalletQuoteTokenBalance.mockResolvedValueOnce({
        code: 9200,
        data: '250000000',
      });

      await mainnetService.getWalletQuoteTokenBalance(56, '0xuser');

      expect(mockGetWalletQuoteTokenBalance).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: 56,
          address: '0xuser',
        }),
      );
      // Confirm it's NOT the testnet token address
      const call = mockGetWalletQuoteTokenBalance.mock.calls[0][0];
      expect(call.tokenAddress).not.toBe(
        '0xD984fd34f91F92DA0586e1bE82E262fF27DC431b',
      );
      mainnetService.disconnect();
    });
  });

  // ==========================================================================
  // WebSocket subscriptions — positions
  // ==========================================================================

  describe('subscribeToPositions', () => {
    it('delegates to SDK subscription.subscribePosition', async () => {
      const callback = jest.fn();
      mockSubscribePosition.mockResolvedValueOnce(undefined);

      await service.subscribeToPositions(callback);

      expect(mockSubscribePosition).toHaveBeenCalledWith(callback);
    });
  });

  describe('unsubscribeFromPositions', () => {
    it('delegates to SDK subscription.unsubscribePosition', () => {
      const callback = jest.fn();

      service.unsubscribeFromPositions(callback);

      expect(mockUnsubscribePosition).toHaveBeenCalledWith(callback);
    });

    it('swallows errors (expected during disconnect)', () => {
      mockUnsubscribePosition.mockImplementationOnce(() => {
        throw new Error('SOCKET_NOT_CONNECTED');
      });
      const callback = jest.fn();

      expect(() => service.unsubscribeFromPositions(callback)).not.toThrow();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] Position unsubscribe failed (expected during disconnect)',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  // ==========================================================================
  // WebSocket subscriptions — orders
  // ==========================================================================

  describe('subscribeToOrders', () => {
    it('delegates to SDK subscription.subscribeOrder', async () => {
      const callback = jest.fn();
      mockSubscribeOrder.mockResolvedValueOnce(undefined);

      await service.subscribeToOrders(callback);

      expect(mockSubscribeOrder).toHaveBeenCalledWith(callback);
    });
  });

  describe('unsubscribeFromOrders', () => {
    it('delegates to SDK subscription.unsubscribeOrder', () => {
      const callback = jest.fn();

      service.unsubscribeFromOrders(callback);

      expect(mockUnsubscribeOrder).toHaveBeenCalledWith(callback);
    });

    it('swallows errors (expected during disconnect)', () => {
      mockUnsubscribeOrder.mockImplementationOnce(() => {
        throw new Error('SOCKET_NOT_CONNECTED');
      });
      const callback = jest.fn();

      expect(() => service.unsubscribeFromOrders(callback)).not.toThrow();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] Order unsubscribe failed (expected during disconnect)',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  // ==========================================================================
  // unsubscribeFromKline — error path
  // ==========================================================================

  describe('unsubscribeFromKline (error path)', () => {
    it('swallows errors (expected during disconnect)', () => {
      mockUnsubscribeKline.mockImplementationOnce(() => {
        throw new Error('SOCKET_NOT_CONNECTED');
      });
      const callback = jest.fn();

      expect(() =>
        service.unsubscribeFromKline(
          42,
          '1h' as Parameters<typeof service.unsubscribeFromKline>[1],
          callback,
        ),
      ).not.toThrow();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        '[MYXClientService] Kline unsubscribe failed (expected during disconnect)',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  // ==========================================================================
  // Order write operations
  // ==========================================================================

  describe('createIncreaseOrder', () => {
    it('delegates to SDK and returns result', async () => {
      const mockResult = { code: 9200, message: 'ok' };
      mockCreateIncreaseOrder.mockResolvedValueOnce(mockResult);
      const params = {
        poolId: '0xpool1',
        address: '0xuser',
      } as Parameters<typeof service.createIncreaseOrder>[0];

      const result = await service.createIncreaseOrder(
        params,
        '100',
        'market-1',
      );

      expect(result).toEqual(mockResult);
      expect(mockCreateIncreaseOrder).toHaveBeenCalledWith(
        params,
        '100',
        'market-1',
      );
    });

    it('wraps and rethrows errors', async () => {
      mockCreateIncreaseOrder.mockRejectedValueOnce(
        new Error('Increase order failed'),
      );
      const params = {
        poolId: '0xpool1',
        address: '0xuser',
      } as Parameters<typeof service.createIncreaseOrder>[0];

      await expect(
        service.createIncreaseOrder(params, '100', 'market-1'),
      ).rejects.toThrow('Increase order failed');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('createDecreaseOrder', () => {
    it('delegates to SDK and returns result', async () => {
      const mockResult = { code: 9200, message: 'ok' };
      mockCreateDecreaseOrder.mockResolvedValueOnce(mockResult);
      const params = {
        poolId: '0xpool1',
        address: '0xuser',
      } as Parameters<typeof service.createDecreaseOrder>[0];

      const result = await service.createDecreaseOrder(params);

      expect(result).toEqual(mockResult);
      expect(mockCreateDecreaseOrder).toHaveBeenCalledWith(params);
    });

    it('wraps and rethrows errors', async () => {
      mockCreateDecreaseOrder.mockRejectedValueOnce(
        new Error('Decrease order failed'),
      );
      const params = {
        poolId: '0xpool1',
        address: '0xuser',
      } as Parameters<typeof service.createDecreaseOrder>[0];

      await expect(service.createDecreaseOrder(params)).rejects.toThrow(
        'Decrease order failed',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('delegates to SDK and returns result', async () => {
      const mockResult = { code: 9200, message: 'cancelled' };
      mockCancelOrder.mockResolvedValueOnce(mockResult);

      const result = await service.cancelOrder('ord-1', 59141);

      expect(result).toEqual(mockResult);
      expect(mockCancelOrder).toHaveBeenCalledWith('ord-1', 59141);
    });

    it('wraps and rethrows errors', async () => {
      mockCancelOrder.mockRejectedValueOnce(new Error('Cancel failed'));

      await expect(service.cancelOrder('ord-1', 59141)).rejects.toThrow(
        'Cancel failed',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('cancelOrders', () => {
    it('delegates to SDK with array of IDs and returns result', async () => {
      const mockResult = { code: 9200, message: 'cancelled' };
      mockCancelOrders.mockResolvedValueOnce(mockResult);

      const result = await service.cancelOrders(['ord-1', 'ord-2'], 59141);

      expect(result).toEqual(mockResult);
      expect(mockCancelOrders).toHaveBeenCalledWith(['ord-1', 'ord-2'], 59141);
    });

    it('wraps and rethrows errors', async () => {
      mockCancelOrders.mockRejectedValueOnce(new Error('Cancel orders failed'));

      await expect(service.cancelOrders(['ord-1'], 59141)).rejects.toThrow(
        'Cancel orders failed',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('createPositionTpSlOrder', () => {
    it('delegates to SDK and returns result', async () => {
      const mockResult = { code: 9200, message: 'ok' };
      mockCreatePositionTpSlOrder.mockResolvedValueOnce(mockResult);
      const params = {
        poolId: '0xpool1',
        positionId: 'pos-1',
      } as Parameters<typeof service.createPositionTpSlOrder>[0];

      const result = await service.createPositionTpSlOrder(params);

      expect(result).toEqual(mockResult);
      expect(mockCreatePositionTpSlOrder).toHaveBeenCalledWith(params);
    });

    it('wraps and rethrows errors', async () => {
      mockCreatePositionTpSlOrder.mockRejectedValueOnce(
        new Error('TP/SL order failed'),
      );
      const params = {
        poolId: '0xpool1',
        positionId: 'pos-1',
      } as Parameters<typeof service.createPositionTpSlOrder>[0];

      await expect(service.createPositionTpSlOrder(params)).rejects.toThrow(
        'TP/SL order failed',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('updateOrderTpSl', () => {
    it('delegates to SDK with all parameters and returns result', async () => {
      const mockResult = { code: 9200, message: 'updated' };
      mockUpdateOrderTpSl.mockResolvedValueOnce(mockResult);
      const params = {
        orderId: 'ord-1',
      } as Parameters<typeof service.updateOrderTpSl>[0];

      const result = await service.updateOrderTpSl(
        params,
        '0xquote',
        59141,
        '0xuser',
        'market-1',
        true,
      );

      expect(result).toEqual(mockResult);
      expect(mockUpdateOrderTpSl).toHaveBeenCalledWith(
        params,
        '0xquote',
        59141,
        '0xuser',
        'market-1',
        true,
      );
    });

    it('wraps and rethrows errors', async () => {
      mockUpdateOrderTpSl.mockRejectedValueOnce(
        new Error('Update order failed'),
      );
      const params = {
        orderId: 'ord-1',
      } as Parameters<typeof service.updateOrderTpSl>[0];

      await expect(
        service.updateOrderTpSl(params, '0xquote', 59141, '0xuser', 'market-1'),
      ).rejects.toThrow('Update order failed');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('adjustCollateral', () => {
    it('delegates to SDK and returns result', async () => {
      const mockResult = { code: 9200, message: 'adjusted' };
      mockAdjustCollateral.mockResolvedValueOnce(mockResult);
      const params = {
        poolId: '0xpool1',
        positionId: 'pos-1',
        adjustAmount: '50000000',
        quoteToken: '0xquote',
        chainId: 59141,
        address: '0xuser',
      };

      const result = await service.adjustCollateral(params);

      expect(result).toEqual(mockResult);
      expect(mockAdjustCollateral).toHaveBeenCalledWith(params);
    });

    it('wraps and rethrows errors', async () => {
      mockAdjustCollateral.mockRejectedValueOnce(
        new Error('Adjust collateral failed'),
      );

      await expect(
        service.adjustCollateral({
          poolId: '0xpool1',
          positionId: 'pos-1',
          adjustAmount: '50000000',
          quoteToken: '0xquote',
          chainId: 59141,
          address: '0xuser',
        }),
      ).rejects.toThrow('Adjust collateral failed');
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getMarketDetail
  // ==========================================================================

  describe('getMarketDetail', () => {
    it('fetches and returns marketId, baseSymbol, quoteSymbol', async () => {
      mockGetMarketDetail.mockResolvedValueOnce({
        globalId: 42,
        marketId: 'market-1',
        baseSymbol: 'BTC',
        quoteSymbol: 'USDT',
      });

      const result = await service.getMarketDetail('0xpool1');

      expect(result).toEqual({
        marketId: 'market-1',
        baseSymbol: 'BTC',
        quoteSymbol: 'USDT',
      });
      expect(mockGetMarketDetail).toHaveBeenCalledWith({
        chainId: 59141,
        poolId: '0xpool1',
      });
    });

    it('wraps and rethrows errors', async () => {
      mockGetMarketDetail.mockRejectedValueOnce(
        new Error('Market detail error'),
      );

      await expect(service.getMarketDetail('0xpool1')).rejects.toThrow(
        'Market detail error',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getOraclePrice
  // ==========================================================================

  describe('getOraclePrice', () => {
    it('delegates to SDK utils.getOraclePrice and returns normalized result', async () => {
      mockGetOraclePrice.mockResolvedValueOnce({
        poolId: '0xpool1',
        price: '50000.00',
        publishTime: 1700000000,
        oracleType: 'chainlink',
      });

      const result = await service.getOraclePrice('0xpool1');

      expect(result).toEqual({
        poolId: '0xpool1',
        price: '50000.00',
        publishTime: 1700000000,
      });
      expect(mockGetOraclePrice).toHaveBeenCalledWith('0xpool1', 59141);
    });

    it('wraps and rethrows errors', async () => {
      mockGetOraclePrice.mockRejectedValueOnce(new Error('Oracle price error'));

      await expect(service.getOraclePrice('0xpool1')).rejects.toThrow(
        'Oracle price error',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getNetworkFee
  // ==========================================================================

  describe('getNetworkFee', () => {
    it('delegates to SDK utils.getNetworkFee and returns fee as string', async () => {
      mockGetNetworkFee.mockResolvedValueOnce(1000000);

      const result = await service.getNetworkFee('market-1');

      expect(result).toBe('1000000');
      expect(mockGetNetworkFee).toHaveBeenCalledWith('market-1', 59141);
    });

    it('wraps and rethrows errors', async () => {
      mockGetNetworkFee.mockRejectedValueOnce(new Error('Network fee error'));

      await expect(service.getNetworkFee('market-1')).rejects.toThrow(
        'Network fee error',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getPoolLevelConfig
  // ==========================================================================

  describe('getPoolLevelConfig', () => {
    it('returns minOrderSizeInUsd from SDK response', async () => {
      mockGetPoolLevelConfig.mockResolvedValueOnce({
        levelConfig: { minOrderSizeInUsd: 10 },
      });

      const result = await service.getPoolLevelConfig('0xpool1');

      expect(result).toEqual({ minOrderSizeInUsd: 10 });
      expect(mockGetPoolLevelConfig).toHaveBeenCalledWith('0xpool1', 59141);
    });

    it('returns 0 when levelConfig is missing', async () => {
      mockGetPoolLevelConfig.mockResolvedValueOnce(null);

      const result = await service.getPoolLevelConfig('0xpool1');

      expect(result).toEqual({ minOrderSizeInUsd: 0 });
    });
  });

  // ==========================================================================
  // getUserTradingFeeRate
  // ==========================================================================

  describe('getUserTradingFeeRate', () => {
    it('returns takerFeeRate and makerFeeRate on success', async () => {
      mockGetUserTradingFeeRate.mockResolvedValueOnce({
        code: 0,
        data: { takerFeeRate: '0.001', makerFeeRate: '0.0005' },
      });

      const result = await service.getUserTradingFeeRate();

      expect(result).toEqual({
        takerFeeRate: '0.001',
        makerFeeRate: '0.0005',
      });
      expect(mockGetUserTradingFeeRate).toHaveBeenCalledWith(0, 0, 59141);
    });

    it('passes custom assetClass, riskTier, and chainId', async () => {
      mockGetUserTradingFeeRate.mockResolvedValueOnce({
        code: 0,
        data: { takerFeeRate: '0.002', makerFeeRate: '0.001' },
      });

      await service.getUserTradingFeeRate(1, 2, 42);

      expect(mockGetUserTradingFeeRate).toHaveBeenCalledWith(1, 2, 42);
    });

    it('throws when SDK returns non-zero code', async () => {
      mockGetUserTradingFeeRate.mockResolvedValueOnce({
        code: 5000,
        message: 'bad request',
        data: null,
      });

      await expect(service.getUserTradingFeeRate()).rejects.toThrow(
        'Fee rate API error',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('wraps and rethrows SDK errors', async () => {
      mockGetUserTradingFeeRate.mockRejectedValueOnce(
        new Error('Fee rate network error'),
      );

      await expect(service.getUserTradingFeeRate()).rejects.toThrow(
        'Fee rate network error',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });
});
