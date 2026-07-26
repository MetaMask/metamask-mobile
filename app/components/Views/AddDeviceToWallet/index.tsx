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
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { useNavigation } from '@react-navigation/native';
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
import { useIsQrTabSwitcherOpen } from '../../../core/QrSync/useIsQrTabSwitcherOpen';
import { useQrSyncImportNavigation } from '../../../core/QrSync/useQrSyncImportNavigation';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from '../../../core/QrSync/qrSyncTelemetry';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  selectQrSyncError,
  selectQrSyncIsBusy,
  selectQrSyncIsSessionActive,
  selectQrSyncPresentation,
  selectQrSyncShouldShowOtpSheet,
} from '../../../selectors/qrSyncController';
import { AddDeviceToWalletTestIds } from './AddDeviceToWallet.testIds';

const Step = ({
  iconName,
  title,
  children,
}: {
  iconName: IconName;
  title: string;
  children: React.ReactNode;
}) => (
  <Box twClassName="flex-row items-start gap-4">
    <Icon
      name={iconName}
      size={IconSize.Lg}
      color={IconColor.IconAlternative}
      twClassName="mt-0.5"
    />
    <Box twClassName="flex-1 gap-0.5">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
      >
        {title}
      </Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {children}
      </Text>
    </Box>
  </Box>
);

const AddDeviceToWallet = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const hasOpenedVerificationSheetRef = useRef(false);
  const isScannerOpen = useIsQrTabSwitcherOpen();
  const presentation = useSelector(selectQrSyncPresentation);
  const shouldShowOtpSheet = useSelector(selectQrSyncShouldShowOtpSheet);
  const isBusy = useSelector(selectQrSyncIsBusy);
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);
  const error = useSelector(selectQrSyncError);

  const handleBack = useCallback(() => {
    Engine.context.QrSyncController.resetState();
    navigation.goBack();
  }, [navigation]);

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

      submitQrPayload(scannedQrPayload).catch((err: unknown) => {
        reportQrSyncFailure(err, {
          surface: QrSyncSurfaces.SCANNER,
          operation: QrSyncOperations.SUBMIT_SCANNED_PAYLOAD,
          source: QrSyncTelemetrySources.ADD_DEVICE_ON_SCAN_SUCCESS,
        });
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

  if (presentation === 'device-linked' && !isScannerOpen) {
    return <DeviceAdded />;
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={AddDeviceToWalletTestIds.SCREEN}
    >
      <HeaderCompactStandard onBack={handleBack} />
      <Box twClassName="flex-1 gap-5 px-4 py-4">
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('app_settings.add_device.add_device_to_wallet')}
        </Text>

        <Box twClassName="flex-col gap-6 mt-2">
          <Step
            iconName={IconName.Monitor}
            title={strings('app_settings.add_device.points.one_title')}
          >
            {strings('app_settings.add_device.points.one_desc')}
          </Step>
          <Step
            iconName={IconName.Setting}
            title={strings('app_settings.add_device.points.two_title')}
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
          </Step>
          <Step
            iconName={IconName.ScanBarcode}
            title={strings('app_settings.add_device.points.three_title')}
          >
            {strings('app_settings.add_device.points.three_desc')}
          </Step>
          <Step
            iconName={IconName.Key}
            title={strings('app_settings.add_device.points.four_title')}
          >
            {strings('app_settings.add_device.points.four_desc')}
          </Step>
        </Box>

        <Box twClassName="mt-auto gap-4">
          <Button
            testID={AddDeviceToWalletTestIds.SCAN_QR_CODE_BUTTON}
            twClassName="w-full"
            startIconName={IconName.ScanBarcode}
            startIconProps={{ twClassName: 'mr-1' }}
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
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default AddDeviceToWallet;
