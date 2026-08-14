import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationStoragePreferences } from '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences';

export interface UseOpenSocialNotificationPreferencesResult {
  /**
   * Opens the Social AI notification preferences. No-ops while the stored
   * preferences are still resolving, so a tap can never route on a stale
   * "has no preferences" read.
   */
  openNotificationPreferences: () => void;
}

/**
 * Routes the notification-bell action in the Follow Trading header.
 *
 * Users who have never saved notification preferences are sent to the top-level
 * notification settings first (they must opt in before a per-feature section
 * exists); everyone else lands directly on the Social AI section.
 *
 * Shared by `TopTradersView` and `SocialTradersTabsView`, which render the same
 * bell in their headers.
 */
export const useOpenSocialNotificationPreferences =
  (): UseOpenSocialNotificationPreferencesResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const { hasNotificationPreferences, isLoading } =
      useNotificationStoragePreferences();

    const openNotificationPreferences = useCallback(() => {
      if (isLoading) {
        return;
      }

      if (!hasNotificationPreferences) {
        navigation.navigate(Routes.SETTINGS_VIEW, {
          screen: Routes.SETTINGS.NOTIFICATIONS,
        });
        return;
      }

      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
        params: {
          type: 'socialAI',
          title: strings('app_settings.notifications_opts.social_ai_title'),
          description: strings(
            'app_settings.notifications_opts.social_ai_desc',
          ),
        },
      });
    }, [hasNotificationPreferences, isLoading, navigation]);

    return { openNotificationPreferences };
  };

export default useOpenSocialNotificationPreferences;
