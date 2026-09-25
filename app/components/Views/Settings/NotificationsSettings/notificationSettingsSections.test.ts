import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  NotificationSettingsSectionSlug,
  getNotificationSettingsSectionRouteParams,
  resolveNotificationSettingsSection,
} from './notificationSettingsSections';

describe('resolveNotificationSettingsSection', () => {
  it('returns the wallet activity section for the kebab-case slug', () => {
    const result = resolveNotificationSettingsSection(
      NotificationSettingsSectionSlug.WalletActivity,
    );

    expect(result?.type).toBe('walletActivity');
    expect(result?.iconName).toBe(IconName.Clock);
  });

  it('returns the price alerts section for the camelCase type', () => {
    const result = resolveNotificationSettingsSection('priceAlerts');

    expect(result?.slug).toBe(NotificationSettingsSectionSlug.PriceAlerts);
  });

  it('trims and lowercases the section value', () => {
    const result = resolveNotificationSettingsSection('  Social-AI  ');

    expect(result?.type).toBe('socialAI');
  });

  it('returns undefined for an unknown section', () => {
    const result = resolveNotificationSettingsSection('not-a-section');

    expect(result).toBeUndefined();
  });

  it('returns undefined for a missing section', () => {
    expect(resolveNotificationSettingsSection(undefined)).toBeUndefined();
    expect(resolveNotificationSettingsSection(null)).toBeUndefined();
    expect(resolveNotificationSettingsSection('')).toBeUndefined();
  });
});

describe('getNotificationSettingsSectionRouteParams', () => {
  it('returns localized title and description for the section', () => {
    const section = resolveNotificationSettingsSection(
      NotificationSettingsSectionSlug.WalletActivity,
    );

    expect(section).toBeDefined();
    if (!section) {
      throw new Error('expected wallet activity section');
    }

    const result = getNotificationSettingsSectionRouteParams(section);

    expect(result).toEqual({
      type: 'walletActivity',
      title: strings('app_settings.notifications_opts.wallet_activity_title'),
      description: strings(
        'app_settings.notifications_opts.wallet_activity_desc',
      ),
    });
  });
});
