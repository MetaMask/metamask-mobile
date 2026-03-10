import type { PerpsPlatformDependencies } from '@metamask/perps-controller';

import { createMockInfrastructure } from '../../../components/UI/Perps/__mocks__/serviceMocks';
import { MYX_PRICE_POLLING_INTERVAL_MS } from '../constants/myxConfig';
import type { MYXPoolSymbol, MYXTicker } from '../types/myx-types';

import { MYXClientService } from './MYXClientService';

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
const mockSubscribeKline = jest.fn();
const mockUnsubscribeKline = jest.fn();
const mockAuth = jest.fn();

jest.mock('@myx-trade/sdk', () => ({
  MyxClient: jest.fn(() => ({
    markets: {
      getPoolSymbolAll: mockGetPoolSymbolAll,
      getTickerList: mockGetTickerList,
      getKlineList: mockGetKlineList,
      getMarketDetail: mockGetMarketDetail,
    },
    subscription: {
      connect: mockWsConnect,
      disconnect: mockWsDisconnect,
      subscribeKline: mockSubscribeKline,
      unsubscribeKline: mockUnsubscribeKline,
    },
    position: {
      listPositions: mockListPositions,
      getPositionHistory: mockGetPositionHistory,
    },
    order: {
      getOrders: mockGetOrders,
      getOrderHistory: mockGetOrderHistory,
    },
    account: {
      getAccountInfo: mockGetAccountInfo,
      getWalletQuoteTokenBalance: mockGetWalletQuoteTokenBalance,
      getTradeFlow: mockGetTradeFlow,
    },
    auth: mockAuth,
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
      expect(mockGetWalletQuoteTokenBalance).toHaveBeenCalledWith(
        59141,
        '0xuser',
      );
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
      expect(mockGetTradeFlow).toHaveBeenCalledWith(params, '0xuser');
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
      await service.authenticate({}, {}, '0xuser');

      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('isAuthenticatedForAddress', () => {
    it('returns false before authentication', () => {
      expect(service.isAuthenticatedForAddress('0xuser')).toBe(false);
    });

    it('returns true for the authenticated address', async () => {
      await service.authenticate({}, {}, '0xuser');

      expect(service.isAuthenticatedForAddress('0xuser')).toBe(true);
    });

    it('returns true regardless of address casing', async () => {
      await service.authenticate({}, {}, '0xUser');

      expect(service.isAuthenticatedForAddress('0xuser')).toBe(true);
      expect(service.isAuthenticatedForAddress('0xUSER')).toBe(true);
    });

    it('returns false for a different address', async () => {
      await service.authenticate({}, {}, '0xuser');

      expect(service.isAuthenticatedForAddress('0xother')).toBe(false);
    });

    it('returns false after disconnect', async () => {
      await service.authenticate({}, {}, '0xuser');
      service.disconnect();

      expect(service.isAuthenticatedForAddress('0xuser')).toBe(false);
    });
  });

  // ==========================================================================
  // authenticate
  // ==========================================================================

  describe('authenticate', () => {
    it('calls SDK auth with signer, getAccessToken, and walletClient', async () => {
      const signer = { signMessage: jest.fn() };
      const walletClient = {};

      await service.authenticate(signer, walletClient, '0xuser');

      expect(mockAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          signer,
          walletClient,
          getAccessToken: expect.any(Function),
        }),
      );
    });

    it('skips if already authenticated', async () => {
      await service.authenticate({}, {}, '0xuser');
      mockAuth.mockClear();

      await service.authenticate({}, {}, '0xuser');

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

      const p1 = service.authenticate({}, {}, '0xuser');
      const p2 = service.authenticate({}, {}, '0xuser');

      resolveAuth();
      await Promise.all([p1, p2]);

      // Only one SDK auth call despite two authenticate() calls
      expect(mockAuth).toHaveBeenCalledTimes(1);
    });

    it('wraps and rethrows SDK auth errors', async () => {
      mockAuth.mockImplementationOnce(() => {
        throw new Error('Auth failed');
      });

      await expect(service.authenticate({}, {}, '0xuser')).rejects.toThrow(
        'Auth failed',
      );
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });
});
