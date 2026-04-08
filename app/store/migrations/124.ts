import { isObject, hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';

export const migrationVersion = 124;

/**
 * Migration 124: Remove stale cache data and priority token fields from the
 * Card Redux slice. Data fetching has been migrated to React Query.
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (!hasProperty(state, 'card') || !isObject(state.card)) {
    return state;
  }

  const card = state.card as Record<string, unknown>;

  delete card.cache;
  delete card.priorityTokensByAddress;
  delete card.lastFetchedByAddress;
  delete card.authenticatedPriorityToken;
  delete card.authenticatedPriorityTokenLastFetched;

  return state;
};

export default migration;
