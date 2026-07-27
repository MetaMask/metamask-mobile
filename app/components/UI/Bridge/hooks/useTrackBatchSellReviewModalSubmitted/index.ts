import { useCallback } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  formatAddressToAssetId,
} from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import type { BridgeToken } from '../../types';
import type { BatchSellQuoteTokenDataByAssetId } from '../useBatchSellQuoteData';
import { getBatchSellQuotePageMetricProperties } from '../useTrackBatchSellQuotePageViewed';

function getUsdAmount(usdAmount: string | null | undefined) {
  const parsedUsdAmount = Number(usdAmount);

  return Number.isFinite(parsedUsdAmount) ? parsedUsdAmount : 0;
}

function getQuotedReturnUsdAmount(
  selectedTokens: BridgeToken[],
  tokenData: BatchSellQuoteTokenDataByAssetId,
) {
  return selectedTokens.reduce((totalUsdAmount, token) => {
    const assetId = formatAddressToAssetId(token.address, token.chainId);
    const quote = assetId ? tokenData[assetId]?.quote : undefined;

    return totalUsdAmount + getUsdAmount(quote?.toTokenAmount.usd);
  }, 0);
}

export function useTrackBatchSellReviewModalSubmitted({
  batchSellSlippages,
  selectedTokens,
  tokenData,
  usdQuotedGas,
}: {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  selectedTokens: BridgeToken[];
  tokenData: BatchSellQuoteTokenDataByAssetId;
  usdQuotedGas: string | null | undefined;
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
      BatchSellMetricsEventName.BatchSellReviewModalSubmitted,
      {
        ...eventProperties,
        usd_quoted_gas: getUsdAmount(usdQuotedGas),
        usd_quoted_return: getQuotedReturnUsdAmount(selectedTokens, tokenData),
      },
    );
  }, [batchSellSlippages, selectedTokens, tokenData, usdQuotedGas]);
}
