import { NotificationCategoryMetadata } from './notification-categories.types';

// TODO: replace with a real GET /api/v1/notifications/categories?locale=<locale>
// call once the BE endpoint ships. Keep this function's signature stable so
// useNotificationCategories doesn't need to change.
//
// label/description below are structural placeholders only — consumers
// resolve the actual copy via the existing app_settings.notifications_opts.*
// i18n keys, keyed off categoryId, so translations keep working.
const MOCK_NOTIFICATION_CATEGORIES: NotificationCategoryMetadata[] = [
  {
    categoryId: 'walletActivity',
    ausKeys: ['walletActivity'],
    label: 'Wallet activity',
    description: 'Buys, sells, transfers, and swaps',
    icon: 'Clock',
  },
  {
    categoryId: 'perps',
    ausKeys: ['perps'],
    label: 'Trading activity',
    description:
      'Perps position changes, liquidations, funding rates, and margin updates',
    icon: 'Candlestick',
  },
  {
    categoryId: 'agenticCli',
    ausKeys: ['agenticCli'],
    label: 'Agentic CLI',
    description:
      'CLI connection requests, approvals, and session updates for Agentic',
    icon: 'Code',
  },
  {
    categoryId: 'socialAI',
    ausKeys: ['socialAI'],
    label: 'Trading signals',
    description:
      'Updates from traders and assets you follow, plus curated market news',
    icon: 'Flash',
  },
  {
    categoryId: 'marketing',
    ausKeys: ['marketing'],
    label: 'Updates and rewards',
    description:
      'Product updates, feature announcements, and new rewards campaigns',
    icon: 'Campaign',
  },
  {
    categoryId: 'priceAlerts',
    ausKeys: ['priceAlerts'],
    label: 'Price alerts',
    description:
      "Get notified based on the alerts you've set for a token's price",
    icon: 'Notification',
  },
];

export async function fetchNotificationCategories(
  locale: string,
): Promise<NotificationCategoryMetadata[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(MOCK_NOTIFICATION_CATEGORIES), 100),
  );
}
