import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';

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
}

const defaultConfig: HardwareWalletConfigContextType = {
  isHardwareWalletAccount: false,
  walletType: null,
  deviceId: null,
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
}) => {
  const value = useMemo<HardwareWalletConfigContextType>(
    () => ({
      isHardwareWalletAccount,
      walletType,
      deviceId,
    }),
    [isHardwareWalletAccount, walletType, deviceId],
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
