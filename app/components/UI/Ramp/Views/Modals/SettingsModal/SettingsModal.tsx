import React, {
  useCallback,
  useRef,
  useContext,
  useState,
  useEffect,
} from 'react';
import InAppBrowser from 'react-native-inappbrowser-reborn';
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
import { trackEvent as trackRampsEvent } from '../../../hooks/useAnalytics';
import {
  getProviderToken,
  resetProviderToken,
} from '../../../Deposit/utils/ProviderTokenVault';
import { PROVIDER_LINKS } from '../../../Aggregator/types';

/**
 * Transak native provider path prefix - matches both production
 * ('/providers/transak-native') and staging ('/providers/transak-native-staging')
 */
const TRANSAK_NATIVE_PREFIX = '/providers/transak-native';

const isTransakNativeProvider = (providerId?: string): boolean =>
  providerId?.startsWith(TRANSAK_NATIVE_PREFIX) ?? false;

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
      if (!isTransakNativeProvider(selectedProvider?.id)) {
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
    trackRampsEvent('RAMPS_SETTING_OPTION_CLICKED', {
      option: 'View Order History',
      location: 'Amount Input',
      ramp_type: 'UNIFIED_BUY_2',
    });
    sheetRef.current?.onCloseBottomSheet();
    navigation.navigate(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  }, [navigation]);

  const handleContactSupport = useCallback(async () => {
    if (!supportUrl) return;
    trackRampsEvent('RAMPS_SETTING_OPTION_CLICKED', {
      option: 'Contact Support',
      location: 'Amount Input',
      ramp_type: 'UNIFIED_BUY_2',
    });
    try {
      if (await InAppBrowser.isAvailable()) {
        sheetRef.current?.onCloseBottomSheet();
        await InAppBrowser.open(supportUrl);
      } else {
        // Navigate without closing the sheet first. If we called onCloseBottomSheet() here,
        // shouldNavigateBack would fire goBack() after the close animation and pop the
        // Webview screen off the stack instead of the modal.
        navigation.navigate('Webview', {
          screen: 'SimpleWebview',
          params: { url: supportUrl },
        });
      }
    } catch (error) {
      Logger.error(error as Error, 'SettingsModal: Failed to open support URL');
    }
  }, [supportUrl, navigation]);

  const handleLogOut = useCallback(async () => {
    trackRampsEvent('RAMPS_SETTING_OPTION_CLICKED', {
      option: 'Log Out',
      location: 'Amount Input',
      ramp_type: 'UNIFIED_BUY_2',
    });
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
