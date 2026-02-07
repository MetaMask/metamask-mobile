import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { HardwareWalletType } from '../helpers';
import {
  HardwareWalletPermissions,
  BluetoothPermissionState,
  LocationPermissionState,
} from '../types';

/**
 * Configuration context type - contains values that rarely change.
 * Separated from state to avoid unnecessary re-renders.
 */
export interface HardwareWalletConfigContextType {
  /** Whether the current account is a hardware wallet account */
  isHardwareWalletAccount: boolean;
  /** The type of hardware wallet (Ledger, QR, etc.) */
  walletType: HardwareWalletType | null;
  /** Device ID of the associated hardware wallet */
  deviceId: string | null;
  /** Whether Bluetooth is enabled on the device */
  isBluetoothEnabled: boolean;
  /** Current permission states */
  permissions: HardwareWalletPermissions;
}

const defaultPermissions: HardwareWalletPermissions = {
  bluetooth: BluetoothPermissionState.Unknown,
  location: LocationPermissionState.Unknown,
  allGranted: false,
};

const defaultConfig: HardwareWalletConfigContextType = {
  isHardwareWalletAccount: false,
  walletType: null,
  deviceId: null,
  isBluetoothEnabled: false,
  permissions: defaultPermissions,
};

const HardwareWalletConfigContext =
  createContext<HardwareWalletConfigContextType>(defaultConfig);

HardwareWalletConfigContext.displayName = 'HardwareWalletConfigContext';

export interface HardwareWalletConfigProviderProps {
  children: ReactNode;
  /** Whether the current account is a hardware wallet account */
  isHardwareWalletAccount?: boolean;
  /** The type of hardware wallet */
  walletType?: HardwareWalletType | null;
  /** Device ID of the associated hardware wallet */
  deviceId?: string | null;
  /** Whether Bluetooth is enabled */
  isBluetoothEnabled?: boolean;
  /** Current permission states */
  permissions?: HardwareWalletPermissions;
}

/**
 * Provider for hardware wallet configuration.
 * This context contains values that change infrequently.
 */
export const HardwareWalletConfigProvider: React.FC<
  HardwareWalletConfigProviderProps
> = ({
  children,
  isHardwareWalletAccount = false,
  walletType = null,
  deviceId = null,
  isBluetoothEnabled = false,
  permissions = defaultPermissions,
}) => {
  const value = useMemo<HardwareWalletConfigContextType>(
    () => ({
      isHardwareWalletAccount,
      walletType,
      deviceId,
      isBluetoothEnabled,
      permissions,
    }),
    [
      isHardwareWalletAccount,
      walletType,
      deviceId,
      isBluetoothEnabled,
      permissions,
    ],
  );

  return (
    <HardwareWalletConfigContext.Provider value={value}>
      {children}
    </HardwareWalletConfigContext.Provider>
  );
};

/**
 * Hook to access hardware wallet configuration.
 * Use this for values that don't change often.
 *
 * @example
 * const { isHardwareWalletAccount, walletType } = useHardwareWalletConfig();
 */
export const useHardwareWalletConfig = (): HardwareWalletConfigContextType => {
  const context = useContext(HardwareWalletConfigContext);
  if (context === undefined) {
    throw new Error(
      'useHardwareWalletConfig must be used within a HardwareWalletProvider',
    );
  }
  return context;
};

export default HardwareWalletConfigContext;
