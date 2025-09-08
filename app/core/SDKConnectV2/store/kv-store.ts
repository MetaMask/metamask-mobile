import { IKVStore } from '@metamask/mobile-wallet-protocol-core';
import StorageWrapper from '../../../store/storage-wrapper';

/**
 * An implementation of the IKVStore interface that uses StorageWrapper
 * for persistent key-value storage.
 */
export class KVStore implements IKVStore {
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return this.prefix + key;
  }

  async get(key: string): Promise<string | null> {
    return StorageWrapper.getItem(this.getKey(key));
  }

  async set(key: string, value: string): Promise<void> {
    await StorageWrapper.setItem(this.getKey(key), value);
  }

  async delete(key: string): Promise<void> {
    await StorageWrapper.removeItem(this.getKey(key));
  }
}
