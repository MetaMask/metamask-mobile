import { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { useNotificationsToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { useOptimisticToggleValue } from './hooks/useOptimisticToggleValue';

export function useMainNotificationToggle() {
  const { data: notificationsEnabled, switchNotifications } =
    useNotificationsToggle();
  const remoteValue = notificationsEnabled ?? false;
  const navigation = useNavigation<AppNavigationProp>();
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  const onToggleBlocked = useCallback(() => {
    // Navigate to basic functionality if content is not set.
    if (!basicFunctionalityEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BASIC_FUNCTIONALITY,
        params: {
          caller: Routes.SETTINGS.NOTIFICATIONS,
        },
      });
    }
  }, [basicFunctionalityEnabled, navigation]);

  const {
    value,
    onValueChange: onToggle,
    pendingWrites,
  } = useOptimisticToggleValue({
    remoteValue,
    onPersist: switchNotifications,
    isToggleEnabled: () => basicFunctionalityEnabled,
    onToggleBlocked,
  });

  return { onToggle, value, isUpdating: pendingWrites > 0 };
}
