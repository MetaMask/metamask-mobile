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
import { strings } from '../../../../locales/i18n';
import {
  HeaderBase,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import type { QrSyncPhase } from '../../../core/QrSync/types';
import { useMessenger } from '../../../hooks/useMessenger';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { RouteMessengerInstance } from './messenger';
import {
  selectQrSyncError,
  selectQrSyncIsSessionActive,
  selectQrSyncPhase,
  selectQrSyncPresentation,
  selectQrSyncShouldShowOtpSheet,
} from '../../../selectors/qrSyncController';
import { useQrSyncImportNavigation } from '../../../core/QrSync/useQrSyncImportNavigation';
import { showAddDeviceVerificationSheet } from '../../../core/QrSync/showAddDeviceVerificationSheet';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import { useNativeHeader } from '../../hooks/useNativeHeader';

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
  const route = useRoute();
  const navigation = useNavigation<AppNavigationProp>();
  const messenger = useMessenger<RouteMessengerInstance>();
  const { onScanError, onScanSuccess, onStartScan, origin } =
    route.params as QRTabSwitcherParams;

  const isAddDeviceOrigin = origin === Routes.ONBOARDING.ADD_DEVICE_TO_WALLET;
  const phase = useSelector(selectQrSyncPhase);
  const isSessionActive = useSelector(selectQrSyncIsSessionActive);
  const presentation = useSelector(selectQrSyncPresentation);
  const shouldShowOtpSheet = useSelector(selectQrSyncShouldShowOtpSheet);
  const qrSyncError = useSelector(selectQrSyncError);
  const hasOpenedVerificationSheetRef = useRef(false);
  const hasShownExtensionCancelSheetRef = useRef(false);
  const prevPhaseRef = useRef(phase);
  const keepWaitingScreenAfterCancelRef = useRef(false);

  if (isAddDeviceOrigin) {
    if (
      phase === QrSyncPhases.INITIALIZING ||
      phase === QrSyncPhases.DISPLAYING_OTP
    ) {
      keepWaitingScreenAfterCancelRef.current = false;
    } else if (
      DEVICE_LINKED_WAIT_PHASES.has(prevPhaseRef.current) &&
      (phase === QrSyncPhases.IDLE || phase === QrSyncPhases.FAILED)
    ) {
      keepWaitingScreenAfterCancelRef.current = true;
    }
  }

  const showExtensionCancelSheetOnce = useCallback(() => {
    if (hasShownExtensionCancelSheetRef.current) {
      return;
    }

    hasShownExtensionCancelSheetRef.current = true;
    showExtensionCancelledErrorSheet(navigation, {
      errorMessage: qrSyncError?.message,
    });
  }, [navigation, qrSyncError?.message]);

  const showVerificationSheet = useCallback(() => {
    showAddDeviceVerificationSheet(navigation);
  }, [navigation]);

  const resetExtensionCancelSheetState = useCallback(() => {
    hasShownExtensionCancelSheetRef.current = false;
    keepWaitingScreenAfterCancelRef.current = false;
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
    isAddDeviceOrigin &&
    (presentation === 'device-linked' ||
      keepWaitingScreenAfterCancelRef.current);

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

  useEffect(() => {
    trace({ name: TraceName.QRTabSwitcher });
    endTrace({ name: TraceName.QRTabSwitcher });
  }, []);

  // Memoised because the bar items close over it; an unstable `goBack` would
  // reconfigure the native header on every render.
  const goBack = useCallback(() => {
    if (isAddDeviceOrigin && isSessionActive) {
      Promise.resolve(messenger.call('QrSyncController:resetState')).catch(
        () => undefined,
      );
    }

    navigation.goBack();
    const scanErrorCallback = onScanError;
    try {
      if (scanErrorCallback) {
        scanErrorCallback(USER_CANCELLED);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn(`Error setting onScanError: ${error.message}`);
      } else {
        console.warn('An unknown error occurred');
      }
    }
  }, [isAddDeviceOrigin, isSessionActive, messenger, navigation, onScanError]);

  /*
   * Presented as a modal, so there is no back button to inherit — the close
   * action is an explicit bar item. As a `UIBarButtonItem` it gets the iOS 26
   * glass capsule over the camera, which the floating `ButtonIcon` did not.
   *
   * Above the early return below: hooks cannot run conditionally.
   */
  const headerRightItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'button' as const,
        identifier: 'qr-scanner-close',
        label: '',
        icon: { type: 'sfSymbol' as const, name: 'xmark' },
        variant: 'plain' as const,
        accessibilityLabel: strings('navigation.close'),
        onPress: goBack,
      },
    ],
    [goBack],
  );

  /*
   * One dismiss affordance, and it is this one. The scanner is reached both as
   * a modal and as a push, so the pushed entry points would otherwise draw a
   * system back button alongside the close — and the two are not equivalent:
   * `goBack` here also resets the QR-sync session and reports `USER_CANCELLED`
   * to the caller, which a plain pop would silently skip.
   */
  const isNativeHeaderEnabled = useNativeHeader({
    title: '',
    rightItems: headerRightItems,
    hideBackButton: true,
  });

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

      {!isNativeHeaderEnabled && (
        <HeaderBase
          style={[styles.overlay, styles.header]}
          endAccessory={
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Md}
              onPress={goBack}
            />
          }
        />
      )}

      {/* QR scanner interface - camera view only */}
    </View>
  );
};

export default QRTabSwitcher;
