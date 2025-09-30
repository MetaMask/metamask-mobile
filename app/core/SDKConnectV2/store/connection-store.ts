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

  private extractId(key: string): string {
    return key.replace(this.prefix + '/', '');
  }

  /**
   * Processes a raw JSON string from storage. It parses, validates expiration,
   * and cleans up the record if it's invalid or expired.
   * @param id - The connection ID.
   * @param json - The raw JSON string from storage.
   * @returns The valid ConnectionInfo object or null if invalid/expired.
   */
  private async toConnectionInfo(
    id: string,
    json: string | null,
  ): Promise<ConnectionInfo | null> {
    if (!json) return null;

    try {
      const connectionInfo = JSON.parse(json) as ConnectionInfo;

      // Expiration check
      if (connectionInfo.expiresAt < Date.now()) {
        await this.delete(id);
        return null;
      }

      return connectionInfo;
    } catch (error) {
      // Corrupted data, clean it up
      await this.delete(id);
      return null;
    }
  }

  async save(connection: ConnectionInfo): Promise<void> {
    await StorageWrapper.setItem(
      this.getKey(connection.id),
      JSON.stringify(connection),
    );
  }

  async get(id: string): Promise<ConnectionInfo | null> {
    const json = await StorageWrapper.getItem(this.getKey(id));
    return this.toConnectionInfo(id, json);
  }

  async list(): Promise<ConnectionInfo[]> {
    const keys = await AsyncStorage.getAllKeys();
    const connectionKeys = keys.filter((key) => key.startsWith(this.prefix));

    if (connectionKeys.length === 0) {
      return [];
    }

    const items = await AsyncStorage.multiGet(connectionKeys);

    const connInfos = await Promise.all(
      items.map(([key, json]) =>
        this.toConnectionInfo(this.extractId(key), json),
      ),
    );

    return connInfos.filter((conn): conn is ConnectionInfo => conn !== null);
  }

  async delete(id: string): Promise<void> {
    await StorageWrapper.removeItem(this.getKey(id));
  }
}
