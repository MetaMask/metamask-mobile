import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { NotificationPreferenceSection } from './hooks/useNotificationStoragePreferences';

/**
 * Canonical `section` query values for notification-settings deeplinks.
 *
 * Example: `https://link.metamask.io/notifications-settings?section=price-alerts`
 */
export const NotificationSettingsSectionSlug = {
  WalletActivity: 'wallet-activity',
  Perps: 'perps',
  SocialAi: 'social-ai',
  AgenticCli: 'agentic-cli',
  Marketing: 'marketing',
  PriceAlerts: 'price-alerts',
} as const;

export type NotificationSettingsSectionSlug =
  (typeof NotificationSettingsSectionSlug)[keyof typeof NotificationSettingsSectionSlug];

export interface NotificationSettingsSectionConfig {
  slug: NotificationSettingsSectionSlug;
  type: NotificationPreferenceSection;
  titleKey: string;
  descriptionKey: string;
  iconName: IconName;
  /**
   * Wallet activity has no channel toggles to summarize on the main list.
   */
  showStatus: boolean;
  /**
   * Hide the row unless the social leaderboard feature flag is on.
   * Deeplinks to this section still open it when the flag is off.
   */
  requiresSocialLeaderboard?: boolean;
}

export const NOTIFICATION_SETTINGS_SECTIONS: NotificationSettingsSectionConfig[] =
  [
    {
      slug: NotificationSettingsSectionSlug.WalletActivity,
      type: 'walletActivity',
      titleKey: 'app_settings.notifications_opts.wallet_activity_title',
      descriptionKey: 'app_settings.notifications_opts.wallet_activity_desc',
      iconName: IconName.Clock,
      showStatus: false,
    },
    {
      slug: NotificationSettingsSectionSlug.Perps,
      type: 'perps',
      titleKey: 'app_settings.notifications_opts.perps_title',
      descriptionKey: 'app_settings.notifications_opts.perps_desc',
      iconName: IconName.Candlestick,
      showStatus: true,
    },
    {
      slug: NotificationSettingsSectionSlug.SocialAi,
      type: 'socialAI',
      titleKey: 'app_settings.notifications_opts.social_ai_title',
      descriptionKey: 'app_settings.notifications_opts.social_ai_desc',
      iconName: IconName.Flash,
      showStatus: true,
      requiresSocialLeaderboard: true,
    },
    {
      slug: NotificationSettingsSectionSlug.AgenticCli,
      type: 'agenticCli',
      titleKey: 'app_settings.notifications_opts.agentic_cli_title',
      descriptionKey: 'app_settings.notifications_opts.agentic_cli_desc',
      iconName: IconName.Code,
      showStatus: true,
    },
    {
      slug: NotificationSettingsSectionSlug.Marketing,
      type: 'marketing',
      titleKey: 'app_settings.notifications_opts.marketing_title',
      descriptionKey: 'app_settings.notifications_opts.marketing_desc',
      iconName: IconName.Campaign,
      showStatus: true,
    },
    {
      slug: NotificationSettingsSectionSlug.PriceAlerts,
      type: 'priceAlerts',
      titleKey: 'app_settings.notifications_opts.price_alerts_title',
      descriptionKey: 'app_settings.notifications_opts.price_alerts_desc',
      iconName: IconName.Notification,
      showStatus: true,
    },
  ];

const NOTIFICATION_SETTINGS_SECTION_BY_PARAM: Record<
  string,
  NotificationSettingsSectionConfig
> = Object.fromEntries(
  NOTIFICATION_SETTINGS_SECTIONS.flatMap((section) => [
    [section.slug, section],
    [section.type.toLowerCase(), section],
  ]),
);

/**
 * Maps a deeplink `section` value (kebab-case slug or camelCase type) to a
 * notification settings section. Unknown or empty values return `undefined`
 * so callers can fall back to the main notification settings page.
 */
export const resolveNotificationSettingsSection = (
  section: string | null | undefined,
): NotificationSettingsSectionConfig | undefined => {
  if (!section) {
    return undefined;
  }

  return NOTIFICATION_SETTINGS_SECTION_BY_PARAM[section.trim().toLowerCase()];
};

export const getNotificationSettingsSectionRouteParams = (
  section: NotificationSettingsSectionConfig,
): {
  type: NotificationPreferenceSection;
  title: string;
  description: string;
} => ({
  type: section.type,
  title: strings(section.titleKey),
  description: strings(section.descriptionKey),
});
