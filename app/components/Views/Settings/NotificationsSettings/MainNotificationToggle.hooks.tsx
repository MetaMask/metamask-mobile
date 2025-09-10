import { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { selectIsBackupAndSyncEnabled } from '../../../../selectors/identity';
import { useNotificationsToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

export function useMainNotificationToggle() {
  const { data: currentVal, switchNotifications: onChange } =
    useNotificationsToggle();
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);

  const onToggle = useCallback(() => {
    // Navigate to basic functionality if content is not set.
    if (!basicFunctionalityEnabled) {
      navigation.navigate(Routes.SHEET.BASIC_FUNCTIONALITY, {
        caller: Routes.SETTINGS.NOTIFICATIONS,
      });
      return;
    }

    const newVal = !currentVal;
    onChange(newVal);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: 'notifications',
          old_value: currentVal,
          new_value: newVal,
          was_profile_syncing_on: currentVal ? true : isBackupAndSyncEnabled,
        })
        .build(),
    );
  }, [
    basicFunctionalityEnabled,
    createEventBuilder,
    currentVal,
    isBackupAndSyncEnabled,
    navigation,
    onChange,
    trackEvent,
  ]);

  return { onToggle, value: currentVal };
}
