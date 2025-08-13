import { Connection } from '../types/connection';
import { IConnectionStore } from './IConnectionStore';

/**
 * Placeholder implementation of the IConnectionStore.
 * For Milestone 1, this class provides no-op implementations of the
 * required storage methods to satisfy the dependency requirements
 * of the ConnectionRegistry.
 */
export class ConnectionStore implements IConnectionStore {
  save(connection: Connection): Promise<void> {
    console.warn(
      '[SDKConnectV2] ConnectionStore.save called but is not yet implemented.',
    );
    return Promise.resolve();
  }

  get(id: string): Promise<Connection | null> {
    console.warn(
      '[SDKConnectV2] ConnectionStore.get called but is not yet implemented.',
    );
    return Promise.resolve(null);
  }

  list(): Promise<Connection[]> {
    console.warn(
      '[SDKConnectV2] ConnectionStore.list called but is not yet implemented.',
    );
    return Promise.resolve([]);
  }

  delete(id: string): Promise<void> {
    console.warn(
      '[SDKConnectV2] ConnectionStore.delete called but is not yet implemented.',
    );
    return Promise.resolve();
  }
}
