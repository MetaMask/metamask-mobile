/* eslint-disable no-empty-function, @typescript-eslint/no-unused-vars, @typescript-eslint/no-useless-constructor */

import {
  DiscoveredDevice,
  HardwareWalletAdapter,
  HardwareWalletAdapterOptions,
} from '../types';

/**
 * Passthrough adapter for non-hardware wallet accounts.
 *
 * This adapter implements the HardwareWalletAdapter interface with no-op behavior.
 * This allows consumer code to call hardware wallet methods without checking account types first.
 */
export class NonHardwareAdapter implements HardwareWalletAdapter {
  readonly walletType = null;

  readonly requiresDeviceDiscovery = false;

  /**
   * Constructor accepts options for consistency with other adapters,
   * but doesn't use them (passthrough adapter has no state)
   */

  constructor(_options?: HardwareWalletAdapterOptions) {}

  async connect(_deviceId: string): Promise<void> {}

  async disconnect(): Promise<void> {}

  getConnectedDeviceId(): string | null {
    return null;
  }

  async ensureDeviceReady(_deviceId: string): Promise<boolean> {
    return true;
  }

  isConnected(): boolean {
    return true;
  }

  reset(): void {}

  markFlowComplete(): void {}

  isFlowComplete(): boolean {
    return true;
  }

  resetFlowState(): void {}

  startDeviceDiscovery(
    _onDeviceFound: (device: DiscoveredDevice) => void,
    _onError: (error: Error) => void,
  ): () => void {
    return () => {};
  }

  stopDeviceDiscovery(): void {}

  async isTransportAvailable(): Promise<boolean> {
    return true;
  }

  onTransportStateChange(
    _callback: (isAvailable: boolean) => void,
  ): () => void {
    _callback(true);
    return () => {};
  }

  getRequiredAppName(): string | undefined {
    return undefined;
  }
}
