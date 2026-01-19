/**
 * Wallet Provider Registry
 *
 * Manages registration and retrieval of wallet provider adapters.
 * Automatically selects the appropriate adapter based on platform.
 */

import { Platform } from 'react-native';
import {
  WalletType,
  ProvisioningError,
  ProvisioningErrorCode,
} from '../../types';
import { PLATFORM_WALLET_MAP } from '../../constants';
import { IWalletProviderAdapter } from './IWalletProviderAdapter';

/**
 * Registry for managing wallet provider adapters.
 *
 * This singleton class maintains a map of wallet provider adapters
 * and provides methods to register, retrieve, and manage them.
 *
 * Usage:
 * ```typescript
 * // Register adapters
 * WalletProviderRegistry.getInstance().register('google_wallet', new GoogleWalletAdapter());
 *
 * // Get the active adapter for current platform
 * const adapter = WalletProviderRegistry.getInstance().getActiveAdapter();
 * ```
 */
export class WalletProviderRegistry {
  private static instance: WalletProviderRegistry;
  private adapters: Map<WalletType, IWalletProviderAdapter>;

  private constructor() {
    this.adapters = new Map();
  }

  /**
   * Get the singleton instance of the registry
   */
  static getInstance(): WalletProviderRegistry {
    if (!WalletProviderRegistry.instance) {
      WalletProviderRegistry.instance = new WalletProviderRegistry();
    }
    return WalletProviderRegistry.instance;
  }

  /**
   * Register a wallet provider adapter
   *
   * @param walletType - The wallet type identifier
   * @param adapter - The adapter instance to register
   * @throws Error if an adapter with the same type is already registered
   */
  register(walletType: WalletType, adapter: IWalletProviderAdapter): void {
    if (this.adapters.has(walletType)) {
      throw new Error(
        `Wallet provider adapter '${walletType}' is already registered`,
      );
    }
    this.adapters.set(walletType, adapter);
  }

  /**
   * Register or replace a wallet provider adapter
   *
   * Unlike register(), this will replace an existing adapter if one exists.
   *
   * @param walletType - The wallet type identifier
   * @param adapter - The adapter instance to register
   */
  registerOrReplace(
    walletType: WalletType,
    adapter: IWalletProviderAdapter,
  ): void {
    this.adapters.set(walletType, adapter);
  }

  /**
   * Unregister a wallet provider adapter
   *
   * @param walletType - The wallet type to unregister
   * @returns true if the adapter was removed, false if it wasn't registered
   */
  unregister(walletType: WalletType): boolean {
    return this.adapters.delete(walletType);
  }

  /**
   * Get a wallet provider adapter by type
   *
   * @param walletType - The wallet type to retrieve
   * @returns The adapter instance
   * @throws ProvisioningError if the adapter is not found
   */
  getAdapter(walletType: WalletType): IWalletProviderAdapter {
    const adapter = this.adapters.get(walletType);
    if (!adapter) {
      throw new ProvisioningError(
        ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        `Wallet provider adapter '${walletType}' is not registered`,
      );
    }
    return adapter;
  }

  /**
   * Get a wallet provider adapter, returning undefined if not found
   *
   * @param walletType - The wallet type to retrieve
   * @returns The adapter instance or undefined
   */
  getAdapterOrUndefined(
    walletType: WalletType,
  ): IWalletProviderAdapter | undefined {
    return this.adapters.get(walletType);
  }

  /**
   * Get the wallet type for the current platform
   *
   * @returns The wallet type for the current platform
   * @throws ProvisioningError if the platform is not supported
   */
  getWalletTypeForPlatform(): WalletType {
    const platform = Platform.OS;

    if (platform !== 'android') {
      throw new ProvisioningError(
        ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
        `Platform '${platform}' is not supported`,
      );
    }

    const walletType = PLATFORM_WALLET_MAP[platform];
    if (!walletType) {
      throw new ProvisioningError(
        ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
        `No wallet provider configured for platform '${platform}'`,
      );
    }

    return walletType;
  }

  /**
   * Get the adapter for the current platform
   *
   * This is the primary method for getting the appropriate adapter.
   *
   * @returns The adapter for the current platform
   * @throws ProvisioningError if no adapter is registered for the platform
   */
  getActiveAdapter(): IWalletProviderAdapter {
    const walletType = this.getWalletTypeForPlatform();
    return this.getAdapter(walletType);
  }

  /**
   * Get the adapter for the current platform, returning undefined if not found
   *
   * @returns The adapter for the current platform, or undefined
   */
  getActiveAdapterOrUndefined(): IWalletProviderAdapter | undefined {
    try {
      const walletType = this.getWalletTypeForPlatform();
      return this.adapters.get(walletType);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if the current platform has a registered adapter
   *
   * @returns true if an adapter is registered for the current platform
   */
  hasActiveAdapter(): boolean {
    try {
      const walletType = this.getWalletTypeForPlatform();
      return this.adapters.has(walletType);
    } catch {
      return false;
    }
  }

  /**
   * Check if a wallet type is registered
   *
   * @param walletType - The wallet type to check
   * @returns true if the wallet type is registered
   */
  hasAdapter(walletType: WalletType): boolean {
    return this.adapters.has(walletType);
  }

  /**
   * Get all registered wallet types
   *
   * @returns Array of registered wallet types
   */
  getRegisteredWalletTypes(): WalletType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get the current platform
   *
   * @returns 'android'
   * @throws ProvisioningError if platform is not supported
   */
  getCurrentPlatform(): 'android' {
    const platform = Platform.OS;
    if (platform !== 'android') {
      throw new ProvisioningError(
        ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
        `Platform '${platform}' is not supported`,
      );
    }
    return platform;
  }

  /**
   * Clear all registered adapters
   *
   * Primarily used for testing purposes.
   */
  clear(): void {
    this.adapters.clear();
  }

  /**
   * Reset the singleton instance
   *
   * Primarily used for testing purposes.
   */
  static resetInstance(): void {
    WalletProviderRegistry.instance = new WalletProviderRegistry();
  }
}
