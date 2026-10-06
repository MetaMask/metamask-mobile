import type { CollectorCryptCard, PackOperation } from './types';
import { pruneOperationsForPersistence } from './utils/operations';

// State-bearing shapes must be type aliases to satisfy `Json`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectorCryptState = {
  /** Keyed by Solana address, then memo. */
  operations: Record<string, Record<string, PackOperation>>;
  /** Keyed by Solana address, then mint. */
  cards: Record<string, Record<string, CollectorCryptCard>>;
};

/**
 * Empty Collector Crypt state.
 *
 * @returns A new default state.
 */
export const getDefaultCollectorCryptState = (): CollectorCryptState => ({
  operations: {},
  cards: {},
});

/**
 * Keeps cards and the operations needed after a restart.
 *
 * @param state - Current provider state.
 * @param now - Current timestamp.
 * @returns Provider state ready for persistence.
 */
export const getPersistedCollectorCryptState = (
  state: CollectorCryptState,
  now: number,
): CollectorCryptState => ({
  operations: pruneOperationsForPersistence(state.operations, now),
  cards: state.cards,
});
