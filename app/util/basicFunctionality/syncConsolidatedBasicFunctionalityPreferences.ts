import Engine from '../../core/Engine';

/**
 * Preference keys unified under consolidated Basic Functionality on mobile.
 *
 * Product toggle mapping (mobile-available only):
 * - Estimate balance changes → setUseTransactionSimulations
 * - Security alerts → setSecurityAlertsEnabled
 * - Batch balance / token price checker → setIsMultiAccountBalancesEnabled
 * - Network details check → setUseSafeChainsListValidation
 * - Autodetect tokens → setUseTokenDetection
 * - Display NFT media (OpenSea / third-party API) → setDisplayNftMedia
 * - Autodetect NFTs → setUseNftDetection
 *
 * IPFS gateway stays a separate Settings toggle (same as extension).
 *
 * Not exposed as PreferencesController toggles on mobile:
 * phishing detection, 4byte.directory, proposed nicknames, authentication API.
 */
export function syncConsolidatedBasicFunctionalityPreferences(
  enabled: boolean,
): void {
  const { PreferencesController } = Engine.context;

  PreferencesController.setUseTransactionSimulations(enabled);
  PreferencesController.setIsMultiAccountBalancesEnabled(enabled);
  PreferencesController.setSecurityAlertsEnabled(enabled);
  PreferencesController.setUseTokenDetection(enabled);
  PreferencesController.setUseNftDetection(enabled);
  PreferencesController.setDisplayNftMedia(enabled);
  PreferencesController.setUseSafeChainsListValidation(enabled);
}
