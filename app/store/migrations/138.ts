import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';

import { STORAGE_KEY_PREFIX } from '@metamask/storage-service';
import Logger from '../../util/Logger';

export const migrationVersion = 138;

const TOKEN_LIST_CONTROLLER_PREFIX = `${STORAGE_KEY_PREFIX}TokenListController:`;

/**
 * Migration 138: Delete orphaned TokenListController filesystem cache files.
 *
 * Migration 114 moved `tokensChainsCache` from Redux-persisted state into
 * individual FilesystemStorage files keyed as
 * storageService:TokenListController:tokensChainsCache:{chainId}
 *
 * PR #29872 removed `TokenListController` from the app entirely. Those files
 * are now orphaned and will never be read again. This migration deletes all
 * FilesystemStorage keys whose prefix matches `storageService:TokenListController:`.
 *
 * Failure is non-fatal: if the cleanup fails the app continues normally and
 * the files simply remain as dead weight on the filesystem.
 *
 * @param state - MetaMask mobile Redux state (passed through unmodified)
 * @returns The same state, unmodified
 */
export default async function migrate(state: unknown): Promise<unknown> {
  try {
    const allKeys = await FilesystemStorage.getAllKeys();

    if (!allKeys) {
      Logger.log(
        `Migration #${migrationVersion}: getAllKeys returned null/undefined, skipping`,
      );
      return state;
    }

    Logger.log(
      `Migration #${migrationVersion}: Before — total filesystem keys: ${allKeys.length}`,
    );

    const keysToDelete = allKeys.filter((key: string) =>
      key.startsWith(TOKEN_LIST_CONTROLLER_PREFIX),
    );

    if (keysToDelete.length === 0) {
      Logger.log(
        `Migration #${migrationVersion}: No TokenListController filesystem keys found, nothing to delete`,
      );
      return state;
    }

    Logger.log(
      `Migration #${migrationVersion}: Deleting ${keysToDelete.length} orphaned TokenListController key(s):`,
      keysToDelete,
    );

    await Promise.all(
      keysToDelete.map((key: string) => FilesystemStorage.removeItem(key)),
    );

    const remainingKeys = allKeys.length - keysToDelete.length;
    Logger.log(
      `Migration #${migrationVersion}: Deleted ${keysToDelete.length} TokenListController key(s), ${remainingKeys} filesystem key(s) remaining`,
    );
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to delete TokenListController filesystem cache: ${String(error)}`,
      ),
    );
  }

  return state;
}
