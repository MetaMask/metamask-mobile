/**
 * Identifiers for the notification categories surfaced in the
 * {@link NotificationsCategory} tab bar.
 */
export enum NotificationCategoryId {
  All = 'all',
  WalletActivity = 'wallet-activity',
  Perps = 'perps',
  SocialAI = 'social-ai',
  Marketing = 'marketing',
}

/**
 * NotificationsCategory component props.
 */
export interface NotificationsCategoryProps {
  /**
   * Called with the selected category whenever the user picks a tab.
   */
  onSelect: (category: NotificationCategoryId) => void;
  /**
   * Optional test identifier applied to the tab bar wrapper.
   */
  testID?: string;
}
