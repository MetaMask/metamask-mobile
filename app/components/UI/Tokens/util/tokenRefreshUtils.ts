import { CaipChainId } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { FUNGIBLE_ASSET_TYPES } from '../../../../core/Assets/accountGroupAssetLoader';

const REFRESH_TIMEOUT_MS = 5000; // 5 second timeout

/**
 * Wraps a promise with a timeout. Resolves with the result or rejects if timeout is exceeded.
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);

/**
 * Refreshes token-specific data (detection, balances, rates) for the given
 * accounts and chains via `AssetsController`, the sole source of truth for
 * asset data.
 * Does NOT refresh account balance.
 */
export const performEvmTokenRefresh = async (
  accounts: readonly InternalAccount[],
  chainIds: CaipChainId[],
) => {
  if (accounts.length === 0 || chainIds.length === 0) {
    return;
  }

  const { AssetsController } = Engine.context;

  try {
    await withTimeout(
      AssetsController.getAssets([...accounts], {
        forceUpdate: true,
        chainIds,
        assetTypes: FUNGIBLE_ASSET_TYPES,
      }),
      REFRESH_TIMEOUT_MS,
      'performEvmTokenRefresh',
    );
  } catch {
    Logger.log(
      'performEvmTokenRefresh timed out; balances may be stale until the next refresh',
    );
  }
};
