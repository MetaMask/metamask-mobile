import type { WalletOptions } from '@metamask/wallet';
import { mobileStorageAdapter } from '../../utils/storage-service-utils';

type StorageServiceInstanceOptions =
  WalletOptions['instanceOptions']['storageService'];

/**
 * Mobile supplies its own storage adapter so the wallet-owned StorageService
 * persists through the app's storage layer.
 *
 * @returns The mobile StorageService instance options.
 */
export function getStorageServiceInstanceOptions(): StorageServiceInstanceOptions {
  return {
    storage: mobileStorageAdapter,
  };
}
