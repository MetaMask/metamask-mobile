import {
  formatChainIdToCaip,
  FeatureFlagsPlatformConfig,
  Quote,
  isNativeAddress,
} from '@metamask/bridge-controller';
import type { BridgeToken } from '../types';

const DEFAULT_REFRESH_RATE = 30 * 1000; // 30 seconds

/**
 * Gets the refresh rate for quotes based on feature flags and source token
 * @param bridgeFeatureFlags - The bridge feature flags
 * @param sourceToken - The source token
 * @returns The refresh rate in milliseconds
 */
export const getQuoteRefreshRate = (
  bridgeFeatureFlags: FeatureFlagsPlatformConfig | undefined,
  sourceToken?: BridgeToken,
) => {
  if (!sourceToken?.chainId || !bridgeFeatureFlags) return DEFAULT_REFRESH_RATE;

  const chainConfig =
    bridgeFeatureFlags.chains[
      formatChainIdToCaip(sourceToken.chainId.toString())
    ];
  return (
    chainConfig?.refreshRate ??
    bridgeFeatureFlags.refreshRate ??
    DEFAULT_REFRESH_RATE
  );
};

/**
 * Determines if a quote should be refreshed based on balance and refresh count conditions.
 * @param insufficientBal - Whether user has insufficient balance for the transaction
 * @param quotesRefreshCount - How many times quotes have been refreshed
 * @param maxRefreshCount - Maximum allowed refresh attempts
 * @param isSubmittingTx - Whether the transaction is currently being submitted
 * @returns boolean - Whether the quote should be refreshed
 */
export const shouldRefreshQuote = (
  insufficientBal: boolean,
  quotesRefreshCount: number,
  maxRefreshCount: number,
  isSubmittingTx: boolean = false,
): boolean => {
  if (insufficientBal || isSubmittingTx) {
    return false; // Never refresh if insufficient balance or submitting transaction
  }
  return quotesRefreshCount < maxRefreshCount; // Refresh if under max attempts
};

/**
 * Determines if a quote has expired based on time and refresh state.
 * @param isQuoteGoingToRefresh - Whether the quote is eligible for refresh
 * @param refreshRate - The rate at which quotes should refresh in milliseconds
 * @param quotesLastFetchedMs - Timestamp of when quotes were last fetched
 * @returns boolean - Whether the quote has expired
 */
export const isQuoteExpired = (
  isQuoteGoingToRefresh: boolean,
  refreshRate: number,
  quotesLastFetchedMs: number | null,
): boolean => {
  const isGreaterThanRefreshRate =
    quotesLastFetchedMs && Date.now() - quotesLastFetchedMs > refreshRate;
  return Boolean(
    !isQuoteGoingToRefresh && quotesLastFetchedMs && isGreaterThanRefreshRate,
  );
};

/**
 * Determines the actual source amount of a bridge/swap transaction, taking in account the case
 * where the sent amount if the native token and the fee is paid with that same native token.
 * @param quote - The bridge of the bridge/swap transaction
 * @returns string - The base unit source amount. Ex: 87500000000000000
 */
export function getSourceAmountBaseUnitFromBridgeSwapQuote(
  quote: Quote,
): string {
  let sourceAmountBaseUnit = quote.srcTokenAmount;
  // In the specific gas of a bridge/swap involving the gas token as source token,
  // the `quote.srcTokenAmount` value is incorrect because the MetMask fee is taken out from it.
  // This consumer-side solution re-incorporates the MetaMask fee when it was paid directly from source token.
  // Ex: Swapping 10 MON for USD would show as "9.9125 MON" in history because of the fee of 0.0875 MON.
  // A cleaner solution would have to have 'quote.srcTokenAmount' containing the correct amount
  // (but risks breaking existing components relying on that field), or create a new quote.originalSrcTokenAmount field.
  if (
    isNativeAddress(quote.srcAsset.address) &&
    isNativeAddress(quote.feeData.metabridge.asset.address) &&
    quote.feeData.metabridge.asset.chainId === quote.srcAsset.chainId
  ) {
    const sponsoredFeeAmount = quote.feeData.metabridge.amount || '0';
    sourceAmountBaseUnit = (
      BigInt(sourceAmountBaseUnit) + BigInt(sponsoredFeeAmount)
    ).toString();
  }
  return sourceAmountBaseUnit;
}
