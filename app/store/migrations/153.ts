import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';

export const migrationVersion = 153;

/**
 * Auto-imported Arc ERC-20 USDC identity. Duplicate of native Arc USDC
 * (`eip155:5042/slip44:5042`); pinning it as a custom asset made Accounts
 * API v6 treat Arc as failed (`unprocessedIncludeAssetIds`).
 */
const ARC_ERC20_USDC_ASSET_ID =
  'eip155:5042/erc20:0x3600000000000000000000000000000000000000';

const ARC_ERC20_USDC_ASSET_ID_LOWER = ARC_ERC20_USDC_ASSET_ID.toLowerCase();

function isArcErc20Usdc(assetId: unknown): boolean {
  return (
    typeof assetId === 'string' &&
    assetId.toLowerCase() === ARC_ERC20_USDC_ASSET_ID_LOWER
  );
}

/**
 * Strip the auto-imported Arc ERC-20 USDC pin from AssetsController state.
 *
 * Removes it from `customAssets` (the includeAssetIds source), leftover
 * `assetsBalance` entries, `assetsInfo` metadata, and `assetPreferences`.
 * Native Arc USDC (`slip44:5042`) is left untouched.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;
    if (
      !hasProperty(backgroundState, 'AssetsController') ||
      !isObject(backgroundState.AssetsController)
    ) {
      return state;
    }

    const assetsController = backgroundState.AssetsController as Record<
      string,
      unknown
    >;

    stripCustomAssets(assetsController);
    stripAssetsBalance(assetsController);
    stripAssetKeyedMap(assetsController, 'assetsInfo');
    stripAssetKeyedMap(assetsController, 'assetPreferences');

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to strip Arc ERC-20 USDC from AssetsController: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
}

function stripCustomAssets(assetsController: Record<string, unknown>): void {
  if (
    !hasProperty(assetsController, 'customAssets') ||
    !isObject(assetsController.customAssets)
  ) {
    return;
  }

  const customAssets = assetsController.customAssets as Record<string, unknown>;
  for (const [accountId, assetIds] of Object.entries(customAssets)) {
    if (!Array.isArray(assetIds)) {
      continue;
    }
    const filtered = assetIds.filter((id) => !isArcErc20Usdc(id));
    if (filtered.length === assetIds.length) {
      continue;
    }
    if (filtered.length === 0) {
      delete customAssets[accountId];
    } else {
      customAssets[accountId] = filtered;
    }
  }
}

function stripAssetsBalance(assetsController: Record<string, unknown>): void {
  if (
    !hasProperty(assetsController, 'assetsBalance') ||
    !isObject(assetsController.assetsBalance)
  ) {
    return;
  }

  const assetsBalance = assetsController.assetsBalance as Record<
    string,
    unknown
  >;
  for (const balances of Object.values(assetsBalance)) {
    if (!isObject(balances)) {
      continue;
    }
    for (const assetId of Object.keys(balances)) {
      if (isArcErc20Usdc(assetId)) {
        delete balances[assetId];
      }
    }
  }
}

function stripAssetKeyedMap(
  assetsController: Record<string, unknown>,
  key: string,
): void {
  if (!hasProperty(assetsController, key) || !isObject(assetsController[key])) {
    return;
  }

  const map = assetsController[key] as Record<string, unknown>;
  for (const assetId of Object.keys(map)) {
    if (isArcErc20Usdc(assetId)) {
      delete map[assetId];
    }
  }
}
