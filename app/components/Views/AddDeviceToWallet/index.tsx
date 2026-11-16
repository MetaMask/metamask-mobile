import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxBackgroundColor,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  FontWeight,
  Text,
  TextColor,
  TextField,
  TextButton,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import FooterGlass from '../../../component-library/components-temp/FooterGlass';
import { useHeaderGlassInset } from '../../../component-library/components-temp/HeaderGlass';
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
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from '../../../core/QrSync/qrSyncTelemetry';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  selectQrSyncIsBusy,
  selectQrSyncIsSessionActive,
  selectQrSyncNeedsProvisioning,
  selectQrSyncPresentation,
  selectQrSyncShouldNavigateToImport,
  selectQrSyncShouldShowOtpSheet,
} from '../../../selectors/qrSyncController';
import { AddDeviceToWalletTestIds } from './AddDeviceToWallet.testIds';

const SettingsPathDescription = () => (
  <Text
    variant={TextVariant.BodySm}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextAlternative}
  >
    {strings('app_settings.add_device.points.two_description_prefix')}{' '}
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Bold}
      color={TextColor.TextAlternative}
    >
      {strings('app_settings.add_device.points.two_description_path')}
    </Text>
  </Text>
);

const INSTRUCTIONS: {
  titleKey: string;
  descriptionKey?: string;
}[] = [
  {
    titleKey: 'app_settings.add_device.points.two_title',
  },
  {
    titleKey: 'app_settings.add_device.points.three_title',
    descriptionKey: 'app_settings.add_device.points.three_description',
  },
  {
    titleKey: 'app_settings.add_device.points.four_title',
    descriptionKey: 'app_settings.add_device.points.four_description',
  },
];

const AddDeviceToWallet = () => {
  const tw = useTailwind();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    true,
    safeAreaTop,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const messenger = useMessenger<RouteMessengerInstance>();
  const [manualQrPayload, setManualQrPayload] = useState('');
  const [showDevQrInput, setShowDevQrInput] = useState(false);
  const hasOpenedVerificationSheetRef = useRef(false);
  const isScannerOpen = useIsQrTabSwitcherOpen();
  const presentation = useSelector(selectQrSyncPresentation);
  const shouldShowOtpSheet = useSelector(selectQrSyncShouldShowOtpSheet);
  const isBusy = useSelector(selectQrSyncIsBusy);
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);
  const shouldNavigateToImport = useSelector(
    selectQrSyncShouldNavigateToImport,
  );
  const needsProvisioning = useSelector(selectQrSyncNeedsProvisioning);
  // Import and existing-user Phase C pop this screen while they still read
  // pending secrets and provisioning metadata.
  const shouldKeepQrSyncState = shouldNavigateToImport || needsProvisioning;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (shouldKeepQrSyncState) {
        return;
      }

      Promise.resolve(messenger.call('QrSyncController:resetState')).catch(
        () => undefined,
      );
    });

    return unsubscribe;
  }, [messenger, navigation, shouldKeepQrSyncState]);

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

  const submitManualQrPayload = useCallback(async () => {
    const payload = manualQrPayload.trim();
    if (!payload) {
      return;
    }

    await messenger.call('QrSyncController:handleScannedQrPayload', payload);
  }, [manualQrPayload, messenger]);

  const triggerManualQrSubmit = useCallback(() => {
    submitManualQrPayload().catch((submitError: unknown) => {
      reportQrSyncFailure(submitError, {
        surface: QrSyncSurfaces.SCANNER,
        operation: QrSyncOperations.SUBMIT_SCANNED_PAYLOAD,
        source: QrSyncTelemetrySources.ADD_DEVICE_MANUAL_SUBMIT,
      });
    });
  }, [submitManualQrPayload]);

  if (presentation === 'device-linked' && !isScannerOpen) {
    return <DeviceAdded onCancel={handleBack} />;
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={AddDeviceToWalletTestIds.SCREEN}
    >
      <HeaderStandardGlass
        backdrop="static"
        onLayout={onHeaderLayout}
        includesTopInset
        onBack={handleBack}
      />
      <Box twClassName="flex-1 pt-3" style={{ marginTop: headerInset }}>
        <TitleStandard
          twClassName="mb-2 px-4"
          title={strings('app_settings.add_device.add_device_to_wallet')}
        />

        <Box twClassName="px-4 mt-4 gap-5">
          {INSTRUCTIONS.map((instruction, index) => (
            <Box
              key={instruction.titleKey}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              gap={3}
            >
              <Box
                backgroundColor={BoxBackgroundColor.BackgroundSection}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="w-8 h-8 rounded-full shrink-0"
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Bold}
                  color={TextColor.TextDefault}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {index + 1}
                </Text>
              </Box>
              <Box twClassName="flex-1 pt-0.5" gap={1}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings(instruction.titleKey)}
                </Text>
                {instruction.descriptionKey ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings(instruction.descriptionKey)}
                  </Text>
                ) : (
                  <SettingsPathDescription />
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {__DEV__ ? (
          <Box twClassName="mx-4 mt-8" alignItems={BoxAlignItems.Start}>
            <TextButton
              onPress={() => setShowDevQrInput((isVisible) => !isVisible)}
              twClassName="text-alternative"
            >
              {showDevQrInput
                ? 'Hide developer options (For testing only)'
                : 'Developer options (For testing only)'}
            </TextButton>
            {showDevQrInput ? (
              <Box
                backgroundColor={BoxBackgroundColor.BackgroundSection}
                twClassName="w-full mt-2 rounded-xl p-4 gap-3"
              >
                <Box gap={1}>
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
                </Box>
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
        ) : null}

        <FooterGlass
          twClassName="mt-auto py-2"
          primaryButtonProps={{
            children: strings('app_settings.add_device.scan_qr_code_button'),
            onPress: openQRScanner,
            isDisabled: isBusy,
            isLoading: isBusy,
            testID: AddDeviceToWalletTestIds.SCAN_QR_CODE_BUTTON,
          }}
        />
      </Box>
    </SafeAreaView>
  );
};

export default AddDeviceToWallet;
