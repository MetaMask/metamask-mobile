import { isObject, hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';

export const migrationVersion = 152;

/**
 * Migration 152: Remove mUSD conversion fields from the user Redux slice.
 * The mUSD conversion flow has been removed from the app.
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (!hasProperty(state, 'user') || !isObject(state.user)) {
    return state;
  }

  const user = state.user as Record<string, unknown>;

  delete user.musdConversionEducationSeen;
  delete user.musdConversionAssetDetailCtasSeen;

  return state;
};

export default migration;
