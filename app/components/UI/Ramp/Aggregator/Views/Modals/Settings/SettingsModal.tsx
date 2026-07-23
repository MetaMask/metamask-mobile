import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import { strings } from '../../../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { IconName } from '@metamask/design-system-react-native';
import Routes from '../../../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../../../util/navigation/navUtils';
import MenuItem from '../../../../components/MenuItem';

export const createBuySettingsModalNavigationDetails = createNavigationDetails(
  Routes.RAMP.MODALS.ID,
  Routes.RAMP.MODALS.SETTINGS,
);

function SettingsModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();

  const handleNavigateToOrderHistory = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    navigation.navigate(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  }, [navigation]);

  const handleClosePress = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={handleClosePress}>
        {strings('fiat_on_ramp_aggregator.settings_modal.title')}
      </BottomSheetHeader>
      <MenuItem
        iconName={IconName.Clock}
        title={strings('deposit.configuration_modal.view_order_history')}
        onPress={handleNavigateToOrderHistory}
      />
    </BottomSheet>
  );
}

export default SettingsModal;
