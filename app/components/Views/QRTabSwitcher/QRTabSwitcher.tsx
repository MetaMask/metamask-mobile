import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useRef, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import QRScanner from '../QRScanner';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import DeviceAdded from '../AddDeviceToWallet/DeviceAdded';
import { showExtensionCancelledErrorSheet } from '../../../core/QrSync/showExtensionCancelledErrorSheet';
import { useAddDeviceResetToInstructionsListener } from '../../../core/QrSync/useAddDeviceResetToInstructionsListener';
import { useTheme } from '../../../util/theme';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import createStyles from './styles';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { HeaderBase } from '@metamask/design-system-react-native';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import type { QrSyncPhase } from '../../../core/QrSync/types';
import Engine from '../../../core/Engine';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  selectQrSyncIsSessionActive,
  selectQrSyncPhase,
  selectQrSyncPresentation,
  selectQrSyncShouldShowOtpSheet,
} from '../../../selectors/qrSyncController';
import { useQrSyncImportNavigation } from '../../../core/QrSync/useQrSyncImportNavigation';
import { showAddDeviceVerificationSheet } from '../../../core/QrSync/showAddDeviceVerificationSheet';

const DEVICE_LINKED_WAIT_PHASES: ReadonlySet<QrSyncPhase> = new Set([
  QrSyncPhases.AWAITING_SYNC_READY,
  QrSyncPhases.REVIEWING_IMPORT,
]);

export enum QRTabSwitcherScreens {
  Scanner,
}

export interface ScanSuccess {
  content?: string;
  chain_id?: string;
  seed?: string;
  private_key?: string;
  target_address?: string;
  action?: 'send-eth';
  walletConnectURI?: string;
}

export interface StartScan {
  content?: string;
  seed?: string;
  private_key?: string;
  target_address?: string;
  action?: 'send-eth';
  walletConnectURI?: string;
}

const USER_CANCELLED = 'USER_CANCELLED';

export interface QRTabSwitcherParams {
  onScanSuccess: (data: ScanSuccess, content?: string) => void;
  onStartScan?: (data: StartScan) => Promise<void>;
  onScanError?: (error: string) => void;
  initialScreen?: QRTabSwitcherScreens;
  disableTabber?: boolean;
  origin?: string;
  networkName?: string;
}

export const createQRScannerNavDetails =
  createNavigationDetails<QRTabSwitcherParams>(Routes.QR_TAB_SWITCHER);

const QRTabSwitcher = () => {
  // Start tracing component loading
  const isFirstRender = useRef(true);

  if (isFirstRender.current) {
    trace({ name: TraceName.QRTabSwitcher });
  }

  const route = useRoute();
  const navigation = useNavigation<AppNavigationProp>();
  const { onScanError, onScanSuccess, onStartScan, origin } =
    route.params as QRTabSwitcherParams;

  const isAddDeviceOrigin = origin === Routes.ONBOARDING.ADD_DEVICE_TO_WALLET;
  const phase = useSelector(selectQrSyncPhase);
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);
  const presentation = useSelector(selectQrSyncPresentation);
  const shouldShowOtpSheet = useSelector(selectQrSyncShouldShowOtpSheet);
  const hasOpenedVerificationSheetRef = useRef(false);
  const hasShownExtensionCancelSheetRef = useRef(false);
  const prevPhaseRef = useRef(phase);

  const showExtensionCancelSheetOnce = useCallback(() => {
    if (hasShownExtensionCancelSheetRef.current) {
      return;
    }

    hasShownExtensionCancelSheetRef.current = true;
    showExtensionCancelledErrorSheet(navigation);
  }, [navigation]);

  const showVerificationSheet = useCallback(() => {
    showAddDeviceVerificationSheet(navigation);
  }, [navigation]);

  const resetExtensionCancelSheetState = useCallback(() => {
    hasShownExtensionCancelSheetRef.current = false;
  }, []);

  useEffect(() => {
    if (!isAddDeviceOrigin) {
      return;
    }

    if (!shouldShowOtpSheet) {
      hasOpenedVerificationSheetRef.current = false;
      return;
    }

    if (hasOpenedVerificationSheetRef.current) {
      return;
    }

    hasOpenedVerificationSheetRef.current = true;
    showVerificationSheet();
  }, [isAddDeviceOrigin, shouldShowOtpSheet, showVerificationSheet]);

  useQrSyncImportNavigation({ enabled: isAddDeviceOrigin });

  const showDeviceAddedLoader =
    isAddDeviceOrigin && presentation === 'device-linked';

  useEffect(() => {
    if (!isAddDeviceOrigin) {
      return;
    }

    if (
      phase === QrSyncPhases.INITIALIZING ||
      phase === QrSyncPhases.DISPLAYING_OTP
    ) {
      hasShownExtensionCancelSheetRef.current = false;
    }
  }, [isAddDeviceOrigin, phase]);

  useEffect(() => {
    if (!isAddDeviceOrigin) {
      prevPhaseRef.current = phase;
      return;
    }

    const previousPhase = prevPhaseRef.current;
    const wasWaitingOnExtension = DEVICE_LINKED_WAIT_PHASES.has(previousPhase);

    if (
      wasWaitingOnExtension &&
      (phase === QrSyncPhases.IDLE || phase === QrSyncPhases.FAILED)
    ) {
      showExtensionCancelSheetOnce();
    }

    prevPhaseRef.current = phase;
  }, [isAddDeviceOrigin, phase, showExtensionCancelSheetOnce]);

  useAddDeviceResetToInstructionsListener({
    enabled: isAddDeviceOrigin,
    navigation,
    shouldGoBack: true,
    onReset: resetExtensionCancelSheetState,
    onNavigateBack: () => {
      navigation.navigate(Routes.ONBOARDING.ADD_DEVICE_TO_WALLET);
    },
  });

  // QR scanner displays camera view for scanning codes
  const selectedIndex = QRTabSwitcherScreens.Scanner;
  const theme = useTheme();
  const styles = createStyles(theme);

  // End trace when component has finished initial loading
  useEffect(() => {
    endTrace({ name: TraceName.QRTabSwitcher });
    isFirstRender.current = false;
  }, []);

  const goBack = () => {
    if (isAddDeviceOrigin && isSessionActive) {
      Engine.context.QrSyncController.resetState();
    }

    navigation.goBack();
    try {
      onScanError?.(USER_CANCELLED);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn(`Error setting onScanError: ${error.message}`);
      } else {
        console.warn('An unknown error occurred');
      }
    }
  };

  if (showDeviceAddedLoader) {
    return <DeviceAdded />;
  }

  return (
    <View style={styles.container}>
      {selectedIndex === QRTabSwitcherScreens.Scanner ? (
        <QRScanner
          onScanError={onScanError}
          onScanSuccess={onScanSuccess}
          onStartScan={onStartScan}
          origin={origin}
          shouldDismissOnScan={
            origin !== Routes.ONBOARDING.ADD_DEVICE_TO_WALLET
          }
        />
      ) : null}

      <View style={styles.overlay}>
        <HeaderBase
          style={styles.header}
          endAccessory={
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Md}
              onPress={goBack}
            />
          }
        ></HeaderBase>
      </View>

      {/* QR scanner interface - camera view only */}
    </View>
  );
};

export default QRTabSwitcher;
