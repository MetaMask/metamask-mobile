import type { NotificationCategoryMetadata } from './notification-categories.types';
import {
  FALLBACK_NOTIFICATION_CATEGORIES,
  resolveNotificationCategories,
} from './notification-categories-api';

const category = (
  category_id: string,
  visible_on: NotificationCategoryMetadata['visible_on'],
): NotificationCategoryMetadata => ({
  category_id,
  aus_keys: [category_id],
  visible_on,
  notification_types: [],
});

describe('resolveNotificationCategories', () => {
  it('returns the fallback manifest when the response is empty', () => {
    expect(resolveNotificationCategories([])).toEqual(
      FALLBACK_NOTIFICATION_CATEGORIES.filter((c) =>
        c.visible_on.includes('mobile'),
      ),
    );
  });

  it('keeps only mobile-visible categories in backend order', () => {
    const result = resolveNotificationCategories([
      category('b', ['mobile']),
      category('x', ['extension']),
      category('a', ['portfolio', 'mobile']),
    ]);

    expect(result.map((c) => c.category_id)).toEqual(['b', 'a']);
  });

  it('fallback hides the categories the backend hides on mobile', () => {
    expect(resolveNotificationCategories([]).map((c) => c.category_id)).toEqual(
      [
        'wallet_activity',
        'trading_activity',
        'agentic_cli',
        'trading_signals',
        'updates_and_rewards',
      ],
    );
  });
});
