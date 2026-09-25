import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Handles the /notifications-settings universal link by navigating to the
 * notification settings main page. An optional `section` query param opens a
 * specific preference section (wallet activity, price alerts, etc.).
 *
 * Supported URL formats:
 * - https://link.metamask.io/notifications-settings
 * - https://link.metamask.io/notifications-settings?section=wallet-activity
 * - https://link.metamask.io/notifications-settings?section=price-alerts
 *
 * Unknown or missing `section` values land on the main notification settings
 * page. Valid values are resolved by the settings screen itself.
 *
 * @param params - The params object
 * @param params.notificationsSettingsPath - The remainder of the URL after the
 * action (e.g. '?section=price-alerts')
 */
export function handleNotificationsSettingsUrl({
  notificationsSettingsPath,
}: {
  notificationsSettingsPath: string;
}) {
  const urlParams = new URLSearchParams(
    notificationsSettingsPath?.includes('?')
      ? notificationsSettingsPath.split('?')[1]
      : '',
  );
  const section = urlParams.get('section');

  NavigationService.navigation.navigate(Routes.SETTINGS_VIEW, {
    screen: Routes.SETTINGS.NOTIFICATIONS,
    params: section ? { section } : undefined,
  });
}
