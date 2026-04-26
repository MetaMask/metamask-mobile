import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { CryptoPriceHistoryPoint } from '../types';
import type { LivelinePoint } from '../../Charts/LivelineChart/LivelineChart.types';

export const predictCryptoPriceHistoryKeys = {
  all: () => ['predict', 'cryptoPriceHistory'] as const,
  detail: (
    symbol: string,
    eventStartTime: string,
    variant: string,
    endDate?: string,
  ) =>
    [
      ...predictCryptoPriceHistoryKeys.all(),
      symbol,
      eventStartTime,
      variant,
      endDate ?? '',
    ] as const,
};

const toLivelinePoints = (points: CryptoPriceHistoryPoint[]): LivelinePoint[] =>
  points.map((point) => ({
    time:
      point.timestamp > 9999999999
        ? Math.floor(point.timestamp / 1000)
        : point.timestamp,
    value: point.value,
  }));

export const predictCryptoPriceHistoryOptions = ({
  symbol,
  eventStartTime,
  variant,
  endDate,
}: {
  symbol: string;
  eventStartTime: string;
  variant: string;
  endDate?: string;
}) =>
  queryOptions({
    queryKey: predictCryptoPriceHistoryKeys.detail(
      symbol,
      eventStartTime,
      variant,
      endDate,
    ),
    queryFn: async (): Promise<LivelinePoint[]> => {
      const history =
        await Engine.context.PredictController.getCryptoPriceHistory({
          symbol,
          eventStartTime,
          variant,
          endDate,
        });
      return toLivelinePoints(history ?? []);
    },
    staleTime: Infinity,
  });
