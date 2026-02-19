import { createContext, useContext } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
} from '@metamask/hw-wallet-sdk';
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
 * Single hardware wallet context value: config, state, and actions.
 */
export interface HardwareWalletContextValue {
  /** The type of hardware wallet (Ledger, QR, etc.) */
  walletType: HardwareWalletType | null;
  /** Device ID of the associated hardware wallet */
  deviceId: string | null;
  /** Current connection state (read-only for observing status) */
  connectionState: HardwareWalletConnectionState;
  /** Device selection state for BLE scanning (read-only) */
  deviceSelection: DeviceSelectionState;
  /**
   * Ensure the device is ready for signing operations. BLOCKING: shows bottom sheet if needed.
   * Wallet type from current account; for "Add Hardware Wallet" use setTargetWalletType() first.
   * @param deviceId - Optional. If not provided, shows device selection for hardware accounts.
   * @returns true if device is ready, false if user cancelled
   */
  ensureDeviceReady: (deviceId?: string) => Promise<boolean>;
  /** Set the target wallet type for "Add Hardware Wallet" flows (no account yet). */
  setTargetWalletType: (walletType: HardwareWalletType) => void;
  /** Show a hardware wallet error in the bottom sheet. Use after ensureDeviceReady succeeds. */
  showHardwareWalletError: (error: unknown) => void;
  /** Show "awaiting confirmation" bottom sheet. Call after ensureDeviceReady returns true. */
  showAwaitingConfirmation: (
    operationType: 'transaction' | 'message',
    onReject?: () => void,
  ) => void;
  /** Hide the "awaiting confirmation" bottom sheet. Call after signing completes. */
  hideAwaitingConfirmation: () => void;
}

const HardwareWalletContext = createContext<
  HardwareWalletContextValue | undefined
>(undefined);

HardwareWalletContext.displayName = 'HardwareWalletContext';

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
      'useHardwareWallet must be used within a HardwareWalletProvider',
    );
  }
  return context;
};

export default HardwareWalletContext;
