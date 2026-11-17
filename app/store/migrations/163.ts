import { captureException } from '@sentry/react-native';
import {
  getChecksumAddress,
  getErrorMessage,
  hasProperty,
  isObject,
  type Hex,
} from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 163: remove `TokensController` state.
 * Issue: https://consensyssoftware.atlassian.net/browse/ASSETS-4135
 *
 * `TokensController` is no longer initialized by the Engine; `AssetsController`
 * is the sole source of truth for tokens. Its persisted `allTokens` was still
 * read on every start by the temporary ASSETS-3346 metadata heal
 * (`tempMigrateAssetsInfoMetadataAssets3346`), which restores `assetsInfo` and
 * `customAssets` for custom tokens on niche EVM chains.
 *
 * Before dropping the state, this migration runs that heal one last time, so
 * `AssetsController` ends up exactly as it would have after the next start.
 * The heal is a frozen copy of `healAssetsInfoMetadata` from
 * `@metamask/assets-controller` 20.4.1: migrations must not depend on code
 * that changes or is removed later.
 *
 * Users upgrading from an older version run migrations 139 (consolidation into
 * `AssetsController`) and 144 (one-off heal) before this one, on the same
 * `TokensController` state. The `persist:TokensController` file is deleted by
 * the migration runner only after the migrated state has been written to disk.
 *
 * If anything fails, the state is returned unchanged so no data is dropped.
 */
export const migrationVersion = 163;

interface FungibleAssetInfo {
  type: 'erc20';
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  aggregators?: string[];
}

interface AssetsControllerSlices {
  assetsInfo: Record<string, unknown>;
  assetsBalance: Record<string, unknown>;
  customAssets: Record<string, unknown>;
  assetPreferences: Record<string, unknown>;
}

interface HealingPatch {
  assetsInfo: Record<string, FungibleAssetInfo>;
  customAssets: Record<string, string[]>;
}

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/u;

/**
 * Popular networks (covered by the Accounts API) self-heal through
 * auto-detection, so their tokens are not touched. Frozen snapshot from
 * `@metamask/assets-controller` 20.4.1.
 */
const ACCOUNT_API_SUPPORTED_CHAIN_IDS = new Set<string>([
  'eip155:1', // Ethereum Mainnet
  'eip155:10', // Optimism
  'eip155:56', // BNB Smart Chain
  'eip155:137', // Polygon
  'eip155:143', // Monad
  'eip155:999', // HyperEVM
  'eip155:1329', // Sei
  'eip155:5042', // Arc
  'eip155:8453', // Base
  'eip155:42161', // Arbitrum One
  'eip155:43114', // Avalanche
  'eip155:59144', // Linea
]);

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;

    if (
      !isObject(backgroundState) ||
      !hasProperty(backgroundState, 'TokensController')
    ) {
      return state;
    }

    const { TokensController: _tokensController, ...newBackgroundState } =
      backgroundState;

    const assetsController = toAssetsControllerSlices(
      backgroundState.AssetsController,
    );
    const patch = healAssetsInfoMetadata(backgroundState, assetsController);
    if (patch) {
      newBackgroundState.AssetsController = {
        ...(isObject(backgroundState.AssetsController)
          ? backgroundState.AssetsController
          : {}),
        ...applyHealingPatch(assetsController, patch),
      };
    }

    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: newBackgroundState,
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to remove TokensController state: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;

/**
 * Read the `AssetsController` slices the heal uses, defaulting any missing or
 * invalid slice to an empty map like the controller's default state does.
 *
 * @param assetsController - The persisted `AssetsController` state.
 * @returns The slices.
 */
function toAssetsControllerSlices(
  assetsController: unknown,
): AssetsControllerSlices {
  const source = isObject(assetsController) ? assetsController : {};
  const toRecord = (value: unknown): Record<string, unknown> =>
    isObject(value) ? value : {};

  return {
    assetsInfo: toRecord(source.assetsInfo),
    assetsBalance: toRecord(source.assetsBalance),
    customAssets: toRecord(source.customAssets),
    assetPreferences: toRecord(source.assetPreferences),
  };
}

