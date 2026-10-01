import type { NotificationCategoryMetadata } from './notification-categories.types';

const MOBILE = 'mobile' as const;

// Snapshot of GET /api/v4/notifications/categories (prd). Only used when that
// request fails, so the UI keeps the same categories instead of going blank.
export const FALLBACK_NOTIFICATION_CATEGORIES: NotificationCategoryMetadata[] =
  [
    {
      category_id: 'wallet_activity',
      aus_keys: ['walletActivity'],
      notification_types: ['wallet_activity'],
      visible_on: ['extension', MOBILE],
    },
    {
      category_id: 'trading_activity',
      aus_keys: ['perps'],
      notification_types: ['perps'],
      visible_on: ['extension', MOBILE],
    },
    {
      category_id: 'agentic_cli',
      aus_keys: ['agenticCli'],
      notification_types: ['agentic_cli'],
      visible_on: ['extension', MOBILE],
    },
    {
      category_id: 'trading_signals',
      aus_keys: ['socialAI'],
      notification_types: ['social_ai'],
      visible_on: ['extension', MOBILE],
    },
    {
      category_id: 'updates_and_rewards',
      aus_keys: ['marketing'],
      notification_types: ['rewards'],
      visible_on: ['extension', MOBILE],
    },
    {
      category_id: 'price_alerts',
      aus_keys: ['priceAlerts'],
      notification_types: ['price_alerts'],
      visible_on: [],
    },
    {
      category_id: 'shield',
      aus_keys: [],
      notification_types: ['shield'],
      visible_on: [],
    },
    {
      category_id: 'card',
      aus_keys: [],
      notification_types: ['card'],
      visible_on: [],
    },
  ];

/**
 * Categories visible on mobile, in backend order. An empty controller state
 * after a settled fetch means the request failed, so use the snapshot.
 */
export function resolveNotificationCategories(
  categories: NotificationCategoryMetadata[],
): NotificationCategoryMetadata[] {
  return (
    categories.length > 0 ? categories : FALLBACK_NOTIFICATION_CATEGORIES
  ).filter((c) => c.visible_on.includes(MOBILE));
}
