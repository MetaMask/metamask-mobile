import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 165: remove the Arc ERC-20 USDC custom asset.
 *
 * The app used to import `eip155:5042/erc20:0x3600...` as a custom asset for
 * every EVM account. AssetsController now default-tracks Arc's native USDC, so
 * the ERC-20 entry is removed from `AssetsController.customAssets`. Accounts
 * left with no custom assets are removed from the map.
 */
export const migrationVersion = 165;

const ARC_ERC20_USDC_ASSET_ID =
  'eip155:5042/erc20:0x3600000000000000000000000000000000000000';

/**
 * Returns a copy of `customAssets` without the Arc ERC-20 USDC entry, or
 * `undefined` when there is nothing to remove.
 *
 * @param customAssets - The `AssetsController.customAssets` map by account id.
 * @returns The updated map, or `undefined` when nothing changed.
 */
const removeArcErc20FromCustomAssets = (
  customAssets: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  let changed = false;
  const result: Record<string, unknown> = {};

  for (const [accountId, assetIds] of Object.entries(customAssets)) {
    if (!Array.isArray(assetIds)) {
      result[accountId] = assetIds;
      continue;
    }

    const remainingAssetIds = assetIds.filter(
      (assetId) =>
        typeof assetId !== 'string' ||
        assetId.toLowerCase() !== ARC_ERC20_USDC_ASSET_ID,
    );

    if (remainingAssetIds.length === assetIds.length) {
      result[accountId] = assetIds;
      continue;
    }

    changed = true;
    if (remainingAssetIds.length > 0) {
      result[accountId] = remainingAssetIds;
    }
  }

  return changed ? result : undefined;
};

const migration = (state: unknown): unknown => {
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

    const assetsControllerState = backgroundState.AssetsController;
    const currentCustomAssets = assetsControllerState.customAssets;
    if (!isObject(currentCustomAssets)) {
      return state;
    }

    const customAssets = removeArcErc20FromCustomAssets(currentCustomAssets);
    if (!customAssets) {
      return state;
    }

    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...backgroundState,
          AssetsController: {
            ...assetsControllerState,
            customAssets,
          },
        },
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to remove Arc ERC-20 USDC custom asset: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