/**
 * Compute the additions required to heal `assetsInfo` metadata (and custom
 * asset tracking) for tokens on niche EVM chains, based on the legacy
 * `TokensController` state.
 *
 * Skips Accounts-API-supported chains, tokens the user hid (legacy
 * `allIgnoredTokens` or current `assetPreferences`), ERC-721s, and tokens with
 * an invalid address or no symbol.
 *
 * @param backgroundState - The persisted `engine.backgroundState`.
 * @param current - The current `AssetsController` slices (read-only).
 * @returns The additions to apply, or `null` when there is nothing to heal.
 */
function healAssetsInfoMetadata(
  backgroundState: Record<string, unknown>,
  current: AssetsControllerSlices,
): HealingPatch | null {
  const allTokens = readPath(backgroundState, [
    'TokensController',
    'allTokens',
  ]);
  if (!isObject(allTokens)) {
    return null;
  }

  const addressToAccountId = buildAddressToAccountIdMap(backgroundState);
  const hiddenAssetIds = collectHiddenAssetIds(current);
  const allIgnoredTokens = readPath(backgroundState, [
    'TokensController',
    'allIgnoredTokens',
  ]);

  const assetsInfoAdditions: Record<string, FungibleAssetInfo> = {};
  const customAssetAdditions: Record<string, string[]> = {};

  for (const [hexChainId, accountTokens] of Object.entries(allTokens)) {
    if (!isObject(accountTokens)) {
      continue;
    }

    const caip2 = hexChainIdToCaip2(hexChainId);
    if (!caip2 || ACCOUNT_API_SUPPORTED_CHAIN_IDS.has(caip2)) {
      continue;
    }

    for (const [rawAddress, tokens] of Object.entries(accountTokens)) {
      if (!Array.isArray(tokens) || tokens.length === 0) {
        continue;
      }

      const accountId = addressToAccountId[rawAddress.toLowerCase()];
      const ignoredAddresses = collectIgnoredAddresses(
        allIgnoredTokens,
        hexChainId,
        rawAddress,
      );

      for (const token of tokens) {
        const restorable = getRestorableAsset(
          token,
          caip2,
          ignoredAddresses,
          hiddenAssetIds,
        );
        if (!restorable) {
          continue;
        }

        const { assetId, info } = restorable;

        // `assetsInfo` is a global registry; fill gaps only, never overwrite.
        if (
          current.assetsInfo[assetId] === undefined &&
          assetsInfoAdditions[assetId] === undefined
        ) {
          assetsInfoAdditions[assetId] = info;
        }

        if (accountId) {
          addCustomAssetAddition(
            current,
            customAssetAdditions,
            accountId,
            assetId,
          );
        }
      }
    }
  }

  if (
    Object.keys(assetsInfoAdditions).length === 0 &&
    Object.keys(customAssetAdditions).length === 0
  ) {
    return null;
  }

  return { assetsInfo: assetsInfoAdditions, customAssets: customAssetAdditions };
}

/**
 * Apply a healing patch: fill `assetsInfo` gaps only and add custom assets
 * without duplicates.
 *
 * @param current - The current `AssetsController` slices (read-only).
 * @param patch - The additions computed by {@link healAssetsInfoMetadata}.
 * @returns The updated `assetsInfo` and `customAssets` slices.
 */
function applyHealingPatch(
  current: AssetsControllerSlices,
  patch: HealingPatch,
): Pick<AssetsControllerSlices, 'assetsInfo' | 'customAssets'> {
  const assetsInfo = { ...current.assetsInfo };
  for (const [assetId, metadata] of Object.entries(patch.assetsInfo)) {
    assetsInfo[assetId] ??= metadata;
  }

  const customAssets = { ...current.customAssets };
  for (const [accountId, assetIds] of Object.entries(patch.customAssets)) {
    const existing = toArray(customAssets[accountId]);
    customAssets[accountId] = [
      ...existing,
      ...assetIds.filter((assetId) => !existing.includes(assetId)),
    ];
  }

  return { assetsInfo, customAssets };
}

