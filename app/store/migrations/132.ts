import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import FilesystemStorage from 'redux-persist-filesystem-storage';

import { ensureValidState } from './util';
import { STORAGE_KEY_PREFIX } from '@metamask/storage-service';

export const migrationVersion = 132;

const CONTROLLER_NAME = 'TokenListController';
const CACHE_KEY_PREFIX = 'tokensChainsCache';

/**
 * Migration 132: Remove tokensChainsCache from TokenListController.
 *
 * TokenDetectionController no longer reads from or writes to
 * TokenListController's tokensChainsCache. It now manages its own internal
 * token list cache and fetches token data directly from the token service API.
 *
 * This migration removes the tokensChainsCache key from TokenListController
 * state and deletes all per-chain cache files written by migration 114 under
 * StorageService keys like `storageService:TokenListController:tokensChainsCache:0x1`.
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
export default async function migrate(stateAsync: unknown): Promise<unknown> {
  const state = await stateAsync;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    // 1. Remove tokensChainsCache from TokenListController state
    if (hasProperty(state.engine.backgroundState, 'TokenListController')) {
      const tokenListControllerState =
        state.engine.backgroundState.TokenListController;

      if (
        isObject(tokenListControllerState) &&
        hasProperty(tokenListControllerState, 'tokensChainsCache')
      ) {
        delete (tokenListControllerState as Record<string, unknown>)
          .tokensChainsCache;
      }
    }

    // 2. Delete per-chain cache files from FilesystemStorage
    try {
      const allKeys = await FilesystemStorage.getAllKeys();
      const cacheKeyPrefix = `${STORAGE_KEY_PREFIX}${CONTROLLER_NAME}:${CACHE_KEY_PREFIX}:`;
      const keysToRemove = (allKeys as string[]).filter((key) =>
        key.startsWith(cacheKeyPrefix),
      );

      await Promise.all(
        keysToRemove.map(async (key) => {
          try {
            await FilesystemStorage.removeItem(key);
          } catch {
            // Ignore individual key removal failures
          }
        }),
      );
    } catch {
      // If we cannot enumerate keys, skip the storage cleanup — the state
      // removal above is the critical part.
    }

    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${String(error)}`),
    );
    return state;
  }
}
