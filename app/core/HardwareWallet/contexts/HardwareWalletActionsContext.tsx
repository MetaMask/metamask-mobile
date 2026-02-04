import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { HardwareWalletType } from '../helpers';
import { HardwareWalletActions, DiscoveredDevice } from '../types';

/**
 * Actions context type - contains stable callback functions.
 * Separated from state to prevent unnecessary re-renders when state changes.
 */
export type HardwareWalletActionsContextType = HardwareWalletActions;

/**
 * No-op implementations for default context
 */
const noopAsync = async () => {
  throw new Error('HardwareWalletActionsContext not initialized');
};

const noopAsyncBool = async (): Promise<boolean> => {
  throw new Error('HardwareWalletActionsContext not initialized');
};

const noop = () => {
  throw new Error('HardwareWalletActionsContext not initialized');
};

const defaultActions: HardwareWalletActionsContextType = {
  openDeviceSelection: noop,
  closeDeviceSelection: noop,
  openSigningModal: noopAsync,
  closeSigningModal: noop,
  connect: noopAsync,
  disconnect: noopAsync,
  ensureDeviceReady: noopAsyncBool,
  setTargetWalletType: noop,
  showHardwareWalletError: noop,
  clearError: noop,
  retry: noopAsync,
  requestBluetoothPermissions: noopAsyncBool,
  selectDevice: noop,
  rescan: noop,
  resetFlowState: noop,
  showAwaitingConfirmation: noop,
  hideAwaitingConfirmation: noop,
};

const HardwareWalletActionsContext =
  createContext<HardwareWalletActionsContextType>(defaultActions);

HardwareWalletActionsContext.displayName = 'HardwareWalletActionsContext';

export interface HardwareWalletActionsProviderProps {
  children: ReactNode;
  /** Open device selection (starts scanning and shows bottom sheet) */
  onOpenDeviceSelection: (
    walletType: HardwareWalletType,
    onSuccess?: () => void,
  ) => void;
  /** Close device selection (stops scanning and hides bottom sheet) */
  onCloseDeviceSelection: () => void;
  /** Open signing modal (connects to device and shows signing UI) */
  onOpenSigningModal: (
    walletType: HardwareWalletType,
    deviceId: string,
    onDeviceReady?: () => Promise<void>,
  ) => Promise<void>;
  /** Close signing modal */
  onCloseSigningModal: () => void;
  /** Connect to a device */
  onConnect: (deviceId: string) => Promise<void>;
  /** Disconnect from current device */
  onDisconnect: () => Promise<void>;
  /** Ensure device is ready for operations */
  onEnsureDeviceReady: (deviceId?: string) => Promise<boolean>;
  /** Set target wallet type for "Add Hardware Wallet" flow */
  onSetTargetWalletType: (walletType: HardwareWalletType) => void;
  /** Show hardware wallet error in bottom sheet (always displays, wallet type auto-derived) */
  onShowHardwareWalletError: (error: unknown) => void;
  /** Clear displayed error */
  onClearError: () => void;
  /** Retry last failed operation */
  onRetry: () => Promise<void>;
  /** Request Bluetooth permissions */
  onRequestBluetoothPermissions: () => Promise<boolean>;
  /** Select a device from discovered list */
  onSelectDevice: (device: DiscoveredDevice) => void;
  /** Rescan for BLE devices */
  onRescan: () => void;
  /** Reset flow state to allow errors to be shown again */
  onResetFlowState: () => void;
  /** Show awaiting confirmation bottom sheet */
  onShowAwaitingConfirmation: (
    operationType: 'transaction' | 'message',
    onReject?: () => void,
  ) => void;
  /** Hide awaiting confirmation bottom sheet */
  onHideAwaitingConfirmation: () => void;
}

/**
 * Provider for hardware wallet actions.
 * This context contains stable callback references that don't change.
 */
export const HardwareWalletActionsProvider: React.FC<
  HardwareWalletActionsProviderProps
