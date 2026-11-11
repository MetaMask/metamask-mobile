import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 160: drop lowercase mUSD keys from `AssetsController`.
 * Issue: https://consensyssoftware.atlassian.net/browse/ASSETS-4182
 *
 * core#8616 seeded mUSD into `assetsInfo` with a lowercase address. core#8786
 * switched to the checksummed address but never removed the lowercase keys
 * already on disk. Anyone who opened Mobile 7.77.0 – 7.78.1 kept a lowercase
 * mUSD entry for mainnet, Linea, and Monad next to the checksummed one.
 *
 * This deletes those three lowercase keys from `assetsInfo` and from each
 * account in `assetsBalance`. Checksummed mUSD entries and every other token
 * stay as they are.
 */
export const migrationVersion = 160;

const LOWERCASE_MUSD_ASSET_IDS = [
  'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
  'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
  'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
] as const;

export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const assetsController = state.engine.backgroundState.AssetsController;
    if (!isObject(assetsController)) {
      return state;
    }

    dropLowercaseMusdKeys(assetsController.assetsInfo);
    if (isObject(assetsController.assetsBalance)) {
      for (const accountBalances of Object.values(
        assetsController.assetsBalance,
      )) {
        dropLowercaseMusdKeys(accountBalances);
      }
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to drop lowercase mUSD entries from AssetsController: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
}

/**
 * Delete the known lowercase mUSD ids from one asset-id map.
 *
 * @param record - `assetsInfo`, or one account's balance map.
 */
function dropLowercaseMusdKeys(record: unknown): void {
  if (!isObject(record)) {
    return;
  }
  for (const assetId of LOWERCASE_MUSD_ASSET_IDS) {
    if (hasProperty(record, assetId)) {
      delete record[assetId];
    }
  }
}
