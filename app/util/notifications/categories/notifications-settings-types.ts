import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import type { NotificationCategoryMetadata } from './notification-categories.types';

export type NotificationPreferenceChannelKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';

export function isChannelEnabledForAusKeys(
  preferences: NotificationPreferences | null | undefined,
  ausKeys: string[],
  channel: NotificationPreferenceChannelKey,
): boolean {
  return (
    ausKeys.length > 0 &&
    ausKeys.every(
      (ausKey) =>
        preferences?.[ausKey as keyof NotificationPreferences]?.[channel] ===
        true,
    )
  );
}

export function targetAusKeysInPreferences(
  ausKeys: string[],
  preferences: NotificationPreferences | null | undefined,
): string[] {
  if (!preferences) {
    return [];
  }
  return ausKeys.filter((ausKey) => ausKey in preferences);
}

export function getNotificationsSettingsSectionConfigs(
  categories: NotificationCategoryMetadata[],
  {
    isSocialLeaderboardEnabled,
    isPriceAlertsEnabled,
  }: {
    isSocialLeaderboardEnabled: boolean;
    isPriceAlertsEnabled: boolean;
  },
): NotificationCategoryMetadata[] {
  return categories.filter((category) => {
    if (category.categoryId === 'socialAI') {
      return isSocialLeaderboardEnabled;
    }
    if (category.categoryId === 'priceAlerts') {
      return isPriceAlertsEnabled;
    }
    return true;
  });
}
