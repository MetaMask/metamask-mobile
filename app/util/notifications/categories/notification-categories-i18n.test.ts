import {
  getCategoryDescription,
  getCategoryTitle,
} from './notification-categories-i18n';
import type { NotificationCategoryMetadata } from './notification-categories.types';

const make = (
  category_id: string,
  aus_keys: string[],
): NotificationCategoryMetadata => ({
  category_id,
  aus_keys,
  visible_on: ['mobile'],
  notification_types: [],
});

describe('notification category i18n helpers', () => {
  it('resolves copy by aus key rather than category_id', () => {
    const category = make('trading_activity', ['perps']);

    expect(getCategoryTitle(category)).toBe(
      getCategoryTitle(make('perps', ['perps'])),
    );
    expect(getCategoryDescription(category)).not.toBe('');
  });

  it('falls back to the category_id title and empty description when unknown', () => {
    const category = make('mystery', ['mystery']);

    expect(getCategoryTitle(category)).toBe('mystery');
    expect(getCategoryDescription(category)).toBe('');
  });
});
