import { IKVStore } from '@metamask/mobile-wallet-protocol-core';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * An implementation of the IKVStore interface that uses AsyncStorage
 * for persistent key-value storage. A prefix is used to namespace keys
 * to prevent collisions between different instances.
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
    return AsyncStorage.getItem(this.getKey(key));
  }

  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(this.getKey(key), value);
  }

  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(this.getKey(key));
  }
}
