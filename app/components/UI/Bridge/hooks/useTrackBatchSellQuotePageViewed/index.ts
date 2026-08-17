import { useEffect, useRef } from 'react';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  formatAddressToAssetId,
  formatChainIdToCaip,
  type RequiredEventContextFromClient,
} from '@metamask/bridge-controller';
import { parseCaipAssetType, type CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import {
  DEFAULT_BATCH_SELL_SLIPPAGE,
  getBatchSellSlippage,
} from '../../components/SlippageModal/utils';
import type { BridgeToken } from '../../types';
import { useBridgeQuotes } from '../useBridgeQuotes';

const getQuoteSourceUsdAmount = (
  quote: NonNullable<ReturnType<typeof useBridgeQuotes>['recommendedQuote']>,
) => {
  const usdAmount = Number(quote.quote.src?.usd);

  return Number.isFinite(usdAmount) ? usdAmount : 0;
};

export const getBatchSellQuotePageMetricProperties = ({
  batchSellSlippages,
  location,
  selectedTokens,
  quotesByAssetId,
}: {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  location: BatchSellMetricsLocation;
  selectedTokens: BridgeToken[];
  quotesByAssetId: Partial<
    Record<
      CaipAssetType,
      Pick<ReturnType<typeof useBridgeQuotes>, 'recommendedQuote'>
    >
  >;
}):
  | RequiredEventContextFromClient[typeof BatchSellMetricsEventName.BatchSellQuotePageViewed]
  | undefined => {
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

  const sourceTokenQuotes = sourceTokenAddresses.map(
    (assetId) => quotesByAssetId[assetId]?.recommendedQuote,
  );
  const firstQuote = sourceTokenQuotes.find(Boolean);

  if (!firstQuote) {
    return undefined;
  }

  const destChainId = parseCaipAssetType(
    firstQuote.quote.dest.asset.assetId,
  ).chainId;
  const destinationTokenAddress = firstQuote.quote.dest.asset.assetId;

  if (!destinationTokenAddress) {
    return undefined;
  }

  const usdAmountSourceTokens = sourceTokenQuotes.map((quote) =>
    quote ? getQuoteSourceUsdAmount(quote) : 0,
  );

  return {
    chain_id_destination: destChainId,
    chain_id_source: formatChainIdToCaip(firstSourceToken.chainId),
    destination_token_address: destinationTokenAddress,
    destination_token_symbol: firstQuote.quote.dest.asset.symbol,
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
};

export const useTrackBatchSellQuotePageViewed = ({
  batchSellSlippages,
  selectedTokens,
  quotesByAssetId,
}: {
  batchSellSlippages: Partial<Record<CaipAssetType, string | undefined>>;
  selectedTokens: BridgeToken[];
  quotesByAssetId: Parameters<
    typeof getBatchSellQuotePageMetricProperties
  >[0]['quotesByAssetId'];
}) => {
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
      quotesByAssetId,
    });

    if (!eventProperties) return;

    hasTrackedQuotePageViewed.current = true;

    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      BatchSellMetricsEventName.BatchSellQuotePageViewed,
      eventProperties,
    );
  }, [batchSellSlippages, selectedTokens, quotesByAssetId]);
};
