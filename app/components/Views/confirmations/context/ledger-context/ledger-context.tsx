/**
 * @deprecated Use HardwareWalletSigningContext instead
 * This file is kept for backward compatibility and re-exports the generic context
 */
import { HardwareWalletType } from '../../../../../core/HardwareWallets/types';

export {
  HardwareWalletSigningContextProvider as LedgerContextProvider,
  useHardwareWalletSigningContext,
  type HardwareWalletSigningContextType,
} from '../hardware-wallet-signing-context';

// Re-export for backward compatibility
import {
  HardwareWalletSigningContext,
  useHardwareWalletSigningContext,
} from '../hardware-wallet-signing-context';

export const LedgerContext = HardwareWalletSigningContext;

export const useLedgerContext = () => {
  const context = useHardwareWalletSigningContext();
  // Return a compatible interface for existing LedgerContext consumers
  return {
    deviceId: context.deviceId,
    isLedgerAccount: context.walletType === HardwareWalletType.LEDGER,
    ledgerSigningInProgress: context.isSigningInProgress,
    openLedgerSignModal: context.openSignModal,
    closeLedgerSignModal: context.closeSignModal,
  };
};
