import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import { getNotificationCategoryId } from './get-notification-category-id';
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
  }: {
    isSocialLeaderboardEnabled: boolean;
  },
): NotificationCategoryMetadata[] {
  return categories.filter((category) => {
    if (category.aus_keys.includes('socialAI')) {
      return isSocialLeaderboardEnabled;
    }
    return true;
  });
}

/**
 * Whether a notification should show in the inbox given the user's in-app
 * preferences. Never filters while preferences are unavailable, for
 * uncategorized notifications, or for display-only categories (no aus_keys).
 */
export function isNotificationVisibleInApp(
  notification: unknown,
  categories: NotificationCategoryMetadata[],
  preferences: NotificationPreferences | null | undefined,
): boolean {
  const categoryId = getNotificationCategoryId(notification);
  const category = categories.find((c) => c.category_id === categoryId);
  if (!preferences || !category || category.aus_keys.length === 0) {
    return true;
  }
  return category.aus_keys.some((ausKey) =>
    isChannelEnabledForAusKeys(
      preferences,
      [ausKey],
      'inAppNotificationsEnabled',
    ),
  );
}
