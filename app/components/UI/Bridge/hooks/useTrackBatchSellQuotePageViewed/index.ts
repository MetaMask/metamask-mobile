import { useEffect, useRef } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  formatAddressToAssetId,
  formatChainIdToCaip,
  type RequiredEventContextFromClient,
} from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import {
  DEFAULT_BATCH_SELL_SLIPPAGE,
  getBatchSellSlippage,
} from '../../components/SlippageModal/utils';
import type { BridgeToken } from '../../types';
import type { BatchSellQuoteTokenDataByAssetId } from '../useBatchSellQuoteData';

type BatchSellQuote = NonNullable<
  BatchSellQuoteTokenDataByAssetId[CaipAssetType]['quote']
>;
type BatchSellQuotePageMetricProperties =
  RequiredEventContextFromClient[typeof BatchSellMetricsEventName.BatchSellQuotePageViewed];

interface BatchSellQuotePageMetricPropertiesParams {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  location: BatchSellMetricsLocation;
  selectedTokens: BridgeToken[];
  tokenData: BatchSellQuoteTokenDataByAssetId;
}

function getQuoteSourceUsdAmount(quote: BatchSellQuote) {
  const usdAmount = Number(quote.sentAmount.usd);

  return Number.isFinite(usdAmount) ? usdAmount : 0;
}

export function getBatchSellQuotePageMetricProperties({
  batchSellSlippages,
  location,
  selectedTokens,
  tokenData,
}: BatchSellQuotePageMetricPropertiesParams):
  | BatchSellQuotePageMetricProperties
  | undefined {
  const firstSourceToken = selectedTokens[0];

  if (!firstSourceToken) {
    return undefined;
  }

  const sourceTokenAddresses = selectedTokens
    .map((token) => formatAddressToAssetId(token.address, token.chainId))
    .filter((assetId): assetId is CaipAssetType => Boolean(assetId));

  if (sourceTokenAddresses.length !== selectedTokens.length) {
    return undefined;
  }

  const sourceTokenData = sourceTokenAddresses.map(
    (assetId) => tokenData[assetId],
  );
  const firstQuote = sourceTokenData.find(
    (sourceTokenQuoteData) => sourceTokenQuoteData?.quote,
  )?.quote;

  if (!firstQuote) {
    return undefined;
  }

  const destinationTokenAddress = formatAddressToAssetId(
    firstQuote.quote.destAsset.address,
    firstQuote.quote.destChainId,
  );

  if (!destinationTokenAddress) {
    return undefined;
  }

  const usdAmountSourceTokens = sourceTokenData.map((sourceTokenQuoteData) => {
    const quote = sourceTokenQuoteData?.quote;

    return quote ? getQuoteSourceUsdAmount(quote) : 0;
  });

  return {
    chain_id_destination: formatChainIdToCaip(firstQuote.quote.destChainId),
    chain_id_source: formatChainIdToCaip(firstSourceToken.chainId),
    destination_token_address: destinationTokenAddress,
    destination_token_symbol: firstQuote.quote.destAsset.symbol,
    location,
    source_token_addresses: sourceTokenAddresses,
    source_token_slippages: sourceTokenAddresses.map((assetId) =>
      Number(
        getBatchSellSlippage(batchSellSlippages, assetId) ??
          DEFAULT_BATCH_SELL_SLIPPAGE,
      ),
    ),
    source_token_symbols: selectedTokens.map((token) => token.symbol),
    usd_amount_source_tokens: usdAmountSourceTokens,
    usd_amount_source_total: usdAmountSourceTokens.reduce(
      (total, usdAmount) => total + usdAmount,
      0,
    ),
  };
}

export function useTrackBatchSellQuotePageViewed({
  batchSellSlippages,
  selectedTokens,
  tokenData,
}: {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  selectedTokens: BridgeToken[];
  tokenData: BatchSellQuoteTokenDataByAssetId;
}) {
  const hasTrackedQuotePageViewed = useRef(false);

  useEffect(() => {
    if (hasTrackedQuotePageViewed.current || selectedTokens.length === 0) {
      return;
    }

    const eventProperties = getBatchSellQuotePageMetricProperties({
      batchSellSlippages,
      location:
        Engine.context.BridgeController.getLocation() as unknown as BatchSellMetricsLocation,
      selectedTokens,
      tokenData,
    });

    if (!eventProperties) return;

    hasTrackedQuotePageViewed.current = true;

    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      BatchSellMetricsEventName.BatchSellQuotePageViewed,
      eventProperties,
    );
  }, [batchSellSlippages, selectedTokens, tokenData]);
}
