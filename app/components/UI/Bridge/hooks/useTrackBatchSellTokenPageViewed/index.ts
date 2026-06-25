import { useEffect, useRef } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  FeatureId,
} from '@metamask/bridge-controller';

import Engine from '../../../../../core/Engine';
import { BatchSellEligibleChain } from '../../Views/BatchSellTokenSelect/BatchSellTokenSelect.utils';

export function useTrackBatchSellTokenPageViewed({
  location,
  sortedEligibleChains,
}: {
  location: BatchSellMetricsLocation;
  sortedEligibleChains: BatchSellEligibleChain[];
}) {
  const hasTrackedPageView = useRef(false);
  const topChainId = sortedEligibleChains[0]?.chainId;

  useEffect(() => {
    if (hasTrackedPageView.current || !topChainId) {
      return;
    }

    hasTrackedPageView.current = true;

    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      BatchSellMetricsEventName.BatchSellTokenPageViewed,
      {
        location,
        feature_id: FeatureId.BATCH_SELL,
        // @ts-expect-error chain_id is merged from client props in trackUnifiedSwapBridgeEvent
        chain_id: topChainId,
      },
    );
  }, [location, topChainId]);
}
