import React, {
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import HardwareWalletContext from './contexts/HardwareWalletContext';
import { HardwareWalletBottomSheet } from './components';
import {
  useHardwareWalletStateManager,
  useDeviceEventHandlers,
  useAdapterLifecycle,
  useTransportMonitoring,
  useDeviceDiscovery,
  useDeviceConnectionFlow,
} from './hooks';
import { ConnectionStatus } from '@metamask/hw-wallet-sdk';
import DevLogger from '../SDKConnect/utils/DevLogger';

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
  const [isConnectionSheetVisible, setConnectionSheetVisibleState] =
    useState(true);

  const effectiveWalletType = targetWalletType ?? walletType;

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

  const { ensureDeviceReady, connect, closeFlow, handleConnectionSuccess } =
    useDeviceConnectionFlow({
      refs,
      setters,
      walletType: effectiveWalletType,
      handleError,
      updateConnectionState,
      createAdapterWithCallbacks,
      initializeAdapter,
      checkTransportEnabledOrShowError,
    });

  const awaitingConfirmationRejectRef = useRef<(() => void) | null>(null);

  const showHardwareWalletError = useCallback(
    (error: unknown) => {
      DevLogger.log('[HardwareWallet] showHardwareWalletError:', error);
      handleError(error);
    },
    [handleError],
  );

  const showAwaitingConfirmation = useCallback(
    (operationType: 'transaction' | 'message', onReject?: () => void) => {
      DevLogger.log(
        '[HardwareWallet] showAwaitingConfirmation:',
        operationType,
      );
      awaitingConfirmationRejectRef.current = onReject ?? null;

      updateConnectionState({
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: deviceId ?? 'unknown',
        operationType,
      });
    },
    [deviceId, updateConnectionState],
  );

  const hideAwaitingConfirmation = useCallback(() => {
    DevLogger.log('[HardwareWallet] hideAwaitingConfirmation');
    awaitingConfirmationRejectRef.current = null;
    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [updateConnectionState]);

  const handleAwaitingConfirmationCancel = useCallback(() => {
    DevLogger.log('[HardwareWallet] handleAwaitingConfirmationCancel');
    // eslint-disable-next-line no-empty-function
    refs.adapterRef.current?.disconnect().catch(() => {});
    awaitingConfirmationRejectRef.current?.();
    hideAwaitingConfirmation();
  }, [hideAwaitingConfirmation, refs.adapterRef]);

  const setConnectionSheetVisible = useCallback((isVisible: boolean) => {
    setConnectionSheetVisibleState(isVisible);
  }, []);

  const contextValue = useMemo(
    () => ({
      walletType: effectiveWalletType,
      deviceId,
      connectionState,
      deviceSelection,
      ensureDeviceReady,
      setTargetWalletType: setters.setTargetWalletType,
      selectDiscoveredDevice: selectDevice,
      rescanDevices: rescan,
      connectToDevice: connect,
      closeConnectionFlow: closeFlow,
      acknowledgeConnectionSuccess: handleConnectionSuccess,
      setConnectionSheetVisible,
      showHardwareWalletError,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
    }),
    [
      effectiveWalletType,
      deviceId,
      connectionState,
      deviceSelection,
      ensureDeviceReady,
      setters.setTargetWalletType,
      selectDevice,
      rescan,
      connect,
      closeFlow,
      handleConnectionSuccess,
      setConnectionSheetVisible,
      showHardwareWalletError,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
    ],
  );

  return (
    <HardwareWalletContext.Provider value={contextValue}>
      {children}
      <HardwareWalletBottomSheet
        connectionState={connectionState}
        deviceSelection={deviceSelection}
        walletType={effectiveWalletType}
        ensureDeviceReady={ensureDeviceReady}
        selectDevice={selectDevice}
        rescan={rescan}
        connect={connect}
        onClose={closeFlow}
        onAwaitingConfirmationCancel={handleAwaitingConfirmationCancel}
        onConnectionSuccess={handleConnectionSuccess}
        isConnectionSheetVisible={isConnectionSheetVisible}
      />
    </HardwareWalletContext.Provider>
  );
};
