/**
 * Selector to check if the assets trending tokens feature flag is enabled.
 *
 * The trending tokens feature has been fully released and is now always enabled.
 * This selector previously checked remote feature flags, but has been simplified
 * to always return true since the feature is GA (Generally Available).
 *
 * Note: This change was made to fix an issue where users upgrading from 7.62.2/7.63.0
 * to 7.64.0 would not see the Explore tab due to stale cached feature flags.
 * See: https://github.com/MetaMask/metamask-mobile/issues/25475
 *
 * @returns boolean - Always returns true since the feature is released.
 */
export const selectAssetsTrendingTokensEnabled = (): boolean => true;
