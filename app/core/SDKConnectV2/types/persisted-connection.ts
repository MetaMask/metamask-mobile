import { Metadata } from './metadata';

/**
 * A connection that has been persisted to storage.
 */
export interface PersistedConnection {
  id: string;
  metadata: Metadata;
}
