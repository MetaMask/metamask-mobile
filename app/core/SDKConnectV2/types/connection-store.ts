import { Connection } from './connection';

/**
 * Defines the contract for the persistence layer that will act as the
 * single source of truth for all SDKConnectV2 connections.
 *
 * This interface abstracts the underlying storage mechanism, allowing the
 * core services to remain unaware of implementation details like AsyncStorage
 * or Secure Keychain storage.
 */
export interface IConnectionStore {
  /**
   * Persists a new or updated connection object.
   * @param connection The connection object to save.
   * @returns A promise that resolves when the save operation is complete.
   */
  save(connection: Connection): Promise<void>;

  /**
   * Retrieves a single connection by its unique ID.
   * @param id The ID of the connection to retrieve.
   * @returns A promise that resolves with the Connection object, or null if not found.
   */
  get(id: string): Promise<Connection | null>;

  /**
   * Retrieves a list of all persisted connections.
   * @returns A promise that resolves with an array of all Connection objects.
   */
  list(): Promise<Connection[]>;

  /**
   * Deletes a connection from storage by its unique ID.
   * @param id The ID of the connection to delete.
   * @returns A promise that resolves when the delete operation is complete.
   */
  delete(id: string): Promise<void>;
}
