import { useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import type { OrderPreview } from '../types';
import { calculateMaxBetAmount } from '../utils/orders';

interface UsePredictMaxBetAmountParams {
  availableBalance: number;
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  preview?: OrderPreview | null;
  enabled?: boolean;
}

export function usePredictMaxBetAmount({
  availableBalance,
  marketId,
  outcomeId,
  outcomeTokenId,
  preview,
  enabled = true,
}: UsePredictMaxBetAmountParams) {
  const shouldCalculate = enabled && availableBalance > 0;
  const query = useQuery({
    ...predictQueries.maxBuyOrderPreview.options({
      marketId,
      outcomeId,
      outcomeTokenId,
      availableBalance,
    }),
    enabled: shouldCalculate,
    refetchInterval: shouldCalculate ? 1000 : false,
  });
  const fallbackMaxBetAmount = calculateMaxBetAmount(availableBalance, preview);
  const maxBetAmount =
    query.data === null
      ? 0
      : (query.data?.maxAmountSpent ?? fallbackMaxBetAmount);

  return {
    maxBetAmount: enabled ? maxBetAmount : availableBalance,
    isLoading: shouldCalculate && query.data === undefined && query.isFetching,
  };
}
