import React, { useCallback, useRef, useContext } from 'react';
import { Linking } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  IconName,
  IconColor,
} from '../../../../../../../component-library/components/Icons/Icon';

import { createNavigationDetails } from '../../../../../../../util/navigation/navUtils';
import { useRampNavigation } from '../../../../hooks/useRampNavigation';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { TRANSAK_SUPPORT_URL } from '../../../constants/constants';
import { useDepositSDK } from '../../../sdk';
import { useNavigation } from '@react-navigation/native';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../../component-library/components/Toast';
import Logger from '../../../../../../../util/Logger';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import MenuItem from '../../../../components/MenuItem';
import useAnalytics from '../../../../hooks/useAnalytics';
import { useRampsButtonClickData } from '../../../../hooks/useRampsButtonClickData';

export const createConfigurationModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.CONFIGURATION,
  );

function ConfigurationModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const trackEvent = useAnalytics();

  const { goToAggregator } = useRampNavigation();
  const { logoutFromProvider, isAuthenticated, selectedRegion } =
    useDepositSDK();
  const buttonClickData = useRampsButtonClickData();

  const navigateToOrderHistory = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    navigation.navigate(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  }, [navigation]);

  const handleContactSupport = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
    Linking.openURL(TRANSAK_SUPPORT_URL);
  }, []);

  const handleNavigateToAggregator = useCallback(() => {
    trackEvent('RAMPS_BUTTON_CLICKED', {
      location: 'Deposit Settings Modal',
      ramp_type: 'BUY',
      region: selectedRegion?.isoCode as string,
      ramp_routing: buttonClickData.ramp_routing,
      is_authenticated: buttonClickData.is_authenticated,
      preferred_provider: buttonClickData.preferred_provider,
      order_count: buttonClickData.order_count,
    });
    navigation.dangerouslyGetParent()?.dangerouslyGetParent()?.goBack();
    goToAggregator();
  }, [
    navigation,
    selectedRegion?.isoCode,
    trackEvent,
    goToAggregator,
    buttonClickData,
  ]);

  const handleLogOut = useCallback(async () => {
    try {
      await logoutFromProvider();

      sheetRef.current?.onCloseBottomSheet();
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('deposit.configuration_modal.logged_out_success') },
        ],
        iconName: IconName.CheckBold,
        iconColor: IconColor.Success,
        hasNoTimeout: false,
      });
    } catch (error) {
      Logger.error(error as Error, 'Error logging out from provider:');
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('deposit.configuration_modal.logged_out_error') },
        ],
        iconName: IconName.CircleX,
        iconColor: IconColor.Error,
        hasNoTimeout: false,
      });
    }
  }, [logoutFromProvider, toastRef]);

  const handleClosePress = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={handleClosePress}>
        {strings('deposit.configuration_modal.title')}
      </BottomSheetHeader>
      <MenuItem
        iconName={IconName.Clock}
        title={strings('deposit.configuration_modal.view_order_history')}
        onPress={navigateToOrderHistory}
      />

      <MenuItem
        iconName={IconName.Messages}
        title={strings('deposit.configuration_modal.contact_support')}
        onPress={handleContactSupport}
      />

      {isAuthenticated && (
        <MenuItem
          iconName={IconName.Logout}
          title={strings('deposit.configuration_modal.log_out')}
          onPress={handleLogOut}
        />
      )}

      <MenuItem
        iconName={IconName.Money}
        title={strings('deposit.configuration_modal.more_ways_to_buy')}
        description={strings(
          'deposit.configuration_modal.more_ways_to_buy_description',
        )}
        onPress={handleNavigateToAggregator}
      />
    </BottomSheet>
  );
}

export default ConfigurationModal;
