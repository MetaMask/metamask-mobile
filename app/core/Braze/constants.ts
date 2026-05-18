/**
 * Braze custom event names for banner interactions.
 */
export const BRAZE_BANNER_EVENT_DISPLAY = 'Banner Display';
export const BRAZE_BANNER_EVENT_DISMISSED = 'Banner Dismissed';

/**
 * The Braze Banner placement ID for the wallet home screen.
 * Used by BrazeBanner`.
 */
export const BRAZE_BANNER_WALLET_HOME_PLACEMENT_ID = 'mobile-wallet-home';

/**
 * All Braze banner placement IDs.
 * Used by `refreshBrazeBanners`.
 */
export const ALL_BRAZE_BANNER_PLACEMENT_IDS = [
  BRAZE_BANNER_WALLET_HOME_PLACEMENT_ID,
];
