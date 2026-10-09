import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  Button,
  HeaderStandard,
  TitleStandard,
  ListItem,
  ListItemVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  QRTabSwitcherScreens,
  // eslint-disable-next-line import-x/no-restricted-paths
} from '../QRTabSwitcher';
import DeviceAdded from './DeviceAdded';
import { useMessenger } from '../../../hooks/useMessenger';
import { RouteMessengerInstance } from './messenger';
import { showAddDeviceVerificationSheet } from '../../../core/QrSync/showAddDeviceVerificationSheet';
import { useAddDeviceResetToInstructionsListener } from '../../../core/QrSync/useAddDeviceResetToInstructionsListener';
import { useIsQrTabSwitcherOpen } from '../../../core/QrSync/useIsQrTabSwitcherOpen';
import { useQrSyncImportNavigation } from '../../../core/QrSync/useQrSyncImportNavigation';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  selectQrSyncIsBusy,
  selectQrSyncIsSessionActive,
  selectQrSyncPresentation,
  selectQrSyncShouldShowOtpSheet,
} from '../../../selectors/qrSyncController';
import { AddDeviceToWalletTestIds } from './AddDeviceToWallet.testIds';

const StepNumber = ({ children }: { children: string }) => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextDefault}
  >
    {children}
  </Text>
);

const AddDeviceToWallet = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const messenger = useMessenger<RouteMessengerInstance>();
  const hasOpenedVerificationSheetRef = useRef(false);
  const isScannerOpen = useIsQrTabSwitcherOpen();
  const presentation = useSelector(selectQrSyncPresentation);
  const shouldShowOtpSheet = useSelector(selectQrSyncShouldShowOtpSheet);
  const isBusy = useSelector(selectQrSyncIsBusy);
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);

  const handleBack = useCallback(() => {
    Promise.resolve(messenger.call('QrSyncController:resetState')).catch(
      () => undefined,
    );
    navigation.goBack();
  }, [messenger, navigation]);

  const showVerificationSheet = useCallback(() => {
    showAddDeviceVerificationSheet(navigation);
  }, [navigation]);

  useEffect(() => {
    if (!shouldShowOtpSheet || isScannerOpen) {
      hasOpenedVerificationSheetRef.current = false;
      return;
    }

    if (hasOpenedVerificationSheetRef.current) {
      return;
    }

    hasOpenedVerificationSheetRef.current = true;
    showVerificationSheet();
  }, [shouldShowOtpSheet, isScannerOpen, showVerificationSheet]);

  useQrSyncImportNavigation({
    enabled: true,
    deferWhileScannerOpen: true,
    isScannerOpen,
  });

  useAddDeviceResetToInstructionsListener({
    enabled: !isScannerOpen,
  });

  const openQRScanner = useCallback(() => {
    if (isSessionActive) {
      Promise.resolve(messenger.call('QrSyncController:resetState')).catch(
        () => undefined,
      );
    }

    // Do not pass a messenger-bound onScanSuccess. QRTabSwitcher submits the
    // payload on its own live route messenger.
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Scanner,
      disableTabber: true,
      origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
    });
  }, [messenger, navigation, isSessionActive]);

  if (presentation === 'device-linked' && !isScannerOpen) {
    return <DeviceAdded />;
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={AddDeviceToWalletTestIds.SCREEN}
    >
      <HeaderStandard includesTopInset onBack={handleBack} />
      <Box twClassName="flex-1">
        <TitleStandard
          twClassName="px-4"
          title={strings('app_settings.add_device.add_device_to_wallet')}
        />

        <ListItem
          variant={ListItemVariant.OneLine}
          accessoryGap={4}
          startAccessory={<StepNumber>1</StepNumber>}
          title={strings('app_settings.add_device.points.one')}
        />
        <ListItem
          variant={ListItemVariant.OneLine}
          accessoryGap={4}
          startAccessory={<StepNumber>2</StepNumber>}
          title={
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {strings('app_settings.add_device.points.two')}{' '}
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {strings('app_settings.add_device.points.two_bold_one')}
              </Text>{' '}
              {strings('app_settings.add_device.points.two_icon')}{' '}
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {strings('app_settings.add_device.points.two_bold_two')}
              </Text>
            </Text>
          }
        />
        <ListItem
          variant={ListItemVariant.OneLine}
          accessoryGap={4}
          startAccessory={<StepNumber>3</StepNumber>}
          title={strings('app_settings.add_device.points.three')}
        />
        <ListItem
          variant={ListItemVariant.OneLine}
          accessoryGap={4}
          startAccessory={<StepNumber>4</StepNumber>}
          title={strings('app_settings.add_device.points.four')}
        />

        <Box twClassName="mt-auto gap-4 px-4 py-4">
          <Button
            testID={AddDeviceToWalletTestIds.SCAN_QR_CODE_BUTTON}
            twClassName="w-full"
            onPress={openQRScanner}
            isDisabled={isBusy}
            isLoading={isBusy}
          >
            {strings('app_settings.add_device.scan_qr_code_button')}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default AddDeviceToWallet;
