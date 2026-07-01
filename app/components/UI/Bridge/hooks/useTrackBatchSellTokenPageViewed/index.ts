import { useEffect, useRef } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  formatChainIdToCaip,
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
        chain_id_destination: formatChainIdToCaip(topChainId),
        chain_id_source: formatChainIdToCaip(topChainId),
        location,
      },
    );
  }, [location, topChainId]);
}
