import { useCallback } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
} from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import type { BridgeToken } from '../../types';
import { getBatchSellQuotePageMetricProperties } from '../useTrackBatchSellQuotePageViewed';

export const useTrackBatchSellQuotePageReviewClicked = ({
  batchSellSlippages,
  selectedTokens,
  quotesByAssetId,
}: {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  selectedTokens: BridgeToken[];
  quotesByAssetId: Parameters<
    typeof getBatchSellQuotePageMetricProperties
  >[0]['quotesByAssetId'];
}) =>
  useCallback(() => {
    const eventProperties = getBatchSellQuotePageMetricProperties({
      batchSellSlippages,
      location:
        Engine.context.BridgeController.getLocation() as unknown as BatchSellMetricsLocation,
      selectedTokens,
      quotesByAssetId,
    });

    if (!eventProperties) return;

    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      BatchSellMetricsEventName.BatchSellQuotePageReviewClicked,
      eventProperties,
    );
  }, [batchSellSlippages, selectedTokens, quotesByAssetId]);
