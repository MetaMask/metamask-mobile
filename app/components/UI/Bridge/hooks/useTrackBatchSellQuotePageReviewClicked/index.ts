import { useCallback } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
} from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import type { BridgeToken } from '../../types';
import type { BatchSellQuoteTokenDataByAssetId } from '../useBatchSellQuoteData';
import { getBatchSellQuotePageMetricProperties } from '../useTrackBatchSellQuotePageViewed';

export function useTrackBatchSellQuotePageReviewClicked({
  batchSellSlippages,
  selectedTokens,
  tokenData,
}: {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  selectedTokens: BridgeToken[];
  tokenData: BatchSellQuoteTokenDataByAssetId;
}) {
  return useCallback(() => {
    const eventProperties = getBatchSellQuotePageMetricProperties({
      batchSellSlippages,
      location:
        Engine.context.BridgeController.getLocation() as unknown as BatchSellMetricsLocation,
      selectedTokens,
      tokenData,
    });

    if (!eventProperties) return;

    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      BatchSellMetricsEventName.BatchSellQuotePageReviewClicked,
      eventProperties,
    );
  }, [batchSellSlippages, selectedTokens, tokenData]);
}
