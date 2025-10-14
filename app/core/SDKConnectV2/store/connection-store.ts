import { IConnectionStore } from '../types/connection-store';
import { ConnectionInfo } from '../types/connection-info';
import StorageWrapper from '../../../store/storage-wrapper';
import logger from '../services/logger';

/**
 * An implementation of IConnectionStore to persist
 * the metadata of established dApp connections.
 * This implementation maintains an index of all connection IDs
 * in a separate key, allowing listing without scanning all storage keys.
 */
export class ConnectionStore implements IConnectionStore {
  private readonly prefix: string;
  private readonly indexKey: string;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.indexKey = `${prefix}_index`;
  }

  private getKey(id: string): string {
    return `${this.prefix}/${id}`;
  }

  /**
   * Safely reads the connection index, returning empty array on any error.
   */
  private async getIndex(): Promise<string[]> {
    try {
      const indexJson = await StorageWrapper.getItem(this.indexKey);
      if (!indexJson) return [];
      return JSON.parse(indexJson) as string[];
    } catch (error) {
      logger.error('Failed to read index', error);
      return [];
    }
  }

  /**
   * Adds a connection ID to the index if not already present.
   * Logs errors but does not throw - index can be recovered.
   */
  private async addToIndex(id: string): Promise<void> {
    try {
      const index = await this.getIndex();
      if (!index.includes(id)) {
        index.push(id);
        await StorageWrapper.setItem(this.indexKey, JSON.stringify(index));
      }
    } catch (error) {
      logger.error('Failed to add to index', error);
    }
  }

  /**
   * Removes a connection ID from the index.
   * Logs errors but does not throw - phantom entries will be filtered by list().
   */
  private async removeFromIndex(id: string): Promise<void> {
    try {
      const index = await this.getIndex();
      const newIndex = index.filter((existingId) => existingId !== id);
      await StorageWrapper.setItem(this.indexKey, JSON.stringify(newIndex));
    } catch (error) {
      logger.error('Failed to remove from index', error);
    }
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
        await this.delete(id)
          .then(() => logger.debug('Deleted expired connection', id))
          .catch(() =>
            logger.error('Failed to delete expired connection:', id),
          );
        return null;
      }

      return connectionInfo;
    } catch {
      // Corrupted data, clean it up
      await this.delete(id)
        .then(() => logger.debug('Deleted corrupted connection', id))
        .catch(() =>
          logger.error('Failed to delete corrupted connection:', id),
        );
      return null;
    }
  }

  async save(connection: ConnectionInfo): Promise<void> {
    await StorageWrapper.setItem(
      this.getKey(connection.id),
      JSON.stringify(connection),
    );

    await this.addToIndex(connection.id);
  }

  async get(id: string): Promise<ConnectionInfo | null> {
    const json = await StorageWrapper.getItem(this.getKey(id));
    return this.toConnectionInfo(id, json);
  }

  async list(): Promise<ConnectionInfo[]> {
    const connectionIds = await this.getIndex();
    if (connectionIds.length === 0) return [];

    const promises = connectionIds.map((id) => this.get(id));
    const results = await Promise.all(promises);

    return results.filter((conn): conn is ConnectionInfo => conn !== null);
  }

  async delete(id: string): Promise<void> {
    await StorageWrapper.removeItem(this.getKey(id));
    await this.removeFromIndex(id);
  }
}
