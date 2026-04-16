export const NotificationPreferencesViewSelectorsIDs = {
  CONTAINER: 'notification-preferences-view-container',
  BACK_BUTTON: 'notification-preferences-view-back-button',
  GLOBAL_TOGGLE: 'notification-preferences-view-global-toggle',
  THRESHOLD_OPTION: (amount: number) =>
    `notification-preferences-view-threshold-${amount}`,
  TRADERS_SECTION: 'notification-preferences-view-traders-section',
  TRADER_TOGGLE: (traderId: string) =>
    `notification-preferences-view-trader-toggle-${traderId}`,
  TRADER_ROW: (traderId: string) =>
    `notification-preferences-view-trader-row-${traderId}`,
};
