import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';

interface HandleNotificationsSettingsUrlParams {
  notificationsSettingsPath: string;
}

const parseSection = (notificationsSettingsPath: string): string | null => {
  const urlParams = new URLSearchParams(
    notificationsSettingsPath?.includes('?')
      ? notificationsSettingsPath.split('?')[1]
      : '',
  );
  return urlParams.get('section');
};

/**
 * Deeplink intent for notification settings.
 *
 * Supported URL formats:
 * - https://link.metamask.io/notifications-settings
 * - https://link.metamask.io/notifications-settings?section=wallet-activity
 * - https://link.metamask.io/notifications-settings?section=price-alerts
 *
 * Unknown or missing `section` values land on the main notification settings
 * page. Valid values are resolved by the settings screen itself.
 *
 * Settings sits on the main stack above the tabs, so this is a `main-stack`
 * target. Startup resolution reuses the same intent.
 */
export const createNotificationsSettingsDeeplinkIntent = ({
  notificationsSettingsPath,
}: HandleNotificationsSettingsUrlParams): DeeplinkIntent => {
  const section = parseSection(notificationsSettingsPath);

  return {
    target: {
      type: 'main-stack',
      routeName: Routes.SETTINGS_VIEW,
      params: {
        screen: Routes.SETTINGS.NOTIFICATIONS,
        params: section ? { section } : undefined,
      },
    },
  };
};

export const handleNotificationsSettingsUrl = async ({
  notificationsSettingsPath,
}: HandleNotificationsSettingsUrlParams) => {
  DevLogger.log(
    '[handleNotificationsSettingsUrl] Opening notification settings with path:',
    notificationsSettingsPath,
  );

  try {
    await executeDeeplinkIntent(
      createNotificationsSettingsDeeplinkIntent({
        notificationsSettingsPath,
      }),
    );
  } catch (error) {
    DevLogger.log('Failed to handle notifications settings deeplink:', error);
    NavigationService.navigation.navigate(Routes.WALLET.HOME);
  }
};
