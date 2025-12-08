/**
 * useHardwareWallet Hook
 *
 * Hook to access the HardwareWalletContext.
 */

import { useContext } from 'react';
import { HardwareWalletContext } from './HardwareWalletContext';
import { HardwareWalletContextType } from '../types';

/**
 * Hook to access hardware wallet context
 * @throws Error if used outside of HardwareWalletProvider
 */
export const useHardwareWallet = (): HardwareWalletContextType => {
  const context = useContext(HardwareWalletContext);

  if (!context) {
    throw new Error(
      'useHardwareWallet must be used within a HardwareWalletProvider',
    );
  }

  return context;
};

export default useHardwareWallet;

