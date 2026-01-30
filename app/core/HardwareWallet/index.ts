/**
 * Hardware Wallet Module - Public API
 *
 * This module provides a unified interface for hardware wallet interactions
 * (Ledger, QR-based wallets). Only exports that are used by consumers outside
 * this module are exported here. Internal implementation details remain private.
 *
 * @example
 * ```typescript
 * import {
 *   HardwareWalletProvider,
 *   useHardwareWalletState,
 *   useHardwareWalletActions,
 *   isUserCancellation,
 * } from '@core/HardwareWallet';
 *
 * // In your component:
 * const { connectionState } = useHardwareWalletState();
 * const { ensureDeviceReady, showHardwareWalletError } = useHardwareWalletActions();
 *
 * // Usage example:
 * const isReady = await ensureDeviceReady();
 * if (isReady) {
 *   try {
 *     await signTransaction();
 *   } catch (error) {
 *     if (!isUserCancellation(error)) {
 *       showHardwareWalletError(error);
 *     }
 *   }
 * }
 * ```
 */

// =============================================================================
// PROVIDER - Wrap your app with this to enable hardware wallet features
// =============================================================================
export {
  HardwareWalletProvider,
  type HardwareWalletProviderProps,
} from './HardwareWalletProvider';

// =============================================================================
// HOOKS - For consuming hardware wallet state and actions
// =============================================================================
export { useHardwareWalletState, useHardwareWalletActions } from './contexts';

// =============================================================================
// TYPES - Core types needed by consumers
// =============================================================================
export { HardwareWalletType } from './helpers';

export { ConnectionStatus } from './connectionState';

// =============================================================================
// UTILITIES - Helper functions for error handling
// =============================================================================
export { isUserCancellation } from './errors';
