import type { UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { RebateQuoteResponse } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { selectPredictRebatesEnabled } from '../../../../selectors/featureFlagController/predictRebates';
import { useRebateQuoteQuery } from '../../shared/RebateBanner/useRebateQuoteQuery';

/**
 * Reads the current profile's Predict rebate once per buy screen. The server
 * answers `PRODUCT_NOT_SUPPORTED` until Predict cashback is switched on.
 */
export function usePredictRebateQuote(): UseQueryResult<
  RebateQuoteResponse,
  Error
> {
  const isPredictRebatesEnabled = useSelector(selectPredictRebatesEnabled);

  return useRebateQuoteQuery({
    product: 'predict',
    queryFn: () =>
      Engine.context.RewardsMoneyController.getPredictRebateQuote(),
    enabled: isPredictRebatesEnabled,
  });
}
