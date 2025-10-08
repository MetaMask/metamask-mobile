import { Metadata } from './metadata';

/**
 * Represents the static, persistable information that uniquely
 * identifies a dApp connection.
 */
export interface ConnectionInfo {
  id: string;
  metadata: Metadata;
  expiresAt: number;
}
