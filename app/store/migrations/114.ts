import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { cloneDeep } from 'lodash';
import FilesystemStorage from 'redux-persist-filesystem-storage';

import { ensureValidState } from './util';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import { STORAGE_KEY_PREFIX } from '@metamask/storage-service';

export const migrationVersion = 114;

// Storage key constants matching TokenListController and StorageService
// These must match the format used in storage-service-init.ts
const CONTROLLER_NAME = 'TokenListController';
const CACHE_KEY_PREFIX = 'tokensChainsCache';

interface TokenChainCacheEntry {
  timestamp: number;
  data: Record<string, unknown>;
}

interface TokensChainsCache {
  [chainId: string]: TokenChainCacheEntry;
}

interface TokenListControllerState {
  tokensChainsCache?: TokensChainsCache;
  preventPollingOnNetworkRestart?: boolean;
}

/**
 * Build the full storage key for a chain's token list cache.
 *
 * @param chainId - The chain ID (hex string like '0x1')
 * @returns Full storage key: storageService:TokenListController:tokensChainsCache:{chainId}
 */
function makeStorageKey(chainId: string): string {
  return `${STORAGE_KEY_PREFIX}${CONTROLLER_NAME}:${CACHE_KEY_PREFIX}:${chainId}`;
}

/**
 * This migration moves TokenListController's tokensChainsCache from persisted
 * state to FilesystemStorage via StorageService format.
 *
 * Background:
 * - Previously, tokensChainsCache was persisted as part of the controller state
 * - Now, TokenListController uses StorageService to persist per-chain cache files
 * - This migration ensures existing users don't lose their cached token lists
 *
 * The migration:
 * 1. Reads tokensChainsCache from TokenListController state
 * 2. For each chain, saves the cache to FilesystemStorage
 * 3. Clears tokensChainsCache from state (since persist: false now)
 *
 * @param state - MetaMask mobile state
 * @returns Updated MetaMask mobile state
 */
export default async function migrate(stateAsync: unknown): Promise<unknown> {
  const state = cloneDeep(await stateAsync);

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state.engine.backgroundState, 'TokenListController')) {
      // TokenListController not present, nothing to migrate
      return state;
    }

    const tokenListControllerState = state.engine.backgroundState
      .TokenListController as TokenListControllerState | undefined;

    if (!isObject(tokenListControllerState)) {
      return state;
    }

    if (
      !hasProperty(tokenListControllerState, 'tokensChainsCache') ||
      !isObject(tokenListControllerState.tokensChainsCache)
    ) {
      if (tokenListControllerState.tokensChainsCache !== undefined) {
        captureException(
          new Error(
            `Migration ${migrationVersion}: Invalid tokensChainsCache: '${JSON.stringify(
              tokenListControllerState.tokensChainsCache,
            )}'`,
          ),
        );
      }
      return state;
    }

    const chainsCache = tokenListControllerState.tokensChainsCache;
    const chainIds = Object.keys(chainsCache);

    if (chainIds.length === 0) {
      return state;
    }

    // Check which chains already exist in storage (don't overwrite)
    const existingKeys = await Promise.all(
      chainIds.map(async (chainId) => {
        const storageKey = makeStorageKey(chainId);
        try {
          const existing = await FilesystemStorage.getItem(storageKey);
          return {
            chainId,
            exists: existing !== null && existing !== undefined,
          };
        } catch {
          return { chainId, exists: false };
        }
      }),
    );

    // Filter to chains that need migration (not already in storage)
    const chainsToMigrate = existingKeys
      .filter(({ exists }) => !exists)
      .map(({ chainId }) => chainId);

    if (chainsToMigrate.length === 0) {
      Logger.log(
        `Migration #${migrationVersion}: All ${chainIds.length} chain(s) already migrated to StorageService`,
      );
    } else {
      // Save all chains to FilesystemStorage
      await Promise.all(
        chainsToMigrate.map(async (chainId) => {
          const storageKey = makeStorageKey(chainId);
          const cacheData = (chainsCache as TokensChainsCache)[chainId];
          try {
            await FilesystemStorage.setItem(
              storageKey,
              JSON.stringify(cacheData),
              Device.isIos(),
            );
          } catch (error) {
            Logger.error(error as Error, {
              message: `Migration #${migrationVersion}: Failed to save chain ${chainId} to StorageService`,
            });
            // Don't throw - continue with other chains
          }
        }),
      );

      Logger.log(
        `Migration #${migrationVersion}: Migrated ${chainsToMigrate.length} chain(s) from TokenListController state to StorageService`,
      );
    }

    // Clear tokensChainsCache from state since it's now persisted separately
    // The controller has persist: false for this field, so this just cleans up
    // any leftover data in state
    tokenListControllerState.tokensChainsCache = {};

    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion}: ${String(error)}`),
    );
    // Don't fail the migration - the cache will self-heal when fetchTokenList runs
    // Just try to clear the state to prevent double-storage
    try {
      const tokenListControllerState = state.engine.backgroundState
        .TokenListController as TokenListControllerState | undefined;
      if (tokenListControllerState) {
        tokenListControllerState.tokensChainsCache = {};
      }
    } catch {
      // Ignore cleanup errors
    }

    return state;
  }
}
