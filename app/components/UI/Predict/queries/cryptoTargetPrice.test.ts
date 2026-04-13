import {
  predictCryptoTargetPriceKeys,
  predictCryptoTargetPriceOptions,
  clearTargetPriceCache,
  getTargetPriceCacheSize,
  type CryptoTargetPriceQueryParams,
} from './cryptoTargetPrice';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getCryptoTargetPrice: jest.fn(),
    },
  },
}));

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
    it('fetches and returns target price', async () => {
      (
        Engine.context.PredictController.getCryptoTargetPrice as jest.Mock
      ).mockResolvedValueOnce(42000);

      const result = await invokeQueryFn();

      expect(result).toBe(42000);
      expect(
        Engine.context.PredictController.getCryptoTargetPrice,
      ).toHaveBeenCalledWith({
        eventId: 'event-123',
        symbol: 'BTC',
        eventStartTime: '2025-01-01T00:00:00Z',
        variant: 'up',
        endDate: '2025-01-02',
      });
    });

    it('returns cached result on second call', async () => {
      (
        Engine.context.PredictController.getCryptoTargetPrice as jest.Mock
      ).mockResolvedValue(42000);

      const first = await invokeQueryFn();
      const second = await invokeQueryFn();

      expect(first).toBe(42000);
      expect(second).toBe(42000);
      expect(
        Engine.context.PredictController.getCryptoTargetPrice,
      ).toHaveBeenCalledTimes(1);
    });

    it('returns fallback value when controller returns a fallback value', async () => {
      (
        Engine.context.PredictController.getCryptoTargetPrice as jest.Mock
      ).mockResolvedValueOnce(41500);

      const result = await invokeQueryFn();

      expect(result).toBe(41500);
    });

    it('returns null when both fail', async () => {
      (
        Engine.context.PredictController.getCryptoTargetPrice as jest.Mock
      ).mockResolvedValueOnce(null);

      const result = await invokeQueryFn();

      expect(result).toBeNull();
    });

    it('manages cache size correctly across different events', async () => {
      (Engine.context.PredictController.getCryptoTargetPrice as jest.Mock)
        .mockResolvedValueOnce(42000)
        .mockResolvedValueOnce(3000);

      await invokeQueryFn({ ...defaultParams, eventId: 'event-btc' });
      await invokeQueryFn({ ...defaultParams, eventId: 'event-eth' });

      expect(getTargetPriceCacheSize()).toBe(2);
    });

    it('clears module-level cache via clearTargetPriceCache', async () => {
      (
        Engine.context.PredictController.getCryptoTargetPrice as jest.Mock
      ).mockResolvedValueOnce(42000);

      await invokeQueryFn();
      expect(getTargetPriceCacheSize()).toBe(1);

      clearTargetPriceCache();
      expect(getTargetPriceCacheSize()).toBe(0);
    });
  });
});
