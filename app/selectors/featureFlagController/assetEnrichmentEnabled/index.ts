import { selectIsStellarAccountsEnabled } from '../stellarAccountsEnabled';

/**
 * Selector to check if snap account-asset enrichment is enabled for AssetsController.
 * Currently aligned with the Stellar accounts feature flag.
 */
export const selectAssetEnrichmentEnabled = selectIsStellarAccountsEnabled;
