import {
  predictCryptoTargetPriceKeys,
  predictCryptoTargetPriceOptions,
  clearTargetPriceCache,
  getTargetPriceCacheSize,
  type CryptoTargetPriceQueryParams,
} from './cryptoTargetPrice';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarket: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const defaultParams: CryptoTargetPriceQueryParams = {
  eventId: 'event-123',
  symbol: 'BTC',
  eventStartTime: '2025-01-01T00:00:00Z',
  variant: 'up',
  endDate: '2025-01-02',
};

const invokeQueryFn = async (
  params: CryptoTargetPriceQueryParams = defaultParams,
): Promise<number | null> => {
  const options = predictCryptoTargetPriceOptions(params);
  return (options.queryFn as NonNullable<typeof options.queryFn>)({} as never);
};

describe('cryptoTargetPrice queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTargetPriceCache();
  });

  describe('predictCryptoTargetPriceKeys', () => {
    it('returns base key for all crypto target prices', () => {
      expect(predictCryptoTargetPriceKeys.all()).toEqual([
        'predict',
        'cryptoTargetPrice',
      ]);
    });

    it('returns detail key with event id', () => {
      expect(predictCryptoTargetPriceKeys.detail('event-456')).toEqual([
        'predict',
        'cryptoTargetPrice',
        'event-456',
      ]);
    });
  });

  describe('predictCryptoTargetPriceOptions', () => {
    it('returns query options with correct query key', () => {
      const options = predictCryptoTargetPriceOptions(defaultParams);

      expect(options.queryKey).toEqual([
        'predict',
        'cryptoTargetPrice',
        'event-123',
      ]);
    });

    it('sets staleTime to Infinity for immutable data', () => {
      const options = predictCryptoTargetPriceOptions(defaultParams);

      expect(options.staleTime).toBe(Infinity);
    });
  });

  describe('queryFn', () => {
    it('fetches and returns target price from primary API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          openPrice: 42000,
          closePrice: 41800,
          timestamp: 1700000000000,
          completed: true,
          incomplete: false,
          cached: false,
        }),
      });

      const result = await invokeQueryFn();

      expect(result).toBe(42000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'polymarket.com/api/crypto/crypto-price?symbol=BTC',
        ),
      );
    });

    it('returns cached result on second call without a second network request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          openPrice: 42000,
          closePrice: 41800,
          timestamp: 1700000000000,
          completed: true,
          incomplete: false,
          cached: false,
        }),
      });

      const first = await invokeQueryFn();
      const second = await invokeQueryFn();

      expect(first).toBe(42000);
      expect(second).toBe(42000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns fallback value from groupItemThreshold when primary API fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      (
        Engine.context.PredictController.getMarket as jest.Mock
      ).mockResolvedValueOnce({
        outcomes: [{ groupItemThreshold: 41500 }],
      });

      const result = await invokeQueryFn();

      expect(result).toBe(41500);
      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining('falling back to groupItemThreshold'),
        expect.anything(),
      );
    });

    it('returns null when both primary API and fallback fail', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      (
        Engine.context.PredictController.getMarket as jest.Mock
      ).mockRejectedValueOnce(new Error('Network error'));

      const result = await invokeQueryFn();

      expect(result).toBeNull();
    });

    it('returns null when primary fails and fallback market has no outcomes', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      (
        Engine.context.PredictController.getMarket as jest.Mock
      ).mockResolvedValueOnce({
        outcomes: [],
      });

      const result = await invokeQueryFn();

      expect(result).toBeNull();
    });

    it('returns null when primary fails and fallback outcome has no groupItemThreshold', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      (
        Engine.context.PredictController.getMarket as jest.Mock
      ).mockResolvedValueOnce({
        outcomes: [{ groupItemThreshold: undefined }],
      });

      const result = await invokeQueryFn();

      expect(result).toBeNull();
    });

    it('throws when primary API returns unexpected shape', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 'not-a-number' }),
      });
      (
        Engine.context.PredictController.getMarket as jest.Mock
      ).mockResolvedValueOnce({
        outcomes: [{ groupItemThreshold: 99000 }],
      });

      const result = await invokeQueryFn();

      expect(result).toBe(99000);
      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining('falling back'),
        expect.anything(),
      );
    });

    it('caches fallback price for subsequent calls', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      (
        Engine.context.PredictController.getMarket as jest.Mock
      ).mockResolvedValueOnce({
        outcomes: [{ groupItemThreshold: 41500 }],
      });

      await invokeQueryFn();
      const second = await invokeQueryFn();

      expect(second).toBe(41500);
      expect(Engine.context.PredictController.getMarket).toHaveBeenCalledTimes(
        1,
      );
    });

    it('encodes query parameters in the API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          openPrice: 100,
          closePrice: 99,
          timestamp: 1700000000000,
          completed: true,
          incomplete: false,
          cached: false,
        }),
      });

      await invokeQueryFn({
        ...defaultParams,
        symbol: 'ETH/USD',
        eventStartTime: '2025-01-01 00:00:00',
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('symbol=ETH%2FUSD');
      expect(calledUrl).toContain('eventStartTime=2025-01-01%2000%3A00%3A00');
    });

    it('passes correct marketId to fallback getMarket call', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      (
        Engine.context.PredictController.getMarket as jest.Mock
      ).mockResolvedValueOnce({
        outcomes: [{ groupItemThreshold: 50000 }],
      });

      await invokeQueryFn({ ...defaultParams, eventId: 'custom-event-789' });

      expect(Engine.context.PredictController.getMarket).toHaveBeenCalledWith({
        marketId: 'custom-event-789',
      });
    });

    it('manages cache size correctly across different events', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            openPrice: 42000,
            closePrice: 41800,
            timestamp: 1700000000000,
            completed: true,
            incomplete: false,
            cached: false,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            openPrice: 3000,
            closePrice: 2950,
            timestamp: 1700000000000,
            completed: true,
            incomplete: false,
            cached: false,
          }),
        });

      await invokeQueryFn({ ...defaultParams, eventId: 'event-btc' });
      await invokeQueryFn({ ...defaultParams, eventId: 'event-eth' });

      expect(getTargetPriceCacheSize()).toBe(2);
    });

    it('clears module-level cache via clearTargetPriceCache', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          openPrice: 42000,
          closePrice: 41800,
          timestamp: 1700000000000,
          completed: true,
          incomplete: false,
          cached: false,
        }),
      });

      await invokeQueryFn();
      expect(getTargetPriceCacheSize()).toBe(1);

      clearTargetPriceCache();
      expect(getTargetPriceCacheSize()).toBe(0);
    });

    it('uses provided outcomes for fallback without calling getMarket', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await invokeQueryFn({
        ...defaultParams,
        outcomes: [
          {
            id: 'o1',
            providerId: 'pm',
            marketId: 'event-123',
            title: 'Up',
            description: '',
            image: '',
            status: 'open',
            tokens: [],
            volume: 0,
            groupItemTitle: 'Up/Down',
            groupItemThreshold: 43000,
          },
        ],
      });

      expect(result).toBe(43000);
      expect(Engine.context.PredictController.getMarket).not.toHaveBeenCalled();
    });

    it('returns null when provided outcomes have no groupItemThreshold', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await invokeQueryFn({
        ...defaultParams,
        outcomes: [
          {
            id: 'o1',
            providerId: 'pm',
            marketId: 'event-123',
            title: 'Up',
            description: '',
            image: '',
            status: 'open',
            tokens: [],
            volume: 0,
            groupItemTitle: 'Up/Down',
          },
        ],
      });

      expect(result).toBeNull();
      expect(Engine.context.PredictController.getMarket).not.toHaveBeenCalled();
    });
  });
});
