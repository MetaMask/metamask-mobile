import React, {
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FullWindowOverlay } from 'react-native-screens';

import HardwareWalletContext from './contexts/HardwareWalletContext';
import { HardwareWalletBottomSheet } from './components';
import { getHardwareWalletTypeForAddress } from './helpers';
import {
  HardwareWalletAnalyticsFlow,
  useHardwareWalletAnalytics,
} from './analytics';
import { useAnalyticsFlowFromApproval } from './analytics/useAnalyticsFlowFromApproval';
import {
  useHardwareWalletStateManager,
  useDeviceEventHandlers,
  useAdapterLifecycle,
  useTransportMonitoring,
  useDeviceDiscovery,
  useDeviceConnectionFlow,
  useQRSigningState,
} from './hooks';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';

interface HardwareWalletProviderProps {
  children: ReactNode;
}

/**
 * Unified Hardware Wallet Provider
 *
 * Manages all hardware wallet state and actions, automatically creating
 * the appropriate adapter based on wallet type, handling device events,
 * coordinating the connection / readiness flow and surfacing transport
 * or device errors to the user via a bottom sheet UI.
 */
export const HardwareWalletProvider: React.FC<HardwareWalletProviderProps> = ({
  children,
}) => {
  const { state, refs, setters } = useHardwareWalletStateManager();
  const { connectionState, deviceId, walletType, targetWalletType } = state;

  const [pendingOperationWalletType, setPendingOperationWalletTypeState] =
    useState<HardwareWalletType | null>(null);

  const effectiveWalletType =
    targetWalletType ?? pendingOperationWalletType ?? walletType;

  const [forceHideBottomSheet, setForceHideBottomSheet] = useState(false);

  const { handleDeviceEvent, handleError, updateConnectionState } =
    useDeviceEventHandlers({
      refs,
      setters,
      walletType: effectiveWalletType,
    });

  const {
    isTransportAvailable,
    previousTransportAvailableRef,
    createAdapterWithCallbacks,
    initializeAdapter,
  } = useAdapterLifecycle({
    walletType: effectiveWalletType,
    deviceId,
    adapterRef: refs.adapterRef,
    handleDeviceEvent,
    handleError,
    updateConnectionState,
  });

  const { checkTransportEnabledOrShowError } = useTransportMonitoring({
    isTransportAvailable,
    previousTransportAvailableRef,
    connectionState,
    adapterRef: refs.adapterRef,
    walletType: effectiveWalletType,
    updateConnectionState,
  });

  const { deviceSelection, selectDevice, rescan } = useDeviceDiscovery({
    adapterRef: refs.adapterRef,
    walletType: effectiveWalletType,
    connectionState,
    updateConnectionState,
  });

  const awaitingConfirmationRejectRef = useRef<(() => void) | null>(null);
  const operationTypeRef = useRef<'transaction' | 'message' | null>(null);
  const qrScanRetryHandlerRef = useRef<(() => void) | null>(null);

  const [analyticsFlow, setAnalyticsFlow] = useState(
    HardwareWalletAnalyticsFlow.Connection,
  );

  const derivedAnalyticsFlow = useAnalyticsFlowFromApproval();
  const derivedAnalyticsFlowRef = useRef(derivedAnalyticsFlow);
  derivedAnalyticsFlowRef.current = derivedAnalyticsFlow;

  const { trackCTAClicked, resetAnalyticsState } = useHardwareWalletAnalytics({
    connectionState,
    walletType: effectiveWalletType,
    flow: analyticsFlow,
    deviceModel: deviceSelection.selectedDevice?.name ?? null,
  });

  const handleFlowStart = useCallback(() => {
    operationTypeRef.current = null;
    resetAnalyticsState();
    setAnalyticsFlow(derivedAnalyticsFlowRef.current);
  }, [resetAnalyticsState]);
  const {
    ensureDeviceReady,
    connect,
    retryEnsureDeviceReady,
    closeFlow,
    handleConnectionSuccess,
  } = useDeviceConnectionFlow({
    refs,
    setters,
    walletType: effectiveWalletType,
    deviceId,
    handleError,
    updateConnectionState,
    createAdapterWithCallbacks,
    initializeAdapter,
    checkTransportEnabledOrShowError,
    onFlowStart: handleFlowStart,
  });

  const showHardwareWalletError = useCallback(
    (error: unknown) => {
      handleError(error);
    },
    [handleError],
  );

  const setQrScanRetryHandler = useCallback((handler: (() => void) | null) => {
    qrScanRetryHandlerRef.current = handler;
  }, []);

  const showAwaitingConfirmation = useCallback(
    (operationType: 'transaction' | 'message', onReject?: () => void) => {
      awaitingConfirmationRejectRef.current = onReject ?? null;
      operationTypeRef.current = operationType;

      updateConnectionState({
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: deviceId ?? 'unknown',
        operationType,
      });
    },
    [deviceId, updateConnectionState],
  );

  const hideAwaitingConfirmation = useCallback(() => {
    awaitingConfirmationRejectRef.current = null;
    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [updateConnectionState]);

  const handleCloseFlow = useCallback(() => {
    awaitingConfirmationRejectRef.current = null;
    operationTypeRef.current = null;
    setAnalyticsFlow(HardwareWalletAnalyticsFlow.Connection);
    closeFlow();
  }, [closeFlow]);

  const handleBottomSheetConnectionSuccess = useCallback(() => {
    awaitingConfirmationRejectRef.current = null;
    operationTypeRef.current = null;
    setAnalyticsFlow(HardwareWalletAnalyticsFlow.Connection);
    handleConnectionSuccess();
  }, [handleConnectionSuccess]);

  const handleRetryOrClose = useCallback(async () => {
    if (operationTypeRef.current !== null) {
      handleCloseFlow();
      return;
    }
    await retryEnsureDeviceReady();
  }, [handleCloseFlow, retryEnsureDeviceReady]);

  const handleRetryQrScan = useCallback(() => {
    if (operationTypeRef.current !== null) {
      updateConnectionState({
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: deviceId ?? 'unknown',
        operationType: operationTypeRef.current,
      });
      return;
    }

    const retryQrScan = qrScanRetryHandlerRef.current;
    updateConnectionState({ status: ConnectionStatus.Disconnected });
    if (!retryQrScan) {
      return;
    }

    retryQrScan();
  }, [deviceId, updateConnectionState]);

  const handleAwaitingConfirmationCancel = useCallback(() => {
    const onReject = awaitingConfirmationRejectRef.current;
    awaitingConfirmationRejectRef.current = null;
    operationTypeRef.current = null;
    setAnalyticsFlow(HardwareWalletAnalyticsFlow.Connection);
    try {
      onReject?.();
    } finally {
      hideAwaitingConfirmation();
    }
  }, [hideAwaitingConfirmation]);

  const setPendingOperationAddress = useCallback(
    (address: string | null) => {
      const nextPendingOperationWalletType = address
        ? (getHardwareWalletTypeForAddress(address) ?? null)
        : null;

      setters.setPendingOperationWalletType(nextPendingOperationWalletType);
      setPendingOperationWalletTypeState(nextPendingOperationWalletType);
    },
    [setters],
  );

  const {
    pendingScanRequest,
    isSigningQRObject,
    setRequestCompleted,
    isRequestCompleted,
    cancelQRScanRequestIfPresent,
  } = useQRSigningState();
  // Memoize the provider's `qr` object so its reference stays stable when the
  // underlying QR fields have not changed.
  const qrSigningValue = useMemo(
    () => ({
      pendingScanRequest,
      isSigningQRObject,
      setRequestCompleted,
      isRequestCompleted,
      cancelQRScanRequestIfPresent,
    }),
    [
      pendingScanRequest,
      isSigningQRObject,
      setRequestCompleted,
      isRequestCompleted,
      cancelQRScanRequestIfPresent,
    ],
  );

  const contextValue = useMemo(
    () => ({
      walletType: effectiveWalletType,
      deviceId,
      connectionState,
      deviceSelection,
      ensureDeviceReady,
      setTargetWalletType: setters.setTargetWalletType,
      setPendingOperationAddress,
      showHardwareWalletError,
      setQrScanRetryHandler,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
      setForceHideBottomSheet,
      qr: qrSigningValue,
    }),
    [
      effectiveWalletType,
      deviceId,
      connectionState,
      deviceSelection,
      ensureDeviceReady,
      setters.setTargetWalletType,
      setPendingOperationAddress,
      showHardwareWalletError,
      setQrScanRetryHandler,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
      setForceHideBottomSheet,
      qrSigningValue,
    ],
  );

  // iOS FullWindowOverlay constraints (do not regress):
  // 1) Mount the overlay ONLY when the bottom sheet has content (#32973 /
  //    #32619). An empty RNSFullWindowOverlayContainer is still
  //    accessibilityViewIsModal=YES and hides the entire app AX tree from
  //    VoiceOver / XCUITest / Appium / idb.
  // 2) Children that need RN Modal / react-native-modal with coverScreen must
  //    use coverScreen={false} (or render outside this overlay). Nested Modals
  //    cannot present on iOS (react-native-screens#1149 / #33022).
  // Mirrors HardwareWalletBottomSheet `shouldShow`: Disconnected (or force-hide
  // / missing wallet type) returns null synchronously, so unmounting the
  // overlay in the same render is safe.
  const isBottomSheetMounted =
    !forceHideBottomSheet &&
    effectiveWalletType !== null &&
    connectionState.status !== ConnectionStatus.Disconnected;

  return (
    <HardwareWalletContext.Provider value={contextValue}>
      {children}
      {isBottomSheetMounted && (
        <FullWindowOverlay>
          <HardwareWalletBottomSheet
            connectionState={connectionState}
            deviceSelection={deviceSelection}
            walletType={effectiveWalletType}
            forceHideBottomSheet={forceHideBottomSheet}
            retryEnsureDeviceReady={handleRetryOrClose}
            selectDevice={selectDevice}
            rescan={rescan}
            connect={connect}
            onClose={handleCloseFlow}
            onAwaitingConfirmationCancel={handleAwaitingConfirmationCancel}
            onConnectionSuccess={handleBottomSheetConnectionSuccess}
            onCTAClicked={trackCTAClicked}
            onRetryQrScan={handleRetryQrScan}
          />
        </FullWindowOverlay>
      )}
    </HardwareWalletContext.Provider>
  );
};
