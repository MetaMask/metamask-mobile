import { createContext, useContext } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
} from '@metamask/hw-wallet-sdk';
import { DeviceSelectionState } from '../types';

export interface HardwareWalletContextValue {
  /** The type of hardware wallet (Ledger, QR, etc.) */
  walletType: HardwareWalletType | null;
  /** Device ID of the associated hardware wallet */
  deviceId: string | null;
  /** Current connection state */
  connectionState: HardwareWalletConnectionState;
  /** Device selection state for BLE scanning */
  deviceSelection: DeviceSelectionState;
  /**
   * Ensure the device is ready for any kind of operation. BLOCKING: shows bottom sheet if needed.
   * Wallet type from current account; for "Add Hardware Wallet" flows, use setTargetWalletType() first.
   * @param deviceId - Optional. If not provided, shows device selection for hardware wallets.
   * @returns true if device is ready, false if user cancelled
   */
  ensureDeviceReady: (deviceId?: string) => Promise<boolean>;
  /** Set the target wallet type for "Add Hardware Wallet" flows (no account yet). */
  setTargetWalletType: (walletType: HardwareWalletType) => void;
  /** Show a hardware wallet error in the bottom sheet. Use after ensureDeviceReady succeeds. */
  showHardwareWalletError: (error: unknown) => void;
  /** Show "awaiting confirmation" bottom sheet. */
  showAwaitingConfirmation: (
    operationType: 'transaction' | 'message',
    onReject?: () => void,
  ) => void;
  /** Hide the "awaiting confirmation" bottom sheet. */
  hideAwaitingConfirmation: () => void;
}

const HardwareWalletContext = createContext<
  HardwareWalletContextValue | undefined
>(undefined);

HardwareWalletContext.displayName = 'HardwareWalletContext';

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
