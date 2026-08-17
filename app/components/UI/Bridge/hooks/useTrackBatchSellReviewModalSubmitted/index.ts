import { useCallback } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  formatAddressToAssetId,
} from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import type { BridgeToken } from '../../types';
import { getBatchSellQuotePageMetricProperties } from '../useTrackBatchSellQuotePageViewed';

const getUsdAmount = (usdAmount: string | null | undefined) => {
  const parsedUsdAmount = Number(usdAmount);

  return Number.isFinite(parsedUsdAmount) ? parsedUsdAmount : 0;
};

const getQuotedReturnUsdAmount = (
  selectedTokens: BridgeToken[],
  quotesByAssetId: Parameters<
    typeof getBatchSellQuotePageMetricProperties
  >[0]['quotesByAssetId'],
) =>
  selectedTokens.reduce((totalUsdAmount, token) => {
    const assetId = formatAddressToAssetId(token.address, token.chainId);
    const quote = assetId
      ? quotesByAssetId[assetId]?.recommendedQuote
      : undefined;

    return totalUsdAmount + getUsdAmount(quote?.quote.dest?.usd);
  }, 0);

export const useTrackBatchSellReviewModalSubmitted = ({
  batchSellSlippages,
  selectedTokens,
  quotesByAssetId,
  usdQuotedGas,
}: {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  selectedTokens: BridgeToken[];
  quotesByAssetId: Parameters<
    typeof getBatchSellQuotePageMetricProperties
  >[0]['quotesByAssetId'];
  usdQuotedGas: string | null | undefined;
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
      BatchSellMetricsEventName.BatchSellReviewModalSubmitted,
      {
        ...eventProperties,
        usd_quoted_gas: getUsdAmount(usdQuotedGas),
        usd_quoted_return: getQuotedReturnUsdAmount(
          selectedTokens,
          quotesByAssetId,
        ),
      },
    );
  }, [batchSellSlippages, selectedTokens, quotesByAssetId, usdQuotedGas]);
