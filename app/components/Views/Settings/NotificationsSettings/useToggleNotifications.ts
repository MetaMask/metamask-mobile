import { useCallback } from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { useMetrics } from '../../../hooks/useMetrics';

interface Props {
  navigation: NavigationProp<ParamListBase>;
  basicFunctionalityEnabled: boolean;
  isMetamaskNotificationsEnabled: boolean;
  isProfileSyncingEnabled: boolean | null;
  disableNotifications: () => Promise<string | undefined>;
  enableNotifications: () => Promise<string | undefined>;
  setUiNotificationStatus: (status: boolean) => void;
}

export function useToggleNotifications({
  navigation,
  basicFunctionalityEnabled,
  isMetamaskNotificationsEnabled,
  isProfileSyncingEnabled,
  disableNotifications,
  enableNotifications,
  setUiNotificationStatus,
}: Props) {
  const { trackEvent, createEventBuilder } = useMetrics();
  const toggleNotificationsEnabled = useCallback(async () => {
    if (!basicFunctionalityEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BASIC_FUNCTIONALITY,
        params: {
          caller: Routes.SETTINGS.NOTIFICATIONS,
        },
      });
    } else if (isMetamaskNotificationsEnabled) {
      disableNotifications();
      setUiNotificationStatus(false);
    } else {
      const { permission } = await NotificationsService.getAllPermissions(
        false,
      );
      if (permission !== 'authorized') {
        return;
      }

      enableNotifications();
      setUiNotificationStatus(true);
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: 'notifications',
          old_value: isMetamaskNotificationsEnabled,
          new_value: !isMetamaskNotificationsEnabled,
          was_profile_syncing_on: isMetamaskNotificationsEnabled
            ? true
            : isProfileSyncingEnabled,
        })
        .build(),
    );
  }, [
    basicFunctionalityEnabled,
    isMetamaskNotificationsEnabled,
    trackEvent,
    isProfileSyncingEnabled,
    navigation,
    disableNotifications,
    setUiNotificationStatus,
    enableNotifications,
    createEventBuilder,
  ]);

  return { toggleNotificationsEnabled };
}
