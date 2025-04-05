// @ts-check
import enContent from '../../../locales/languages/en.json';

export const NotificationSettingsViewSelectorsText = {
  ACCOUNT_ACTIVITY_SECTION:
    enContent.app_settings.notifications_opts.account_session_title,
};

export const NotificationSettingsViewSelectorsIDs = {
  NOTIFICATIONS_TOGGLE: 'notification-settings-notifications-toggle',
  PUSH_NOTIFICATIONS_TOGGLE: 'notification-settings-push-notifications-toggle',
  FEATURE_ANNOUNCEMENTS_TOGGLE:
    'notification-settings-feature-announcements-toggle',
  ACCOUNT_NOTIFICATION_TOGGLE: (
    /** @type {string} */
    address,
  ) => `notification-settings-account-notifications-${address}`,
};
