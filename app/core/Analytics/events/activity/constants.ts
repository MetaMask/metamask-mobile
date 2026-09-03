/** How the Activity screen came to be shown. */
export enum ActivityScreenInteractionType {
  Navigation = 'navigation',
  FilteredTab = 'filtered_tab',
}

/**
 * Where the user came from when entering the Activity screen. Omitted when the
 * entry point cannot be attributed. `bottom_nav_click` and `wallet_home_header`
 * are mutually exclusive per user, decided by the Money account feature flag
 * rather than user preference.
 */
export enum ActivityScreenEntryPoint {
  BottomNavClick = 'bottom_nav_click',
  WalletHomeHeader = 'wallet_home_header',
  Deeplink = 'deeplink',
}

/** `tab_name` values, snake_case and separate from the UI-facing `ActivityTypeFilter`. */
export enum ActivityScreenTabName {
  All = 'all',
  Transactions = 'transactions',
  BuySell = 'buy_sell',
  Perps = 'perps',
  Predictions = 'predictions',
  MetamaskCard = 'metamask_card',
}
