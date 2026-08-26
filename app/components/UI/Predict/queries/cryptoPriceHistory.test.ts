import {
  predictCryptoPriceHistoryKeys,
  predictCryptoPriceHistoryOptions,
} from './cryptoPriceHistory';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getCryptoPriceHistory: jest.fn(),
    },
  },
}));

const defaultParams = {
  symbol: 'BTC',
  eventStartTime: '2026-04-26T18:25:00.000Z',
  variant: 'fiveminute',
  endDate: '2026-04-26T18:30:00.000Z',
};

const invokeQueryFn = async (params = defaultParams) => {
  const options = predictCryptoPriceHistoryOptions(params);

  return (options.queryFn as NonNullable<typeof options.queryFn>)({} as never);
};

describe('cryptoPriceHistory queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('predictCryptoPriceHistoryKeys', () => {
    it('returns detail key for crypto price history', () => {
      expect(
        predictCryptoPriceHistoryKeys.detail(
          'BTC',
          '2026-04-26T18:25:00.000Z',
          'fiveminute',
        ),
      ).toEqual([
        'predict',
        'cryptoPriceHistory',
        'BTC',
        '2026-04-26T18:25:00.000Z',
        'fiveminute',
        '',
      ]);
    });

    it('includes end date in the detail key when provided', () => {
      expect(
        predictCryptoPriceHistoryKeys.detail(
          'BTC',
          '2026-04-26T18:25:00.000Z',
          'fiveminute',
          '2026-04-26T18:30:00.000Z',
        ),
      ).toEqual([
        'predict',
        'cryptoPriceHistory',
        'BTC',
        '2026-04-26T18:25:00.000Z',
        'fiveminute',
        '2026-04-26T18:30:00.000Z',
      ]);
    });

    it('includes the TWAP window in the detail key when provided', () => {
      expect(
        predictCryptoPriceHistoryKeys.detail(
          'BTC',
          '2026-08-19T17:00:00.000Z',
          'fiveminute',
          '2026-08-19T17:05:00.000Z',
          60,
        ),
      ).toEqual([
        'predict',
        'cryptoPriceHistory',
        'BTC',
        '2026-08-19T17:00:00.000Z',
        'fiveminute',
        '2026-08-19T17:05:00.000Z',
        60,
      ]);
    });
  });

  describe('predictCryptoPriceHistoryOptions', () => {
    it('disables retries so interval polling does not multiply failed requests', () => {
      const options = predictCryptoPriceHistoryOptions(defaultParams);

      expect(options.retry).toBe(0);
    });
  });

  describe('queryFn', () => {
    it('converts millisecond timestamps to Liveline seconds', async () => {
      (
        Engine.context.PredictController.getCryptoPriceHistory as jest.Mock
      ).mockResolvedValueOnce([
        { timestamp: 1777227900000, value: 78190.99 },
        { timestamp: 1777227960000, value: 78176.2 },
      ]);

      await expect(invokeQueryFn()).resolves.toEqual([
        { time: 1777227900, value: 78190.99 },
        { time: 1777227960, value: 78176.2 },
      ]);
      expect(
        Engine.context.PredictController.getCryptoPriceHistory,
      ).toHaveBeenCalledWith(defaultParams);
    });

    it('preserves second timestamps', async () => {
      (
        Engine.context.PredictController.getCryptoPriceHistory as jest.Mock
      ).mockResolvedValueOnce([{ timestamp: 1777227900, value: 78190.99 }]);

      await expect(invokeQueryFn()).resolves.toEqual([
        { time: 1777227900, value: 78190.99 },
      ]);
    });

    it('forwards the TWAP window to the controller', async () => {
      const params = {
        ...defaultParams,
        twapWindowSeconds: 60 as const,
      };
      (
        Engine.context.PredictController.getCryptoPriceHistory as jest.Mock
      ).mockResolvedValueOnce([]);

      await invokeQueryFn(params);

      expect(
        Engine.context.PredictController.getCryptoPriceHistory,
      ).toHaveBeenCalledWith(params);
    });
  });
});
