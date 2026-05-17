import { useMemo } from 'react';
import { getPriceImpactViewData } from '../../utils/getPriceImpactViewData';
import { useSelector } from 'react-redux';
import AppConstants from '../../../../../core/AppConstants';
import { selectBridgeFeatureFlags } from '../../../../../core/redux/slices/bridge';

export const usePriceImpactViewData = (priceImpact?: string) => {
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);

  const priceImpactViewData = useMemo(
    () =>
      getPriceImpactViewData({
        priceImpactValue: priceImpact,
        threshold: {
          error:
            bridgeFeatureFlags?.priceImpactThreshold?.error ??
            AppConstants.BRIDGE.PRICE_IMPACT_ERROR_THRESHOLD,
          warning:
            bridgeFeatureFlags?.priceImpactThreshold?.warning ??
            AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD,
        },
      }),
    [priceImpact, bridgeFeatureFlags],
  );

  return priceImpactViewData;
};
