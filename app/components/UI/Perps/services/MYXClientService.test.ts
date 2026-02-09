import { MyxClient } from '@myx-trade/sdk';
import { MYXClientService } from './MYXClientService';
import type { PerpsPlatformDependencies } from '../controllers/types';
import type { MYXPoolSymbol, MYXTicker } from '../types/myx-types';
import { createMockInfrastructure } from '../__mocks__/serviceMocks';
import { MYX_PRICE_POLLING_INTERVAL_MS } from '../constants/myxConfig';

// ============================================================================
// Mock @myx-trade/sdk — auto-mock, then configure in beforeEach
// ============================================================================

jest.mock('@myx-trade/sdk');

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

// ============================================================================
// Tests
// ============================================================================

describe('MYXClientService', () => {
  let service: MYXClientService;
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let mockGetPoolSymbolAll: jest.Mock;
  let mockGetTickerList: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Create fresh mock functions each test
    mockGetPoolSymbolAll = jest.fn();
    mockGetTickerList = jest.fn();

    // Configure the MyxClient constructor to return our mock instance
    (MyxClient as jest.Mock).mockImplementation(() => ({
      markets: {
        getPoolSymbolAll: mockGetPoolSymbolAll,
        getTickerList: mockGetTickerList,
      },
    }));

    mockDeps = createMockInfrastructure();
    service = new MYXClientService(mockDeps, { isTestnet: true });
  });

  afterEach(() => {
    service.disconnect();
    jest.useRealTimers();
    jest.resetAllMocks();
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
          chainId: 97,
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
        chainId: 97,
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
        chainId: 97,
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
});
