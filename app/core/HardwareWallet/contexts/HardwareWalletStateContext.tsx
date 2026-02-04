import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  HardwareWalletConnectionState,
  ConnectionStatus,
  ConnectionState,
} from '../connectionState';
import { DiscoveredDevice } from '../types';

/**
 * Device selection state for device discovery (BLE, camera, etc.)
 */
export interface DeviceSelectionState {
  /** List of discovered devices */
  devices: DiscoveredDevice[];
  /** Currently selected device (before connection) */
  selectedDevice: DiscoveredDevice | null;
  /** Whether device scanning is in progress */
  isScanning: boolean;
  /** Error during device scanning */
  scanError: Error | null;
}

/**
 * State context type - contains values that change frequently.
 * Separated from config/actions to minimize re-renders.
 */
export interface HardwareWalletStateContextType {
  /** Current connection state (discriminated union) */
  connectionState: HardwareWalletConnectionState;
  /** Device selection state for BLE scanning */
  deviceSelection: DeviceSelectionState;
}

const defaultDeviceSelection: DeviceSelectionState = {
  devices: [],
  selectedDevice: null,
  isScanning: false,
  scanError: null,
};

const defaultState: HardwareWalletStateContextType = {
  connectionState: ConnectionState.disconnected(),
  deviceSelection: defaultDeviceSelection,
};

const HardwareWalletStateContext =
  createContext<HardwareWalletStateContextType>(defaultState);

HardwareWalletStateContext.displayName = 'HardwareWalletStateContext';

export interface HardwareWalletStateProviderProps {
  children: ReactNode;
  /** Current connection state */
  connectionState?: HardwareWalletConnectionState;
  /** Device selection state for BLE scanning */
  deviceSelection?: DeviceSelectionState;
}

/**
 * Provider for hardware wallet state.
 * This context contains values that change frequently during operations.
 */
export const HardwareWalletStateProvider: React.FC<
  HardwareWalletStateProviderProps
> = ({
  children,
  connectionState = ConnectionState.disconnected(),
  deviceSelection = defaultDeviceSelection,
}) => {
  const value = useMemo<HardwareWalletStateContextType>(
    () => ({ connectionState, deviceSelection }),
    [connectionState, deviceSelection],
  );

  return (
    <HardwareWalletStateContext.Provider value={value}>
      {children}
    </HardwareWalletStateContext.Provider>
  );
};

/**
 * Hook to access hardware wallet connection state.
 * Components using this will re-render when connection state changes.
 *
 * @example
 * const { connectionState } = useHardwareWalletState();
 * if (connectionState.status === ConnectionStatus.AwaitingConfirmation) {
 *   // Show confirmation UI
 * }
 */
export const useHardwareWalletState = (): HardwareWalletStateContextType => {
  const context = useContext(HardwareWalletStateContext);
  if (context === undefined) {
    throw new Error(
      'useHardwareWalletState must be used within a HardwareWalletProvider',
    );
  }
  return context;
};

/**
 * Convenience hook to get just the connection status
 */
export const useConnectionStatus = (): ConnectionStatus => {
  const { connectionState } = useHardwareWalletState();
  return connectionState.status;
};

/**
 * Convenience hook to check if device is connected
 */
export const useIsDeviceConnected = (): boolean => {
  const status = useConnectionStatus();
  return (
    status === ConnectionStatus.Connected ||
    status === ConnectionStatus.AwaitingApp ||
    status === ConnectionStatus.AwaitingConfirmation
  );
};

/**
 * Convenience hook to check if an operation is in progress
 */
export const useIsOperationInProgress = (): boolean => {
  const status = useConnectionStatus();
  return (
    status === ConnectionStatus.Connecting ||
    status === ConnectionStatus.AwaitingApp ||
    status === ConnectionStatus.AwaitingConfirmation
  );
};

export default HardwareWalletStateContext;