> = ({
  children,
  onOpenDeviceSelection,
  onCloseDeviceSelection,
  onOpenSigningModal,
  onCloseSigningModal,
  onConnect,
  onDisconnect,
  onEnsureDeviceReady,
  onSetTargetWalletType,
  onShowHardwareWalletError,
  onClearError,
  onRetry,
  onRequestBluetoothPermissions,
  onSelectDevice,
  onRescan,
  onResetFlowState,
  onShowAwaitingConfirmation,
  onHideAwaitingConfirmation,
}) => {
  // Wrap callbacks to ensure stable references
  const openDeviceSelection = useCallback(
    (walletType: HardwareWalletType, onSuccess?: () => void) =>
      onOpenDeviceSelection(walletType, onSuccess),
    [onOpenDeviceSelection],
  );

  const closeDeviceSelection = useCallback(
    () => onCloseDeviceSelection(),
    [onCloseDeviceSelection],
  );

  const openSigningModal = useCallback(
    (
      walletType: HardwareWalletType,
      deviceId: string,
      onDeviceReady?: () => Promise<void>,
    ) => onOpenSigningModal(walletType, deviceId, onDeviceReady),
    [onOpenSigningModal],
  );

  const closeSigningModal = useCallback(
    () => onCloseSigningModal(),
    [onCloseSigningModal],
  );

  const connect = useCallback(
    (deviceId: string) => onConnect(deviceId),
    [onConnect],
  );

  const disconnect = useCallback(() => onDisconnect(), [onDisconnect]);

  const ensureDeviceReady = useCallback(
    (deviceId?: string) => onEnsureDeviceReady(deviceId),
    [onEnsureDeviceReady],
  );

  const setTargetWalletType = useCallback(
    (walletType: HardwareWalletType) => onSetTargetWalletType(walletType),
    [onSetTargetWalletType],
  );

  const showHardwareWalletError = useCallback(
    (error: unknown) => onShowHardwareWalletError(error),
    [onShowHardwareWalletError],
  );

  const clearError = useCallback(() => onClearError(), [onClearError]);

  const retry = useCallback(() => onRetry(), [onRetry]);

  const requestBluetoothPermissions = useCallback(
    () => onRequestBluetoothPermissions(),
    [onRequestBluetoothPermissions],
  );

  const selectDevice = useCallback(
    (selectedDev: DiscoveredDevice) => onSelectDevice(selectedDev),
    [onSelectDevice],
  );

  const rescan = useCallback(() => onRescan(), [onRescan]);

  const resetFlowState = useCallback(
    () => onResetFlowState(),
    [onResetFlowState],
  );

  const showAwaitingConfirmation = useCallback(
    (operationType: 'transaction' | 'message', onReject?: () => void) =>
      onShowAwaitingConfirmation(operationType, onReject),
    [onShowAwaitingConfirmation],
  );

  const hideAwaitingConfirmation = useCallback(
    () => onHideAwaitingConfirmation(),
    [onHideAwaitingConfirmation],
  );

  const value = useMemo<HardwareWalletActionsContextType>(
    () => ({
      openDeviceSelection,
      closeDeviceSelection,
      openSigningModal,
      closeSigningModal,
      connect,
      disconnect,
      ensureDeviceReady,
      setTargetWalletType,
      showHardwareWalletError,
      clearError,
      retry,
      requestBluetoothPermissions,
      selectDevice,
      rescan,
      resetFlowState,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
    }),
    [
      openDeviceSelection,
      closeDeviceSelection,
      openSigningModal,
      closeSigningModal,
      connect,
      disconnect,
      ensureDeviceReady,
      setTargetWalletType,
      showHardwareWalletError,
      clearError,
      retry,
      requestBluetoothPermissions,
      selectDevice,
      rescan,
      resetFlowState,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
    ],
  );

  return (
    <HardwareWalletActionsContext.Provider value={value}>
      {children}
    </HardwareWalletActionsContext.Provider>
  );
};

/**
 * Hook to access hardware wallet actions.
 * These callbacks are stable and won't cause re-renders.
 *
 * @example
 * const { ensureDeviceReady, showHardwareWalletError } = useHardwareWalletActions();
 *
 * const isReady = await ensureDeviceReady();
 * if (isReady) {
 *   try {
 *     await signTransaction();
 *   } catch (error) {
 *     if (!isUserCancellation(error)) {
 *       showHardwareWalletError(error);
 *     }
 *   }
 * }
 */
export const useHardwareWalletActions =
  (): HardwareWalletActionsContextType => {
    const context = useContext(HardwareWalletActionsContext);
    if (context === undefined) {
      throw new Error(
        'useHardwareWalletActions must be used within a HardwareWalletProvider',
      );
    }
    return context;
  };

export default HardwareWalletActionsContext;
