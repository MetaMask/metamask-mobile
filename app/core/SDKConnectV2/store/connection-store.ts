import { IConnectionStore } from '../types/connection-store';
import { PersistedConnection } from '../types/persisted-connection';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * An implementation of IConnectionStore to persist
 * the metadata of established dApp connections.
 */
export class ConnectionStore implements IConnectionStore {
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private getKey(id: string): string {
    return `${this.prefix}/${id}`;
  }

  async save(connection: PersistedConnection): Promise<void> {
    await AsyncStorage.setItem(
      this.getKey(connection.id),
      JSON.stringify(connection),
    );
  }

  async get(id: string): Promise<PersistedConnection | null> {
    const json = await AsyncStorage.getItem(this.getKey(id));
    return json ? (JSON.parse(json) as PersistedConnection) : null;
  }

  async list(): Promise<PersistedConnection[]> {
    const keys = await AsyncStorage.getAllKeys();
    const connectionKeys = keys.filter((key) => key.startsWith(this.prefix));

    if (connectionKeys.length === 0) {
      return [];
    }

    const items = await AsyncStorage.multiGet(connectionKeys);
    return items.reduce((acc, item) => {
      // item is a [key, value] tuple
      if (item[1]) {
        acc.push(JSON.parse(item[1]) as PersistedConnection);
      }
      return acc;
    }, [] as PersistedConnection[]);
  }

  async delete(id: string): Promise<void> {
    await AsyncStorage.removeItem(this.getKey(id));
  }
}
