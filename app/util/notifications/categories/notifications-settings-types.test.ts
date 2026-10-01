import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import type { NotificationCategoryMetadata } from './notification-categories.types';
import {
  getNotificationsSettingsSectionConfigs,
  isChannelEnabledForAusKeys,
  isNotificationVisibleInApp,
  targetAusKeysInPreferences,
} from './notifications-settings-types';

describe('isChannelEnabledForAusKeys', () => {
  const preferences = {
    walletActivity: {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    },
    perps: {
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: true,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it('returns true when every ausKey has the channel enabled', () => {
    expect(
      isChannelEnabledForAusKeys(
        preferences,
        ['walletActivity'],
        'pushNotificationsEnabled',
      ),
    ).toBe(true);
  });

  it('returns false when any ausKey has the channel disabled', () => {
    expect(
      isChannelEnabledForAusKeys(
        preferences,
        ['walletActivity', 'perps'],
        'pushNotificationsEnabled',
      ),
    ).toBe(false);
  });

  it('returns false for an empty ausKeys list', () => {
    expect(
      isChannelEnabledForAusKeys(preferences, [], 'pushNotificationsEnabled'),
    ).toBe(false);
  });

  it('returns false when preferences are missing', () => {
    expect(
      isChannelEnabledForAusKeys(
        undefined,
        ['walletActivity'],
        'pushNotificationsEnabled',
      ),
    ).toBe(false);
  });
});

describe('targetAusKeysInPreferences', () => {
  it('filters out ausKeys not present in preferences', () => {
    const preferences = {
      walletActivity: {
        pushNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    expect(
      targetAusKeysInPreferences(['walletActivity', 'perps'], preferences),
    ).toEqual(['walletActivity']);
  });

  it('returns an empty array when preferences are missing', () => {
    expect(targetAusKeysInPreferences(['walletActivity'], undefined)).toEqual(
      [],
    );
  });
});

describe('getNotificationsSettingsSectionConfigs', () => {
  const categories: NotificationCategoryMetadata[] = [
    {
      category_id: 'walletActivity',
      aus_keys: ['walletActivity'],
      visible_on: [],
      notification_types: [],
    },
    {
      category_id: 'social_ai',
      aus_keys: ['socialAI'],
      visible_on: [],
      notification_types: [],
    },
  ];

  it('filters out socialAI when the social leaderboard flag is off', () => {
    const sections = getNotificationsSettingsSectionConfigs(categories, {
      isSocialLeaderboardEnabled: false,
    });

    expect(sections.map((s) => s.category_id)).toEqual(['walletActivity']);
  });

  it('keeps socialAI when the social leaderboard flag is on', () => {
    const sections = getNotificationsSettingsSectionConfigs(categories, {
      isSocialLeaderboardEnabled: true,
    });

    expect(sections.map((s) => s.category_id)).toEqual([
      'walletActivity',
      'social_ai',
    ]);
  });
});

describe('isNotificationVisibleInApp', () => {
  const categories: NotificationCategoryMetadata[] = [
    {
      category_id: 'trading_activity',
      aus_keys: ['perps'],
      visible_on: ['mobile'],
      notification_types: [],
    },
    {
      category_id: 'announcements',
      aus_keys: [],
      visible_on: ['mobile'],
      notification_types: [],
    },
  ];
  const prefs = (inApp: boolean): NotificationPreferences =>
    ({
      perps: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: inApp,
      },
    }) as unknown as NotificationPreferences;

  it('hides a notification whose category in-app preference is off', () => {
    expect(
      isNotificationVisibleInApp(
        { category: 'trading_activity' },
        categories,
        prefs(false),
      ),
    ).toBe(false);
  });

  it('shows a notification whose category in-app preference is on', () => {
    expect(
      isNotificationVisibleInApp(
        { category: 'trading_activity' },
        categories,
        prefs(true),
      ),
    ).toBe(true);
  });

  it.each([
    ['preferences are unavailable', 'trading_activity', null],
    ['the category is unknown', 'mystery', prefs(false)],
    ['the category is display-only', 'announcements', prefs(false)],
    ['the notification is uncategorized', '', prefs(false)],
  ])('shows the notification when %s', (_label, category, preferences) => {
    expect(
      isNotificationVisibleInApp({ category }, categories, preferences),
    ).toBe(true);
  });
});
