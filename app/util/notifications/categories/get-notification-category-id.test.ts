import { getNotificationCategoryId } from './get-notification-category-id';

describe('getNotificationCategoryId', () => {
  it('returns the category string when present', () => {
    expect(getNotificationCategoryId({ category: 'walletActivity' })).toBe(
      'walletActivity',
    );
  });

  it('returns undefined when the field is absent', () => {
    expect(getNotificationCategoryId({})).toBeUndefined();
  });
});
