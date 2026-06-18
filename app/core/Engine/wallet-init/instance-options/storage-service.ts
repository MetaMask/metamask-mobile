import type { WalletOptions } from '@metamask/wallet';
import { mobileStorageAdapter } from '../../utils/storage-service-utils';

type StorageServiceInstanceOptions =
  WalletOptions['instanceOptions']['storageService'];

export function getStorageServiceInstanceOptions(): StorageServiceInstanceOptions {
  return {
    storage: mobileStorageAdapter,
  };
}
