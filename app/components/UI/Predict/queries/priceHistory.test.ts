import {
  predictPriceHistoryKeys,
  predictPriceHistoryOptions,
} from './priceHistory';
import { PredictPriceHistoryInterval } from '../types';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPriceHistory: jest.fn(),
    },
  },
}));

describe('priceHistory queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('predictPriceHistoryKeys', () => {
    it('returns base key for all price history', () => {
      const keys = predictPriceHistoryKeys.all();

      expect(keys).toEqual(['predict', 'priceHistory']);
    });

    it('returns detail key with market id and interval', () => {
      const keys = predictPriceHistoryKeys.detail(
        'market-123',
        PredictPriceHistoryInterval.ONE_DAY,
      );

      expect(keys).toEqual([
        'predict',
        'priceHistory',
        'market-123',
        PredictPriceHistoryInterval.ONE_DAY,
        undefined,
        undefined,
        undefined,
      ]);
    });

    it('returns detail key with all parameters', () => {
      const keys = predictPriceHistoryKeys.detail(
        'market-456',
        PredictPriceHistoryInterval.ONE_WEEK,
        100,
        1609459200,
        1609545600,
      );

      expect(keys).toEqual([
        'predict',
        'priceHistory',
        'market-456',
        PredictPriceHistoryInterval.ONE_WEEK,
        100,
        1609459200,
        1609545600,
      ]);
    });

    it('returns detail key with fidelity only', () => {
      const keys = predictPriceHistoryKeys.detail(
        'market-789',
        PredictPriceHistoryInterval.ONE_HOUR,
        50,
      );

      expect(keys).toEqual([
        'predict',
        'priceHistory',
        'market-789',
        PredictPriceHistoryInterval.ONE_HOUR,
        50,
        undefined,
        undefined,
      ]);
    });
  });

  describe('predictPriceHistoryOptions', () => {
    it('returns query options with correct query key', () => {
      const options = predictPriceHistoryOptions({
        marketId: 'market-123',
        interval: PredictPriceHistoryInterval.ONE_DAY,
      });

      expect(options.queryKey).toEqual([
        'predict',
        'priceHistory',
        'market-123',
        PredictPriceHistoryInterval.ONE_DAY,
        undefined,
        undefined,
        undefined,
      ]);
    });

    it('uses default interval when not provided', () => {
      const options = predictPriceHistoryOptions({
        marketId: 'market-123',
      });

      expect(options.queryKey).toEqual([
        'predict',
        'priceHistory',
        'market-123',
        PredictPriceHistoryInterval.ONE_DAY,
        undefined,
        undefined,
        undefined,
      ]);
    });

    it('includes all parameters in query key', () => {
      const options = predictPriceHistoryOptions({
        marketId: 'market-456',
        interval: PredictPriceHistoryInterval.ONE_WEEK,
        fidelity: 100,
        startTs: 1609459200,
        endTs: 1609545600,
      });

      expect(options.queryKey).toEqual([
        'predict',
        'priceHistory',
        'market-456',
        PredictPriceHistoryInterval.ONE_WEEK,
        100,
        1609459200,
        1609545600,
      ]);
    });

    it('has correct stale time', () => {
      const options = predictPriceHistoryOptions({
        marketId: 'market-123',
      });

      expect(options.staleTime).toBe(5_000);
    });

    describe('queryFn', () => {
      it('calls getPriceHistory with correct parameters', async () => {
        const mockPriceHistory = [
          { timestamp: 1609459200, price: 0.5 },
          { timestamp: 1609545600, price: 0.55 },
        ];
        (
          Engine.context.PredictController.getPriceHistory as jest.Mock
        ).mockResolvedValue(mockPriceHistory);

        const options = predictPriceHistoryOptions({
          marketId: 'market-123',
          interval: PredictPriceHistoryInterval.ONE_DAY,
          fidelity: 100,
          startTs: 1609459200,
          endTs: 1609545600,
        });

        expect(options.queryFn).toBeDefined();
        const result = await (
          options.queryFn as NonNullable<typeof options.queryFn>
        )({} as never);

        expect(
          Engine.context.PredictController.getPriceHistory,
        ).toHaveBeenCalledWith({
          marketId: 'market-123',
          fidelity: 100,
          interval: PredictPriceHistoryInterval.ONE_DAY,
          startTs: 1609459200,
          endTs: 1609545600,
        });
        expect(result).toEqual(mockPriceHistory);
      });

      it('returns empty array when getPriceHistory returns null', async () => {
        (
          Engine.context.PredictController.getPriceHistory as jest.Mock
        ).mockResolvedValue(null);

        const options = predictPriceHistoryOptions({
          marketId: 'market-123',
        });

        expect(options.queryFn).toBeDefined();
        const result = await (
          options.queryFn as NonNullable<typeof options.queryFn>
        )({} as never);

        expect(result).toEqual([]);
      });

      it('returns empty array when getPriceHistory returns undefined', async () => {
        (
          Engine.context.PredictController.getPriceHistory as jest.Mock
        ).mockResolvedValue(undefined);

        const options = predictPriceHistoryOptions({
          marketId: 'market-123',
        });

        expect(options.queryFn).toBeDefined();
        const result = await (
          options.queryFn as NonNullable<typeof options.queryFn>
        )({} as never);

        expect(result).toEqual([]);
      });

      it('calls getPriceHistory with default interval', async () => {
        (
          Engine.context.PredictController.getPriceHistory as jest.Mock
        ).mockResolvedValue([]);

        const options = predictPriceHistoryOptions({
          marketId: 'market-789',
        });

        expect(options.queryFn).toBeDefined();
        await (options.queryFn as NonNullable<typeof options.queryFn>)(
          {} as never,
        );

        expect(
          Engine.context.PredictController.getPriceHistory,
        ).toHaveBeenCalledWith({
          marketId: 'market-789',
          fidelity: undefined,
          interval: PredictPriceHistoryInterval.ONE_DAY,
          startTs: undefined,
          endTs: undefined,
        });
      });
    });
  });
});
