import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../NavigationService';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { executeDeeplinkIntent } from '../../../utils/executeDeeplinkIntent';
import {
  createNotificationsSettingsDeeplinkIntent,
  handleNotificationsSettingsUrl,
} from '../handleNotificationsSettingsUrl';

jest.mock('../../../../NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../utils/executeDeeplinkIntent', () => ({
  executeDeeplinkIntent: jest.fn(),
}));

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockExecuteDeeplinkIntent = jest.mocked(executeDeeplinkIntent);
const mockLog = DevLogger.log as jest.Mock;

const notificationsSettingsTarget = (section?: string) => ({
  type: 'main-stack' as const,
  routeName: Routes.SETTINGS_VIEW,
  params: {
    screen: Routes.SETTINGS.NOTIFICATIONS,
    params: section ? { section } : undefined,
  },
});

describe('handleNotificationsSettingsUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotificationsSettingsDeeplinkIntent', () => {
    it('targets the notification settings main page when no section is provided', () => {
      expect(
        createNotificationsSettingsDeeplinkIntent({
          notificationsSettingsPath: '',
        }),
      ).toEqual({
        target: notificationsSettingsTarget(),
      });
    });

    it('passes the section query param through to the notification settings page', () => {
      expect(
        createNotificationsSettingsDeeplinkIntent({
          notificationsSettingsPath: '?section=wallet-activity',
        }),
      ).toEqual({
        target: notificationsSettingsTarget('wallet-activity'),
      });
    });

    it('passes price-alerts through as the section param', () => {
      expect(
        createNotificationsSettingsDeeplinkIntent({
          notificationsSettingsPath: '?section=price-alerts',
        }),
      ).toEqual({
        target: notificationsSettingsTarget('price-alerts'),
      });
    });

    it('passes unknown section values through so the settings page can fall back', () => {
      expect(
        createNotificationsSettingsDeeplinkIntent({
          notificationsSettingsPath: '?section=not-a-section',
        }),
      ).toEqual({
        target: notificationsSettingsTarget('not-a-section'),
      });
    });

    it('ignores unrelated params', () => {
      expect(
        createNotificationsSettingsDeeplinkIntent({
          notificationsSettingsPath: '?foo=bar',
        }),
      ).toEqual({
        target: notificationsSettingsTarget(),
      });
    });
  });

  describe('handleNotificationsSettingsUrl', () => {
    it('executes the intent to open notification settings', async () => {
      mockExecuteDeeplinkIntent.mockResolvedValueOnce(undefined);

      await handleNotificationsSettingsUrl({
        notificationsSettingsPath: '?section=price-alerts',
      });

      expect(mockExecuteDeeplinkIntent).toHaveBeenCalledTimes(1);
      expect(mockExecuteDeeplinkIntent).toHaveBeenCalledWith(
        createNotificationsSettingsDeeplinkIntent({
          notificationsSettingsPath: '?section=price-alerts',
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('falls back to wallet home when navigation throws', async () => {
      const error = new Error('nav rejected');
      mockExecuteDeeplinkIntent.mockRejectedValueOnce(error);

      await handleNotificationsSettingsUrl({
        notificationsSettingsPath: '',
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
      expect(mockLog).toHaveBeenCalledWith(
        'Failed to handle notifications settings deeplink:',
        error,
      );
    });
  });
});
