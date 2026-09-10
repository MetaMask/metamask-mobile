import { useMemo } from 'react';
import { mapPredictActivity } from '../../../../../util/activity-adapters';
import { usePredictActivity } from '../../../../UI/Predict/hooks/usePredictActivity';
import { POLYGON_MAINNET_CAIP_CHAIN_ID } from '../../../../UI/Predict/providers/polymarket/constants';
import type { PredictActivity } from '../../../../UI/Predict/types';

const predictQuoteAsset = { symbol: 'USDC' };

function getPredictActivity(
  activities: PredictActivity[],
  identifier: string | undefined,
) {
  const normalized = identifier?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return activities.find(
    (activity) => activity.id.toLowerCase() === normalized,
  );
}

export function usePredictDetailsItem(identifier: string | undefined) {
  const shouldResolve = Boolean(identifier);
  const { activity, isLoading, isFetching } = usePredictActivity({
    enabled: shouldResolve,
  });

  const matched = useMemo(
    () => getPredictActivity(activity, shouldResolve ? identifier : undefined),
    [activity, identifier, shouldResolve],
  );

  const item = useMemo(() => {
    if (!matched) {
      return undefined;
    }
    return (
      mapPredictActivity({
        activity: matched,
        chainId: POLYGON_MAINNET_CAIP_CHAIN_ID,
        quoteAsset: predictQuoteAsset,
      }) ?? undefined
    );
  }, [matched]);

  return {
    item,
    activity: matched,
    isLoading: shouldResolve && (isLoading || isFetching) && !item,
  };
}
