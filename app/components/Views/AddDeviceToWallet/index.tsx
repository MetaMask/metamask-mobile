import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  Button,
  BoxBackgroundColor,
  TextField,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import addDeviceToWalletImage from '../../../images/add_wallet_to_device.png';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  QRTabSwitcherScreens,
  type ScanSuccess,
  // eslint-disable-next-line import-x/no-restricted-paths
} from '../QRTabSwitcher';
import DeviceAdded from './DeviceAdded';
import Engine from '../../../core/Engine';
import { showAddDeviceVerificationSheet } from '../../../core/QrSync/showAddDeviceVerificationSheet';
import { useAddDeviceResetToInstructionsListener } from '../../../core/QrSync/useAddDeviceResetToInstructionsListener';
import { useQrSyncImportNavigation } from '../../../core/QrSync/useQrSyncImportNavigation';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Logger from '../../../util/Logger';
import {
  selectQrSyncError,
  selectQrSyncIsBusy,
  selectQrSyncIsSessionActive,
  selectQrSyncPresentation,
  selectQrSyncShouldShowOtpSheet,
} from '../../../selectors/qrSyncController';

const Points = ({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) => (
  <Box twClassName="flex-row items-center gap-2">
    <Box
      backgroundColor={BoxBackgroundColor.BackgroundSection}
      twClassName="w-8 h-8 rounded-full items-center justify-center"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {number}
      </Text>
    </Box>
    <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
      {children}
    </Text>
  </Box>
);

const AddDeviceToWallet = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const [manualQrPayload, setManualQrPayload] = useState('');
  const hasOpenedVerificationSheetRef = useRef(false);
  const isScannerOpen = useNavigationState((state) =>
    state.routes.some((route) => route.name === Routes.QR_TAB_SWITCHER),
  );
  const presentation = useSelector(selectQrSyncPresentation);
  const shouldShowOtpSheet = useSelector(selectQrSyncShouldShowOtpSheet);
  const isBusy = useSelector(selectQrSyncIsBusy);
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);
  const error = useSelector(selectQrSyncError);

  const handleBack = useCallback(() => {
    if (isSessionActive) {
      Engine.context.QrSyncController.cancelSession();
    }

    navigation.goBack();
  }, [isSessionActive, navigation]);

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

  const submitQrPayload = useCallback(async (qrPayload: string) => {
    await Engine.context.QrSyncController.handleScannedQrPayload(qrPayload);
  }, []);

  const onScanSuccess = useCallback(
    (data: ScanSuccess, content?: string) => {
      const scannedQrPayload = content ?? data.content ?? '';

      submitQrPayload(scannedQrPayload).catch((error: unknown) => {
        Logger.error(
          error as Error,
          'AddDeviceToWallet: failed to submit scanned QR payload',
        );
      });
    },
    [submitQrPayload],
  );

  const openQRScanner = useCallback(() => {
    if (isSessionActive) {
      Engine.context.QrSyncController.resetState();
    }

    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Scanner,
      disableTabber: true,
      origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
      onScanSuccess,
    });
  }, [navigation, onScanSuccess, isSessionActive]);

  const handleManualQrSubmit = useCallback(async () => {
    if (!manualQrPayload.trim()) {
      return;
    }

    await submitQrPayload(manualQrPayload);
  }, [manualQrPayload, submitQrPayload]);

  const triggerManualQrSubmit = useCallback(() => {
    handleManualQrSubmit().catch((error: unknown) => {
      Logger.error(
        error as Error,
        'AddDeviceToWallet: failed to submit manual QR payload',
      );
    });
  }, [handleManualQrSubmit]);

  if (presentation === 'device-linked' && !isScannerOpen) {
    return <DeviceAdded />;
  }

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <HeaderCompactStandard onBack={handleBack} />
      <Box twClassName="flex-1 gap-5 px-4 py-4">
        <Image
          source={addDeviceToWalletImage}
          style={tw.style('w-[130px] h-[130px] mx-auto')}
        />

        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('app_settings.add_device.add_device_to_wallet')}
        </Text>

        <Box twClassName="flex-col gap-4 mt-2">
          <Points number={1}>
            {strings('app_settings.add_device.points.one')}
          </Points>
          <Points number={2}>
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
          </Points>
          <Points number={3}>
            {strings('app_settings.add_device.points.three')}
          </Points>
          <Points number={4}>
            {strings('app_settings.add_device.points.four')}
          </Points>
        </Box>

        <Box twClassName="mt-auto gap-4">
          <Button
            twClassName="w-full"
            onPress={openQRScanner}
            isDisabled={isBusy}
            isLoading={isBusy}
          >
            {strings('app_settings.add_device.scan_qr_code_button')}
          </Button>

          {presentation === 'error' && error?.message ? (
            <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
              {error.message}
            </Text>
          ) : null}

          {__DEV__ ? (
            <Box
              backgroundColor={BoxBackgroundColor.BackgroundSection}
              twClassName="rounded-xl p-4 gap-3"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
              >
                Enter QR data manually
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                Paste the QR code payload here when testing on an emulator.
              </Text>
              <TextField
                value={manualQrPayload}
                onChangeText={setManualQrPayload}
                placeholder="Paste QR payload"
                isDisabled={isBusy}
                inputProps={{
                  autoCapitalize: 'none',
                  autoCorrect: false,
                  onSubmitEditing: triggerManualQrSubmit,
                  returnKeyType: 'done',
                }}
              />
              <Button
                twClassName="w-full"
                onPress={triggerManualQrSubmit}
                isDisabled={!manualQrPayload.trim() || isBusy}
                isLoading={isBusy}
              >
                Submit QR data
              </Button>
            </Box>
          ) : null}
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default AddDeviceToWallet;
