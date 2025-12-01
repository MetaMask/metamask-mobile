import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { IconName } from '../../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../../../util/navigation/navUtils';
import MenuItem from '../../../../components/MenuItem';
import { createDepositNavigationDetails } from '../../../../Deposit/routes/utils';
import useAnalytics from '../../../../hooks/useAnalytics';
import { useRampSDK } from '../../../sdk';

export const createBuySettingsModalNavigationDetails = createNavigationDetails(
  Routes.RAMP.MODALS.ID,
  Routes.RAMP.MODALS.SETTINGS,
);

function SettingsModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { selectedRegion } = useRampSDK();

  const trackEvent = useAnalytics();

  const handleNavigateToOrderHistory = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    navigation.navigate(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  }, [navigation]);

  const handleDepositPress = useCallback(() => {
    trackEvent('RAMPS_BUTTON_CLICKED', {
      location: 'Buy Settings Modal',
      ramp_type: 'DEPOSIT',
      region: selectedRegion?.id as string,
    });
    sheetRef.current?.onCloseBottomSheet();
    navigation.dangerouslyGetParent()?.dangerouslyGetParent()?.goBack();
    navigation.navigate(...createDepositNavigationDetails());
  }, [navigation, selectedRegion?.id, trackEvent]);

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
      <MenuItem
        iconName={IconName.Add}
        title={strings(
          'fiat_on_ramp_aggregator.settings_modal.use_new_buy_experience',
        )}
        description={strings(
          'fiat_on_ramp_aggregator.settings_modal.use_new_buy_experience_description',
        )}
        onPress={handleDepositPress}
      />
    </BottomSheet>
  );
}

export default SettingsModal;
