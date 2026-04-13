import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { CryptoPriceHistoryPoint } from '../types';
import type { LivelinePoint } from '../../Charts/LivelineChart/LivelineChart.types';

export const predictCryptoPriceHistoryKeys = {
  all: () => ['predict', 'cryptoPriceHistory'] as const,
  detail: (symbol: string, eventStartTime: string, variant: string) =>
    [
      ...predictCryptoPriceHistoryKeys.all(),
      symbol,
      eventStartTime,
      variant,
    ] as const,
};

const toLivelinePoints = (points: CryptoPriceHistoryPoint[]): LivelinePoint[] =>
  points.map((point) => ({
    time: point.timestamp,
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
