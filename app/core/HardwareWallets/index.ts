/**
 * Hardware Wallets Module
 *
 * Centralized module for hardware wallet support (Ledger, Trezor, QR).
 *
 * @example
 * ```tsx
 * import {
 *   HardwareWalletProvider,
 *   useHardwareWallet,
 *   HardwareWalletType,
 * } from '@core/HardwareWallets';
 *
 * // Wrap your app with the provider
 * <HardwareWalletProvider>
 *   <App />
 * </HardwareWalletProvider>
 *
 * // Use the hook in components
 * const { connect, connectionState, error } = useHardwareWallet();
 *
 * const handleConnect = () => {
 *   await connect(HardwareWalletType.LEDGER, deviceId);
 * };
 * ```
 */

// Types
export {
  HardwareWalletType,
  HardwareWalletErrorCode,
  ConnectionStatus,
  ConnectionState,
  // Type guards
  isDisconnected,
  isConnecting,
  isConnected,
  isAwaitingApp,
  isAwaitingConfirmation,
  isErrorState,
  // Derived boolean helpers
  isDeviceLocked,
  isPairingRemoved,
  isWrongApp,
  isAppLaunchConfirmationNeeded,
  type HardwareWalletConnectionState,
  type AwaitingAppReason,
  type ErrorReason,
  type HardwareWalletError,
  type HardwareWalletAccount,
  type HardwareWalletAdapter,
  type HardwareWalletAdapterOptions,
  type HardwareWalletContextType,
} from './types';

// Errors
export {
  createHardwareWalletError,
  mapLedgerErrorCode,
  parseLedgerError,
  isRetryableError,
  requiresSettings,
} from './errors';

// Context
export {
  HardwareWalletContext,
  HardwareWalletProvider,
  useHardwareWallet,
} from './context';

// Adapters
export { createAdapter, LedgerAdapter } from './adapters';
export { AppSwitchRequiredError } from './adapters/LedgerAdapter';

// Components
export { HardwareWalletErrorModal } from './components';

