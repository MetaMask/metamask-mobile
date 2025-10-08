import { IConnectionStore } from '../types/connection-store';
import { ConnectionInfo } from '../types/connection-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageWrapper from '../../../store/storage-wrapper';

/**
 * An implementation of IConnectionStore to persist
 * the metadata of established dApp connections.
 * Uses StorageWrapper for better performance, with fallback to AsyncStorage
 * for batch operations (getAllKeys, multiGet) that aren't available in StorageWrapper.
 */
export class ConnectionStore implements IConnectionStore {
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private getKey(id: string): string {
    return `${this.prefix}/${id}`;
  }

  async save(connection: ConnectionInfo): Promise<void> {
    await StorageWrapper.setItem(
      this.getKey(connection.id),
      JSON.stringify(connection),
    );
  }

  async get(id: string): Promise<ConnectionInfo | null> {
    const json = await StorageWrapper.getItem(this.getKey(id));
    return json ? (JSON.parse(json) as ConnectionInfo) : null;
  }

  async list(): Promise<ConnectionInfo[]> {
    const keys = await AsyncStorage.getAllKeys();
    const connectionKeys = keys.filter((key) => key.startsWith(this.prefix));

    if (connectionKeys.length === 0) {
      return [];
    }

    const items = await AsyncStorage.multiGet(connectionKeys);
    return items.reduce((acc, item) => {
      // item is a [key, value] tuple
      if (item[1]) {
        acc.push(JSON.parse(item[1]) as ConnectionInfo);
      }
      return acc;
    }, [] as ConnectionInfo[]);
  }

  async delete(id: string): Promise<void> {
    await StorageWrapper.removeItem(this.getKey(id));
  }
}
