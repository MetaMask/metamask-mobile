import React, {
  useCallback,
  useRef,
  useContext,
  useState,
  useEffect,
} from 'react';
import { Linking } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  IconName,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import Logger from '../../../../../../util/Logger';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import MenuItem from '../../../components/MenuItem';
import { useRampsController } from '../../../hooks/useRampsController';
import {
  getProviderToken,
  resetProviderToken,
} from '../../../Deposit/utils/ProviderTokenVault';
import { PROVIDER_LINKS } from '../../../Aggregator/types';

/**
 * Transak provider ID - the only provider with native logout support
 */
const TRANSAK_PROVIDER_ID = '/providers/transak-native';

export const createSettingsModalNavDetails = createNavigationDetails(
  Routes.RAMP.MODALS.ID,
  Routes.RAMP.MODALS.BUILD_QUOTE_SETTINGS,
);

function SettingsModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const { selectedProvider, setSelectedProvider } = useRampsController();

  const [isAuthenticatedWithProvider, setIsAuthenticatedWithProvider] =
    useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      // Only Transak supports native authentication/logout
      if (selectedProvider?.id !== TRANSAK_PROVIDER_ID) {
        if (isMounted) {
          setIsAuthenticatedWithProvider(false);
        }
        return;
      }

      try {
        const tokenResponse = await getProviderToken();
        if (isMounted) {
          setIsAuthenticatedWithProvider(
            tokenResponse.success && !!tokenResponse.token?.accessToken,
          );
        }
      } catch {
        if (isMounted) {
          setIsAuthenticatedWithProvider(false);
        }
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, [selectedProvider?.id]);

  const supportUrl = selectedProvider?.links?.find(
    (link) => link.name === PROVIDER_LINKS.SUPPORT,
  )?.url;

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
    if (supportUrl) {
      sheetRef.current?.onCloseBottomSheet();
      Linking.openURL(supportUrl);
    }
  }, [supportUrl]);

  const handleLogOut = useCallback(async () => {
    try {
      await resetProviderToken();
      setSelectedProvider(null);

      sheetRef.current?.onCloseBottomSheet();
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings(
              'fiat_on_ramp.build_quote_settings_modal.logged_out_success',
            ),
          },
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
          {
            label: strings(
              'fiat_on_ramp.build_quote_settings_modal.logged_out_error',
            ),
          },
        ],
        iconName: IconName.CircleX,
        iconColor: IconColor.Error,
        hasNoTimeout: false,
      });
    }
  }, [setSelectedProvider, toastRef]);

  const handleClosePress = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={handleClosePress}>
        {strings('fiat_on_ramp.build_quote_settings_modal.title')}
      </BottomSheetHeader>
      <MenuItem
        iconName={IconName.Clock}
        title={strings(
          'fiat_on_ramp.build_quote_settings_modal.view_order_history',
        )}
        onPress={navigateToOrderHistory}
      />

      {supportUrl && (
        <MenuItem
          iconName={IconName.Messages}
          title={strings(
            'fiat_on_ramp.build_quote_settings_modal.contact_support',
          )}
          onPress={handleContactSupport}
        />
      )}

      {isAuthenticatedWithProvider && selectedProvider && (
        <MenuItem
          iconName={IconName.Logout}
          title={strings('fiat_on_ramp.build_quote_settings_modal.log_out', {
            provider: selectedProvider.name,
          })}
          onPress={handleLogOut}
        />
      )}
    </BottomSheet>
  );
}

export default SettingsModal;
