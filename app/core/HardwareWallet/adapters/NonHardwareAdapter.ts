import { HardwareWalletAdapter, HardwareWalletAdapterOptions } from '../types';

/**
 * NonHardwareAdapter - A passthrough adapter for non-hardware wallet accounts.
 *
 * This adapter implements the HardwareWalletAdapter interface with no-op behavior,
 * following the Null Object Pattern. This allows consumer code to call hardware
 * wallet methods without checking account types first.
 */
export class NonHardwareAdapter implements HardwareWalletAdapter {
  /**
   * Wallet type is null for non-hardware accounts
   */
  readonly walletType = null;

  /**
   * Options are stored for potential future use but not used in passthrough
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_options: HardwareWalletAdapterOptions) {
    // No initialization needed for passthrough adapter
  }

  /**
   * No-op - non-hardware accounts don't need to connect to devices
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async connect(_deviceId: string): Promise<void> {
    // No-op
  }

  /**
   * No-op - nothing to disconnect
   */
  async disconnect(): Promise<void> {
    // No-op
  }

  /**
   * Returns null - no device is connected for non-hardware accounts
   */
  getConnectedDeviceId(): string | null {
    return null;
  }

  /**
   * Always returns true - non-hardware accounts are always "ready"
   *
   * This is the key method that allows consumer code to call ensureDeviceReady()
   * without checking account types first.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async ensureDeviceReady(_deviceId: string): Promise<boolean> {
    return true;
  }

  /**
   * Always returns true - non-hardware accounts are always "connected"
   */
  isConnected(): boolean {
    return true;
  }

  /**
   * No-op - no state to reset
   */
  reset(): void {
    // No-op
  }

  /**
   * No-op - no flow to mark complete
   */
  markFlowComplete(): void {
    // No-op
  }

  /**
   * Always returns true - non-hardware accounts don't have flow state
   */
  isFlowComplete(): boolean {
    return true;
  }

  /**
   * No-op - no flow state to reset
   */
  resetFlowState(): void {
    // No-op
  }
}

/**
 * Type guard to check if an adapter is a NonHardwareAdapter
 */
export function isNonHardwareAdapter(
  adapter: HardwareWalletAdapter,
): adapter is NonHardwareAdapter {
  return adapter instanceof NonHardwareAdapter;
}

/**
 * Factory function to create a NonHardwareAdapter
 */
export function createNonHardwareAdapter(
  options: HardwareWalletAdapterOptions,
): NonHardwareAdapter {
  return new NonHardwareAdapter(options);
}
