import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarIcon,
  AvatarIconSeverity,
  Box,
  BoxBackgroundColor,
  Button,
  FontWeight,
  IconName,
  ListItem,
  ListItemVariant,
  Text,
  TextColor,
  TextField,
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
import AccountsImported from './AccountsImported';
import DeviceAdded from './DeviceAdded';
import { useMessenger } from '../../../hooks/useMessenger';
import { RouteMessengerInstance } from './messenger';
import { showAddDeviceVerificationSheet } from '../../../core/QrSync/showAddDeviceVerificationSheet';
import { useAddDeviceResetToInstructionsListener } from '../../../core/QrSync/useAddDeviceResetToInstructionsListener';
import { useIsQrTabSwitcherOpen } from '../../../core/QrSync/useIsQrTabSwitcherOpen';
import {
  releaseQrSyncAccountsReviewHold,
  useQrSyncAccountsReviewSnapshot,
} from '../../../core/QrSync/qrSyncAccountsReview';
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
  selectQrSyncPresentation,
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
  iconName: IconName;
  titleKey: string;
  descriptionKey?: string;
}[] = [
  {
    iconName: IconName.Monitor,
    titleKey: 'app_settings.add_device.points.one_title',
    descriptionKey: 'app_settings.add_device.points.one_description',
  },
  {
    iconName: IconName.Setting,
    titleKey: 'app_settings.add_device.points.two_title',
  },
  {
    iconName: IconName.QrCode,
    titleKey: 'app_settings.add_device.points.three_title',
    descriptionKey: 'app_settings.add_device.points.three_description',
  },
  {
    iconName: IconName.Key,
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
  const hasOpenedVerificationSheetRef = useRef(false);
  const isScannerOpen = useIsQrTabSwitcherOpen();
  const presentation = useSelector(selectQrSyncPresentation);
  const shouldShowOtpSheet = useSelector(selectQrSyncShouldShowOtpSheet);
  const isBusy = useSelector(selectQrSyncIsBusy);
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);
  const { review, holdInstructions } = useQrSyncAccountsReviewSnapshot();

  useEffect(() => {
    if (presentation === 'instructions') {
      releaseQrSyncAccountsReviewHold();
    }
  }, [presentation]);

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

  if (!holdInstructions && review && !isScannerOpen) {
    return <AccountsImported />;
  }

  if (!holdInstructions && presentation === 'device-linked' && !isScannerOpen) {
    return <DeviceAdded />;
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
      <Box twClassName="flex-1" style={{ marginTop: headerInset }}>
        <TitleStandard
          twClassName="mb-6 px-4"
          title={strings('app_settings.add_device.add_device_to_wallet')}
        />

        {INSTRUCTIONS.map((instruction) => (
          <ListItem
            key={instruction.titleKey}
            variant={ListItemVariant.TwoLines}
            avatar={
              <AvatarIcon
                iconName={instruction.iconName}
                severity={AvatarIconSeverity.Neutral}
              />
            }
            title={strings(instruction.titleKey)}
            description={
              instruction.descriptionKey ? (
                strings(instruction.descriptionKey)
              ) : (
                <SettingsPathDescription />
              )
            }
          />
        ))}

        {__DEV__ ? (
          <Box
            backgroundColor={BoxBackgroundColor.BackgroundSection}
            twClassName="mx-4 mt-4 rounded-xl p-4 gap-3"
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

        <FooterGlass
          twClassName="mt-auto py-4"
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
