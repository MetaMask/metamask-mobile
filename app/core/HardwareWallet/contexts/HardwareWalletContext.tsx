import React, { createContext, useContext, ReactNode } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
} from '@metamask/hw-wallet-sdk';
import { DiscoveredDevice, HardwareWalletActions } from '../types';

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
 * Single hardware wallet context value: config, state, and actions.
 */
export interface HardwareWalletContextValue extends HardwareWalletActions {
  /** The type of hardware wallet (Ledger, QR, etc.) */
  walletType: HardwareWalletType | null;
  /** Device ID of the associated hardware wallet */
  deviceId: string | null;
  /** Current connection state */
  connectionState: HardwareWalletConnectionState;
  /** Device selection state for BLE scanning */
  deviceSelection: DeviceSelectionState;
}

const HardwareWalletContext = createContext<
  HardwareWalletContextValue | undefined
>(undefined);

HardwareWalletContext.displayName = 'HardwareWalletContext';

export interface HardwareWalletContextProviderProps {
  children: ReactNode;
  value: HardwareWalletContextValue;
}

/**
 * Single provider for hardware wallet context.
 * Receives the combined value from HardwareWalletProvider.
 */
export const HardwareWalletContextProvider: React.FC<
  HardwareWalletContextProviderProps
> = ({ children, value }) => (
  <HardwareWalletContext.Provider value={value}>
    {children}
  </HardwareWalletContext.Provider>
);

/**
 * Hook to access the full hardware wallet context.
 *
 * @example
 * const { connectionState, ensureDeviceReady, walletType } = useHardwareWallet();
 */
export const useHardwareWallet = (): HardwareWalletContextValue => {
  const context = useContext(HardwareWalletContext);
  if (context === undefined) {
    throw new Error(
      'useHardwareWallet must be used within a HardwareWalletContextProvider',
    );
  }
  return context;
};

export default HardwareWalletContext;
