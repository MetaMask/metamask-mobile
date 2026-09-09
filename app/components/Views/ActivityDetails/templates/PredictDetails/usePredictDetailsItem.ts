import { useMemo } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { mapPredictActivity } from '../../../../../util/activity-adapters';
import { usePredictActivity } from '../../../../UI/Predict/hooks/usePredictActivity';
import type { PredictActivity } from '../../../../UI/Predict/types';

const predictActivityChainId = 'eip155:137' as CaipChainId;
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
        chainId: predictActivityChainId,
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
