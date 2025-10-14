import { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { useNotificationsToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';

export function useMainNotificationToggle() {
  const { data: currentVal, switchNotifications: onChange } =
    useNotificationsToggle();
  const navigation = useNavigation();
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  const onToggle = useCallback(() => {
    // Navigate to basic functionality if content is not set.
    if (!basicFunctionalityEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BASIC_FUNCTIONALITY,
        params: {
          caller: Routes.SETTINGS.NOTIFICATIONS,
        },
      });
      return;
    }

    const newVal = !currentVal;
    onChange(newVal);
  }, [basicFunctionalityEnabled, currentVal, navigation, onChange]);

  return { onToggle, value: currentVal };
}
