import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  FeatureId,
  formatAddressToAssetId,
} from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { selectBridgeControllerState } from '../../../../../core/redux/slices/bridge';
import type { BridgeToken } from '../../types';
import {
  DEFAULT_BATCH_SELL_SLIPPAGE,
  getBatchSellSlippage,
} from '../../components/SlippageModal/utils';

const DEFAULT_SLIDER_PERCENT = 100;

const getTokenKey = (token: BridgeToken) => `${token.chainId}:${token.address}`;

export function useTrackBatchSellQuotePageViewed({
  batchSellSlippages,
  hasValidSourceAmounts,
  percentsByTokenKey,
  selectedDestinationToken,
  selectedTokens,
}: {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  hasValidSourceAmounts: boolean;
  percentsByTokenKey: Record<string, number>;
  selectedDestinationToken: BridgeToken | undefined;
  selectedTokens: BridgeToken[];
}) {
  const bridgeControllerState = useSelector(selectBridgeControllerState);
  const hasQuoteRequestSourceChain = Boolean(
    bridgeControllerState?.quoteRequest?.[0]?.srcChainId,
  );
  const hasTrackedQuotePageViewed = useRef(false);

  useEffect(() => {
    if (
      hasTrackedQuotePageViewed.current ||
      !hasValidSourceAmounts ||
      !hasQuoteRequestSourceChain ||
      !selectedDestinationToken
    ) {
      return;
    }

    const selectedTokenAddressList = selectedTokens
      .map((token) => formatAddressToAssetId(token.address, token.chainId))
      .filter((assetId): assetId is CaipAssetType => Boolean(assetId));

    if (
      selectedTokenAddressList.length !== selectedTokens.length ||
      selectedTokens.some(
        (token) => percentsByTokenKey[getTokenKey(token)] === undefined,
      )
    ) {
      return;
    }

    hasTrackedQuotePageViewed.current = true;

    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      BatchSellMetricsEventName.BatchSellQuotePageViewed,
      {
        location:
          Engine.context.BridgeController.getLocation() as unknown as BatchSellMetricsLocation,
        feature_id: FeatureId.BATCH_SELL,
        selected_token_address_list: selectedTokenAddressList,
        target_token_symbol: selectedDestinationToken.symbol,
        slider_percentages: selectedTokens.map(
          (token) =>
            percentsByTokenKey[getTokenKey(token)] ?? DEFAULT_SLIDER_PERCENT,
        ),
        slippage_percentages: selectedTokenAddressList.map((assetId) =>
          Number(
            getBatchSellSlippage(batchSellSlippages, assetId) ??
              DEFAULT_BATCH_SELL_SLIPPAGE,
          ),
        ),
      },
    );
  }, [
    batchSellSlippages,
    hasQuoteRequestSourceChain,
    hasValidSourceAmounts,
    percentsByTokenKey,
    selectedDestinationToken,
    selectedTokens,
  ]);
}
