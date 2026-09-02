/**
 * Preference keys unified under consolidated Basic Functionality on mobile.
 *
 * Mobile only exposes these PreferencesController toggles in Settings.
 * Extension also consolidates phishing, 4byte, proposed nicknames, ENS
 * address-bar resolution, and currency-rate check — those keys do not exist
 * on mobile's PreferencesController.
 */
export const BFT_CHILD_PREFERENCES = [
  'useTransactionSimulations',
  'securityAlertsEnabled',
  'isMultiAccountBalancesEnabled',
  'useSafeChainsListValidation',
  'useTokenDetection',
  'displayNftMedia',
  'useNftDetection',
] as const;

export type BftChildPreference = (typeof BFT_CHILD_PREFERENCES)[number];

/**
 * Same threshold as extension migration: BF OFF users with more than this many
 * child prefs enabled land with BF ON.
 *
 * Mobile currently has only {@link BFT_CHILD_PREFERENCES.length} children, so
 * this branch cannot fire until additional prefs are added to the mobile set.
 */
export const BFT_ENABLED_CHILDREN_LANDING_THRESHOLD = 9;
