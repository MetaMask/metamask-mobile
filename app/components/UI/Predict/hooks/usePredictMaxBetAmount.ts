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
  const hasFallback = Boolean(preview) && !query.isError;
  const maxBetAmount =
    query.data === null
      ? 0
      : (query.data?.maxAmountSpent ??
        (hasFallback ? fallbackMaxBetAmount : 0));

  return {
    maxBetAmount: enabled ? maxBetAmount : availableBalance,
    // Keep the value hidden if no authoritative result is available. A normal
    // preview is useful while loading, but must not become the displayed max
    // after a failed liquidity-aware calculation.
    isLoading: shouldCalculate && query.data === undefined && !hasFallback,
  };
}
