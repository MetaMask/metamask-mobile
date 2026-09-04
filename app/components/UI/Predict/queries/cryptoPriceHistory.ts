import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type {
  CryptoPriceHistoryPoint,
  CryptoTwapWindowSeconds,
} from '../types';
import type { LivelinePoint } from '../../Charts/LivelineChart/LivelineChart.types';
import { toTimestampSeconds } from '../utils/cryptoUpDown';

export const predictCryptoPriceHistoryKeys = {
  all: () => ['predict', 'cryptoPriceHistory'] as const,
  detail: (
    symbol: string,
    eventStartTime: string,
    variant: string,
    endDate?: string,
    twapWindowSeconds?: CryptoTwapWindowSeconds,
  ) =>
    [
      ...predictCryptoPriceHistoryKeys.all(),
      symbol,
      eventStartTime,
      variant,
      endDate ?? '',
      ...(twapWindowSeconds !== undefined ? [twapWindowSeconds] : []),
    ] as const,
};

const toLivelinePoints = (points: CryptoPriceHistoryPoint[]): LivelinePoint[] =>
  points.map((point) => ({
    time: toTimestampSeconds(point.timestamp),
    value: point.value,
  }));

export const predictCryptoPriceHistoryOptions = ({
  symbol,
  eventStartTime,
  variant,
  endDate,
  twapWindowSeconds,
}: {
  symbol: string;
  eventStartTime: string;
  variant: string;
  endDate?: string;
  twapWindowSeconds?: CryptoTwapWindowSeconds;
}) =>
  queryOptions({
    queryKey: predictCryptoPriceHistoryKeys.detail(
      symbol,
      eventStartTime,
      variant,
      endDate,
      twapWindowSeconds,
    ),
    queryFn: async (): Promise<LivelinePoint[]> => {
      const history =
        await Engine.context.PredictController.getCryptoPriceHistory({
          symbol,
          eventStartTime,
          variant,
          endDate,
          twapWindowSeconds,
        });
      return toLivelinePoints(history ?? []);
    },
    staleTime: Infinity,
    // The chart hook re-polls this query on an interval while a market is live,
    // which already provides natural retries. Inheriting the global `retry: 2`
    // default just triples the failed-request count (and Sentry noise) whenever
    // the Chainlink candles endpoint is unreachable, so disable retries here.
    retry: 0,
  });
