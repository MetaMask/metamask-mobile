import {
  formatProviderLabel,
  getRequestParams,
  getSwapType,
  type QuoteFetchData,
  type QuoteResponse,
  type RequestMetadata,
  type RequestParams,
  type TradeData,
} from '@metamask/bridge-controller';
import type { BridgeToken } from '../types';

/**
 * Builds the chain and token properties Advanced Order events share with
 * their Unified SwapBridge counterparts. They are derived with the same
 * helpers the bridge controllers use, so both report CAIP chain and asset ids.
 *
 * @param tokens - The tokens of the order.
 * @param tokens.sourceToken - The token being paid.
 * @param tokens.destToken - The token being received.
 * @returns The request parameters and swap type of the order.
 */
export const getAdvancedOrderTokenProperties = ({
  sourceToken,
  destToken,
}: {
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
}): RequestParams & Pick<RequestMetadata, 'swap_type'> => ({
  ...getRequestParams(
    {
      srcChainId: sourceToken?.chainId,
      destChainId: destToken?.chainId,
      srcTokenAddress: sourceToken?.address,
      destTokenAddress: destToken?.address,
    },
    destToken?.securityData?.type ?? null,
  ),
  token_symbol_source: sourceToken?.symbol ?? '',
  token_symbol_destination: destToken?.symbol ?? null,
  swap_type: getSwapType(sourceToken?.chainId, destToken?.chainId),
});

/**
 * Builds the trade properties Advanced Order events share with their Unified
 * SwapBridge counterparts, read from the quote the order was previewed with.
 * Mirrors how the bridge controller derives them in its quotes events.
 *
 * @param activeQuote - The quote shown for the order, if any.
 * @returns The trade properties and price impact of the quote.
 */
export const getAdvancedOrderTradeProperties = (
  activeQuote?: QuoteResponse | null,
): TradeData & Pick<QuoteFetchData, 'price_impact'> => ({
  provider: activeQuote ? formatProviderLabel(activeQuote.quote) : '_',
  usd_quoted_gas: Number(activeQuote?.quote?.feeData?.network?.[0]?.usd ?? 0),
  usd_quoted_return: Number(activeQuote?.quote?.dest?.usd ?? 0),
  quoted_time_minutes: activeQuote?.estimatedProcessingTimeInSeconds
    ? activeQuote.estimatedProcessingTimeInSeconds / 60
    : 0,
  gas_included: Boolean(activeQuote?.quote?.gasIncluded),
  gas_included_7702: Boolean(activeQuote?.quote?.gasIncluded7702),
  price_impact: Number(activeQuote?.quote?.priceData?.priceImpact?.amount ?? 0),
});
