import { MINIMUM_BET } from '../constants/transactions';
import { Side, type OrderPreview } from '../types';
import { calculateMaxBetAmount } from '../utils/orders';
import { usePredictOrderPreview } from './usePredictOrderPreview';

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
  const needsFeeReference = enabled && availableBalance > 0 && !preview;
  const { preview: feeReferencePreview, isCalculating } =
    usePredictOrderPreview({
      marketId,
      outcomeId,
      outcomeTokenId,
      side: Side.BUY,
      size: needsFeeReference ? MINIMUM_BET : 0,
      autoRefreshTimeout: 1000,
    });
  const referencePreview = preview ?? feeReferencePreview;

  const maxBetAmount = enabled
    ? calculateMaxBetAmount(availableBalance, referencePreview)
    : availableBalance;

  return {
    maxBetAmount,
    isLoading: needsFeeReference && !referencePreview && isCalculating,
  };
}
