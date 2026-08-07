/**
 * How the Activity screen came to be shown.
 *
 * `Navigation` is the user entering the screen; `FilteredTab` is the user
 * switching the Activity type filter while already on the screen.
 */
export enum ActivityScreenInteractionType {
  Navigation = 'navigation',
  FilteredTab = 'filtered_tab',
}

/**
 * Where the user came from when entering the Activity screen.
 *
 * `BottomNavClick` is shared with extension so the two platforms stay
 * comparable. Values are only sent when the entry point is attributable — an
 * unattributed entry (e.g. a post-confirmation redirect) omits the property
 * rather than guessing. `asset_details`, `notification` and `post_transaction`
 * are reserved in segment-schema and get added here as they are wired up.
 *
 * IMPORTANT for analysis: `BottomNavClick` and `WalletHomeHeader` are mutually
 * exclusive per user, decided by the Money account feature flag and geo
 * eligibility (`isMoneyAccountVisible`), not by user preference. When Money is
 * visible the Money tab takes the Activity tab slot, so Activity is reached from
 * the wallet home header button and reports `wallet_home_header`. When Money is
 * not visible the Activity tab exists and reports `bottom_nav_click`, and the
 * header button is not rendered.
 *
 * So a shift in the `bottom_nav_click` / `wallet_home_header` mix tracks Money
 * rollout cohorts, not a change in how users navigate. Segment on the Money flag
 * before comparing these two values across periods.
 */
export enum ActivityScreenEntryPoint {
  BottomNavClick = 'bottom_nav_click',
  /**
   * Wallet home header button, rendered only when the Money tab is visible.
   * Named for the control rather than just the screen, since other wallet-home
   * entry points could be added later.
   */
  WalletHomeHeader = 'wallet_home_header',
  Deeplink = 'deeplink',
}

/**
 * Analytics value for the Activity type filter that is active after a
 * `FilteredTab` interaction. Kept separate from the UI-facing
 * `ActivityTypeFilter` enum so the emitted values stay snake_case per the
 * Segment property convention, and so renaming a UI bucket cannot silently
 * change the data contract.
 */
export enum ActivityScreenTabName {
  All = 'all',
  Transactions = 'transactions',
  BuySell = 'buy_sell',
  Perps = 'perps',
  Predictions = 'predictions',
  MetamaskCard = 'metamask_card',
}
