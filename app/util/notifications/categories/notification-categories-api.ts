import type { NotificationCategoryMetadata } from './notification-categories.types';

// TODO: replace with a real GET /api/v4/notifications/categories call once the
// BE endpoint is consumed via the controller. Keep this function's signature
// stable so consumers don't need to change.
const MOCK_NOTIFICATION_CATEGORIES: NotificationCategoryMetadata[] = [
  {
    category_id: 'walletActivity',
    aus_keys: ['walletActivity'],
    visible_on: [],
    notification_types: [],
  },
  {
    category_id: 'perps',
    aus_keys: ['perps'],
    visible_on: [],
    notification_types: [],
  },
  {
    category_id: 'agenticCli',
    aus_keys: ['agenticCli'],
    visible_on: [],
    notification_types: [],
  },
  {
    category_id: 'socialAI',
    aus_keys: ['socialAI'],
    visible_on: [],
    notification_types: [],
  },
  {
    category_id: 'marketing',
    aus_keys: ['marketing'],
    visible_on: [],
    notification_types: [],
  },
  {
    category_id: 'priceAlerts',
    aus_keys: ['priceAlerts'],
    visible_on: [],
    notification_types: [],
  },
];

export async function fetchNotificationCategories(
  _locale: string,
): Promise<NotificationCategoryMetadata[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(MOCK_NOTIFICATION_CATEGORIES), 100),
  );
}
