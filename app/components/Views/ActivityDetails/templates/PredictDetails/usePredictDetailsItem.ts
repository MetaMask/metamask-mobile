import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { mapPredictActivity } from '../../../../../util/activity-adapters';
import { usePredictActivity } from '../../../../UI/Predict/hooks/usePredictActivity';
import { POLYGON_MAINNET_CAIP_CHAIN_ID } from '../../../../UI/Predict/providers/polymarket/constants';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import type { PredictActivity } from '../../../../UI/Predict/types';
import { equalsIgnoreCase } from '../../../../../util/string';

const predictQuoteAsset = { symbol: 'USDC' };

function getPredictActivity(
  activities: PredictActivity[],
  identifier: string | undefined,
) {
  if (!identifier) {
    return undefined;
  }

  return activities.find((activity) =>
    equalsIgnoreCase(activity.id, identifier),
  );
}

export function usePredictDetailsItem(
  identifier: string | undefined,
  chainId?: CaipChainId,
) {
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const shouldResolve =
    Boolean(identifier) &&
    isPredictEnabled &&
    (chainId === undefined || chainId === POLYGON_MAINNET_CAIP_CHAIN_ID);
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
