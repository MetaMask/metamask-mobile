import { useSelector } from 'react-redux';
import { selectIsMetamaskNotificationsEnabled } from '../../../../../selectors/notifications';
import {
  useNotificationStoragePreferences,
  type NotificationPreferenceSection,
} from './useNotificationStoragePreferences';

/**
 * Notification enablement status for one feature: the global master toggle
 * plus the feature's push and in-app channels, and whether the stored
 * preferences have settled enough to trust those reads.
 */
export function useFeatureNotificationsStatus(
  feature: NotificationPreferenceSection,
) {
  const isMasterEnabled = useSelector(selectIsMetamaskNotificationsEnabled);
  const { preferences, hasNotificationPreferences, isLoading } =
    useNotificationStoragePreferences();
  const sectionPrefs = preferences?.[feature];

  return {
    isMasterEnabled,
    isPushEnabled: sectionPrefs?.pushNotificationsEnabled ?? false,
    isInAppEnabled: sectionPrefs?.inAppNotificationsEnabled ?? false,
    hasNotificationPreferences,
    isPreferencesLoading: isLoading,
  };
}
