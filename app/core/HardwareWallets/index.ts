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
  // QR Hardware Wallet Types
  QRSigningStatus,
  QRSigningState,
  CameraPermissionStatus,
  QRHardwareErrorCode,
  // QR Type guards
  isQRIdle,
  isQRAwaitingScan,
  isQRScanning,
  isQRProcessing,
  isQRCompleted,
  isQRError,
  isQRNeedsCameraPermission,
  type QRScanRequestType,
  type QRHardwareError,
  type QRHardwareAdapterOptions,
  type QRHardwareContextType,
  type QRHardwareContextIdle,
  type QRHardwareContextSigning,
  type QRHardwareContextError,
} from './types';

// Errors
export {
  createHardwareWalletError,
  mapLedgerErrorCode,
  parseLedgerError,
  isRetryableError,
  requiresSettings,
  // QR Error utilities
  createQRHardwareError,
  parseQRError,
  isQRRetryableError,
  isQRCameraPermissionError,
  isQRScanCancelledError,
} from './errors';

// Context
export {
  HardwareWalletContext,
  HardwareWalletProvider,
  useHardwareWallet,
} from './context';

// Adapters
export { createAdapter, LedgerAdapter, QRAdapter } from './adapters';
export { AppSwitchRequiredError } from './adapters/LedgerAdapter';

// Components
export { HardwareWalletErrorModal } from './components';