/**
 * Resolve a raw `TokensController` token entry to the CAIP-19 asset ID and
 * metadata to heal, or `null` when the token must be skipped.
 *
 * @param token - Raw token entry from `allTokens`.
 * @param caip2 - The CAIP-2 chain ID of the token's chain (e.g. 'eip155:14').
 * @param ignoredAddresses - Lowercase addresses hidden via legacy `allIgnoredTokens`.
 * @param hiddenAssetIds - Lowercase asset IDs hidden via current `assetPreferences`.
 * @returns The restorable asset, or `null` to skip.
 */
function getRestorableAsset(
  token: unknown,
  caip2: string,
  ignoredAddresses: Set<string>,
  hiddenAssetIds: Set<string>,
): { assetId: string; info: FungibleAssetInfo } | null {
  if (!isObject(token) || token.isERC721 === true) {
    return null;
  }
  if (
    typeof token.address !== 'string' ||
    !EVM_ADDRESS_REGEX.test(token.address)
  ) {
    return null;
  }
  if (typeof token.symbol !== 'string' || token.symbol.length === 0) {
    return null;
  }

  const assetId = buildErc20AssetId(caip2, token.address);
  if (!assetId) {
    return null;
  }
  if (
    ignoredAddresses.has(token.address.toLowerCase()) ||
    hiddenAssetIds.has(assetId.toLowerCase())
  ) {
    return null;
  }

  return { assetId, info: buildEvmAssetInfo(token, token.symbol) };
}

/**
 * Build the `assetsInfo` metadata from a raw `TokensController` token entry.
 *
 * @param token - Raw token object.
 * @param symbol - The token symbol, already validated as non-empty.
 * @returns The metadata.
 */
function buildEvmAssetInfo(
  token: Record<string, unknown>,
  symbol: string,
): FungibleAssetInfo {
  const name =
    typeof token.name === 'string' && token.name.length > 0
      ? token.name
      : symbol;
  const decimals =
    typeof token.decimals === 'number' && Number.isFinite(token.decimals)
      ? token.decimals
      : 0;
  const image =
    typeof token.image === 'string' && token.image.length > 0
      ? token.image
      : undefined;
  const aggregators = Array.isArray(token.aggregators)
    ? token.aggregators.filter(
        (aggregator): aggregator is string => typeof aggregator === 'string',
      )
    : undefined;

  return {
    type: 'erc20',
    symbol,
    name,
    decimals,
    ...(image ? { image } : {}),
    ...(aggregators ? { aggregators } : {}),
  };
}

/**
 * Map lowercase account addresses to account IDs using
 * `AccountsController.internalAccounts.accounts`.
 *
 * @param backgroundState - The persisted `engine.backgroundState`.
 * @returns Map of lowercase address to account ID.
 */
function buildAddressToAccountIdMap(
  backgroundState: Record<string, unknown>,
): Record<string, string> {
  const accounts = readPath(backgroundState, [
    'AccountsController',
    'internalAccounts',
    'accounts',
  ]);
  if (!isObject(accounts)) {
    return {};
  }

  const map: Record<string, string> = {};
  for (const [id, account] of Object.entries(accounts)) {
    if (
      isObject(account) &&
      typeof account.address === 'string' &&
      account.address.length > 0
    ) {
      map[account.address.toLowerCase()] = id;
    }
  }
  return map;
}

/**
 * Collect the lowercase CAIP-19 asset IDs marked `hidden: true` in
 * `AssetsController.assetPreferences`.
 *
 * @param current - The current `AssetsController` slices.
 * @returns Set of lowercase hidden asset IDs.
 */
function collectHiddenAssetIds(current: AssetsControllerSlices): Set<string> {
  const hidden = new Set<string>();
  for (const [assetId, preference] of Object.entries(
    current.assetPreferences,
  )) {
    if (isObject(preference) && preference.hidden === true) {
      hidden.add(assetId.toLowerCase());
    }
  }
  return hidden;
}

