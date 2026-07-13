import type { NotificationCategoryMetadata } from './notification-categories.types';
import {
  getNotificationsSettingsSectionConfigs,
  isChannelEnabledForAusKeys,
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
      categoryId: 'walletActivity',
      ausKeys: ['walletActivity'],
      label: '',
      description: '',
      icon: 'Clock',
    },
    {
      categoryId: 'socialAI',
      ausKeys: ['socialAI'],
      label: '',
      description: '',
      icon: 'Flash',
    },
    {
      categoryId: 'priceAlerts',
      ausKeys: ['priceAlerts'],
      label: '',
      description: '',
      icon: 'Notification',
    },
  ];

  it('filters out socialAI when the social leaderboard flag is off', () => {
    const sections = getNotificationsSettingsSectionConfigs(categories, {
      isSocialLeaderboardEnabled: false,
      isPriceAlertsEnabled: true,
    });

    expect(sections.map((s) => s.categoryId)).toEqual([
      'walletActivity',
      'priceAlerts',
    ]);
  });

  it('filters out priceAlerts when the price alerts flag is off', () => {
    const sections = getNotificationsSettingsSectionConfigs(categories, {
      isSocialLeaderboardEnabled: true,
      isPriceAlertsEnabled: false,
    });

    expect(sections.map((s) => s.categoryId)).toEqual([
      'walletActivity',
      'socialAI',
    ]);
  });
});
