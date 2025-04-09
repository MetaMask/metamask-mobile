import {
  BridgeFeatureFlags,
  BridgeFeatureFlagsKey,
  BridgeToken,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';

const DEFAULT_REFRESH_RATE = 5 * 1000; // 5 seconds

/**
 * Gets the refresh rate for quotes based on feature flags and source token
 * @param bridgeFeatureFlags - The bridge feature flags
 * @param sourceToken - The source token
 * @returns The refresh rate in milliseconds
 */
export const getQuoteRefreshRate = (
  bridgeFeatureFlags: BridgeFeatureFlags | undefined,
  sourceToken?: BridgeToken,
) => {
  const mobileConfig =
    bridgeFeatureFlags?.[BridgeFeatureFlagsKey.MOBILE_CONFIG];
  if (!sourceToken?.chainId || !mobileConfig) return DEFAULT_REFRESH_RATE;

  const chainConfig =
    mobileConfig.chains[formatChainIdToCaip(sourceToken.chainId.toString())];
  return (
    chainConfig?.refreshRate ?? mobileConfig.refreshRate ?? DEFAULT_REFRESH_RATE
  );
};

/**
 * Determines if a quote should be refreshed based on balance and refresh count conditions.
 * @param insufficientBal - Whether user has insufficient balance for the transaction
 * @param quotesRefreshCount - How many times quotes have been refreshed
 * @param maxRefreshCount - Maximum allowed refresh attempts
 * @returns boolean - Whether the quote should be refreshed
 */
export const shouldRefreshQuote = (
  insufficientBal: boolean,
  quotesRefreshCount: number,
  maxRefreshCount: number,
): boolean => {
  if (insufficientBal) {
    return false; // Never refresh if insufficient balance
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