/**
 * Collect the lowercase token addresses ignored in the legacy
 * `TokensController.allIgnoredTokens` for a chain and account. The account key
 * is matched case-insensitively.
 *
 * @param allIgnoredTokens - The legacy `allIgnoredTokens` map (possibly missing).
 * @param hexChainId - The hex chain ID being processed.
 * @param accountAddress - The account address whose ignored list to read.
 * @returns Set of lowercase ignored token addresses.
 */
function collectIgnoredAddresses(
  allIgnoredTokens: unknown,
  hexChainId: string,
  accountAddress: string,
): Set<string> {
  const result = new Set<string>();
  if (!isObject(allIgnoredTokens)) {
    return result;
  }

  const chainEntry = allIgnoredTokens[hexChainId];
  if (!isObject(chainEntry)) {
    return result;
  }

  const lowerAccount = accountAddress.toLowerCase();
  for (const [address, list] of Object.entries(chainEntry)) {
    if (address.toLowerCase() !== lowerAccount || !Array.isArray(list)) {
      continue;
    }
    for (const ignored of list) {
      if (typeof ignored === 'string') {
        result.add(ignored.toLowerCase());
      }
    }
  }
  return result;
}

/**
 * Record `assetId` as a custom asset for `accountId` unless it already has a
 * balance entry, is already a custom asset, or is already queued.
 *
 * @param current - The current `AssetsController` slices.
 * @param additions - The custom asset additions so far (mutated).
 * @param accountId - The account ID.
 * @param assetId - The CAIP-19 asset ID.
 */
function addCustomAssetAddition(
  current: AssetsControllerSlices,
  additions: Record<string, string[]>,
  accountId: string,
  assetId: string,
): void {
  const accountBalances = current.assetsBalance[accountId];
  if (isObject(accountBalances) && accountBalances[assetId]) {
    return;
  }
  if (toArray(current.customAssets[accountId]).includes(assetId)) {
    return;
  }

  const queued = additions[accountId] ?? [];
  if (!queued.includes(assetId)) {
    queued.push(assetId);
  }
  additions[accountId] = queued;
}

/**
 * Convert a hex chain ID (e.g. '0xe') to a CAIP-2 chain ID (e.g. 'eip155:14').
 *
 * @param hexChainId - The hex chain ID.
 * @returns The CAIP-2 chain ID, or `null` when it cannot be parsed.
 */
function hexChainIdToCaip2(hexChainId: string): string | null {
  if (!/^0x[0-9a-fA-F]+$/u.test(hexChainId)) {
    return null;
  }
  const decimal = Number.parseInt(hexChainId, 16);
  if (!Number.isFinite(decimal)) {
    return null;
  }
  return `eip155:${decimal}`;
}

/**
 * Build the checksummed CAIP-19 asset ID of an ERC-20 token.
 *
 * @param caip2 - The CAIP-2 chain ID.
 * @param tokenAddress - The token contract address.
 * @returns The asset ID, or `null` when the address cannot be checksummed.
 */
function buildErc20AssetId(caip2: string, tokenAddress: string): string | null {
  try {
    return `${caip2}/erc20:${getChecksumAddress(tokenAddress as Hex)}`;
  } catch {
    return null;
  }
}

/**
 * Read a nested path, returning `undefined` when any key is missing.
 *
 * @param root - The value to read from.
 * @param path - Keys to traverse.
 * @returns The value at the path, or `undefined`.
 */
function readPath(root: unknown, path: string[]): unknown {
  return path.reduce<unknown>((cursor, key) => {
    if (!isObject(cursor) || !hasProperty(cursor, key)) {
      return undefined;
    }
    return cursor[key];
  }, root);
}

/**
 * @param value - A persisted `customAssets` entry.
 * @returns The entry when it is an array, otherwise an empty array.
 */
function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
