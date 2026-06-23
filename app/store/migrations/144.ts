import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  getErrorMessage,
  hasProperty,
  isHexString,
  isObject,
} from '@metamask/utils';
import { captureException } from '@sentry/react-native';

import { ensureValidState } from './util';

export const migrationVersion = 144;

/**
 * Migration 144: Assets Controller Metadata Healing Migration
 * Issue: https://consensyssoftware.atlassian.net/browse/ASSETS-3346
 * Incident: #incident-metamask-1731
 *
 * Background: After a prior defect in AssetsController, metadata
 * (`AssetsController.assetsInfo`) for custom tokens were wiped. Most popular
 * chains support auto-detection and can self-heal, however not all chains
 * support auto-detection.
 *
 * Fix: This migration restores metadata for custom tokens on niche EVM chains
 * (that are unable to auto-detect/self-heal) using the legacy
 * `TokensController.allTokens` state.
 */

interface AssetInfo {
  type: 'erc20';
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  aggregators?: string[];
}

interface AssetsControllerShape {
  assetsInfo: Record<string, AssetInfo>;
  assetsBalance: Record<string, Record<string, { amount: string }>>;
  customAssets: Record<string, string[]>;
  assetPreferences: Record<string, { hidden?: boolean }>;
}

interface RestorableAsset {
  accountId: string | undefined;
  assetId: string;
  info: AssetInfo;
}

const EVM_ASSET_PREFIX = 'eip155:';
const EVM_ADDRESS_REGEX = /^(0x)?[0-9a-fA-F]{40}$/u;

/**
 * Popular networks (covered by the Accounts API) can self-heal through
 * auto-detection and therefore must not be touched by this migration.
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

function readPath(root: unknown, path: string[]): unknown {
  let cursor = root;

  for (const key of path) {
    if (!isObject(cursor) || !hasProperty(cursor, key)) {
      return undefined;
    }

    cursor = cursor[key];
  }

  return cursor;
}

/**
 * Return a typed view of `backgroundState.AssetsController`, ensuring the
 * sub-maps the migration reads/writes exist. Returns `null` when the controller
 * is absent (unified assets state not in use), in which case there is nothing to
 * heal.
 *
 * @param backgroundState - The engine background state.
 */
function getAssetsController(
  backgroundState: Record<string, unknown>,
): AssetsControllerShape | null {
  if (
    !hasProperty(backgroundState, 'AssetsController') ||
    !isObject(backgroundState.AssetsController)
  ) {
    return null;
  }

  const assetsController = backgroundState.AssetsController as Record<
    string,
    unknown
  >;

  ensureRecordObject(assetsController, 'assetsInfo');
  ensureRecordObject(assetsController, 'assetsBalance');
  ensureRecordObject(assetsController, 'customAssets');
  ensureRecordObject(assetsController, 'assetPreferences');

  return assetsController as unknown as AssetsControllerShape;
}

function ensureRecordObject(
  container: Record<string, unknown>,
  key: string,
): void {
  if (!isObject(container[key])) {
    container[key] = {};
  }
}

function buildAddressToIdMap(
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

  const addressToId: Record<string, string> = {};

  for (const [accountId, account] of Object.entries(accounts)) {
    if (
      isObject(account) &&
      typeof account.address === 'string' &&
      account.address
    ) {
      addressToId[account.address.toLowerCase()] = accountId;
    }
  }

  return addressToId;
}

/**
 * Collect the set of CAIP-19 asset IDs (lowercased) marked `hidden: true` in
 * `AssetsController.assetPreferences`. Lowercasing lets callers compare against
 * checksummed asset IDs case-insensitively.
 *
 * @param assetsController - The AssetsController view.
 */
function collectHiddenAssetIds(
  assetsController: AssetsControllerShape,
): Set<string> {
  const hidden = new Set<string>();

  for (const [assetId, preference] of Object.entries(
    assetsController.assetPreferences,
  )) {
    if (isObject(preference) && preference.hidden === true) {
      hidden.add(assetId.toLowerCase());
    }
  }

  return hidden;
}

/**
 * Collect the lowercase token addresses ignored (hidden) in the legacy
 * `TokensController.allIgnoredTokens` for a given chain and account. The account
 * key is matched case-insensitively.
 *
 * @param allIgnoredTokens - The legacy `allIgnoredTokens` map (possibly missing).
 * @param hexChainId - The hex chain ID being processed.
 * @param accountAddress - The account address whose ignored list to read.
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

function isAccountApiSupportedChain(caip2: string): boolean {
  return ACCOUNT_API_SUPPORTED_CHAIN_IDS.has(caip2.toLowerCase());
}

function hexChainIdToCaip2(hexChainId: string): string | null {
  if (!isHexString(hexChainId)) {
    return null;
  }

  const decimalChainId = Number.parseInt(hexChainId, 16);
  if (!Number.isSafeInteger(decimalChainId) || decimalChainId <= 0) {
    return null;
  }

  return `${EVM_ASSET_PREFIX}${decimalChainId}`;
}

function buildErc20AssetId(caip2: string, tokenAddress: string): string | null {
  if (!EVM_ADDRESS_REGEX.test(tokenAddress)) {
    return null;
  }

  return `${caip2}/erc20:${toChecksumHexAddress(tokenAddress)}`;
}

function buildEvmAssetInfo(token: Record<string, unknown>): AssetInfo {
  const symbol = typeof token.symbol === 'string' ? token.symbol : '';
  const name =
    typeof token.name === 'string' && token.name ? token.name : symbol;

  const assetInfo: AssetInfo = {
    type: 'erc20',
    symbol,
    name,
    decimals: typeof token.decimals === 'number' ? token.decimals : 0,
  };

  if (typeof token.image === 'string' && token.image) {
    assetInfo.image = token.image;
  }

  if (Array.isArray(token.aggregators)) {
    const aggregators = token.aggregators.filter(
      (aggregator): aggregator is string => typeof aggregator === 'string',
    );

    if (aggregators.length > 0) {
      assetInfo.aggregators = aggregators;
    }
  }

  return assetInfo;
}

/**
 * Resolve a raw `TokensController` token entry to the CAIP-19 asset ID that
 * should be healed, or `null` when the token must be skipped (not an object,
 * missing/invalid address, an ERC-721, or hidden in either controller).
 *
 * @param token - Raw token entry from `allTokens`.
 * @param caip2 - The CAIP-2 chain ID of the token's chain (e.g. 'eip155:14').
 * @param ignoredAddresses - Lowercase addresses hidden via legacy `allIgnoredTokens`.
 * @param hiddenAssetIds - Lowercase asset IDs hidden via new `assetPreferences`.
 */
function getRestorableAssetId(
  token: unknown,
  caip2: string,
  ignoredAddresses: Set<string>,
  hiddenAssetIds: Set<string>,
): string | null {
  if (!isObject(token) || typeof token.address !== 'string' || !token.address) {
    return null;
  }

  // Skip NFTs — AssetsController tracks them separately.
  if (token.isERC721 === true) {
    return null;
  }

  const assetId = buildErc20AssetId(caip2, token.address);
  if (!assetId) {
    return null;
  }

  // Skip tokens the user hid/removed — in the legacy controller…
  if (ignoredAddresses.has(token.address.toLowerCase())) {
    return null;
  }

  // …or in the new controller.
  if (hiddenAssetIds.has(assetId.toLowerCase())) {
    return null;
  }

  return assetId;
}

/**
 * Walk the legacy `TokensController.allTokens` and return a flat list of tokens
 * whose `AssetsController` metadata is eligible to be healed.
 *
 * Everything that must be left alone is filtered out here: unparseable or
 * accounts-API-supported chains, non-EVM/ERC-721 entries, invalid addresses,
 * and tokens the user hid/removed (legacy `allIgnoredTokens` or new
 * `assetPreferences`).
 *
 * @param backgroundState - The engine background state.
 * @param assetsController - The AssetsController view.
 */
function collectRestorableAssets(
  backgroundState: Record<string, unknown>,
  assetsController: AssetsControllerShape,
): RestorableAsset[] {
  const allTokens = readPath(backgroundState, [
    'TokensController',
    'allTokens',
  ]);
  if (!isObject(allTokens)) {
    return [];
  }

  const addressToId = buildAddressToIdMap(backgroundState);
  const hiddenAssetIds = collectHiddenAssetIds(assetsController);
  const allIgnoredTokens = readPath(backgroundState, [
    'TokensController',
    'allIgnoredTokens',
  ]);

  const restorable: RestorableAsset[] = [];

  for (const [hexChainId, accountTokens] of Object.entries(allTokens)) {
    if (!isObject(accountTokens)) {
      continue;
    }

    const caip2 = hexChainIdToCaip2(hexChainId);
    // Skip chains we can't parse or that self-heal via the accounts API.
    if (!caip2 || isAccountApiSupportedChain(caip2)) {
      continue;
    }

    for (const [rawAddress, tokens] of Object.entries(accountTokens)) {
      if (!Array.isArray(tokens) || tokens.length === 0) {
        continue;
      }

      const accountId = addressToId[rawAddress.toLowerCase()];
      const ignoredAddresses = collectIgnoredAddresses(
        allIgnoredTokens,
        hexChainId,
        rawAddress,
      );

      for (const token of tokens) {
        const assetId = getRestorableAssetId(
          token,
          caip2,
          ignoredAddresses,
          hiddenAssetIds,
        );
        if (!assetId) {
          continue;
        }

        restorable.push({
          accountId,
          assetId,
          info: buildEvmAssetInfo(token as Record<string, unknown>),
        });
      }
    }
  }

  return restorable;
}

/**
 * Add `assetId` to `customAssets[accountId]` if it's not already tracked in
 * `assetsBalance` (mutual exclusion) and not already present in `customAssets`.
 *
 * @param assetsController - The AssetsController view.
 * @param accountId - The account UUID.
 * @param assetId - CAIP-19 asset identifier.
 */
function addCustomAsset(
  assetsController: AssetsControllerShape,
  accountId: string,
  assetId: string,
): void {
  const accountBalance = assetsController.assetsBalance[accountId] as unknown;
  if (isObject(accountBalance) && hasProperty(accountBalance, assetId)) {
    return;
  }

  if (!Array.isArray(assetsController.customAssets[accountId])) {
    assetsController.customAssets[accountId] = [];
  }

  if (assetsController.customAssets[accountId].includes(assetId)) {
    return;
  }

  assetsController.customAssets[accountId].push(assetId);
}

/**
 * Heal `AssetsController.assetsInfo` entries that were wiped for tokens on niche
 * EVM chains (chains not covered by the accounts API, e.g. Flare / chainId 14).
 *
 * The migration only runs when `AssetsController` state already exists (i.e. the
 * unified assets state is in use); otherwise there is nothing to heal.
 *
 * @param state - The persisted redux state.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;

    const assetsController = getAssetsController(backgroundState);
    if (!assetsController) {
      return state;
    }

    // Step 1: gather every token whose metadata is eligible to be healed.
    const restorable = collectRestorableAssets(
      backgroundState,
      assetsController,
    );
    if (restorable.length === 0) {
      return state;
    }

    // Step 2: heal each one. Writes are idempotent (fill gaps / dedupe).
    for (const { accountId, assetId, info } of restorable) {
      // `assetsInfo` is a global registry; fill gaps only, never overwrite.
      if (
        !Object.prototype.hasOwnProperty.call(
          assetsController.assetsInfo,
          assetId,
        )
      ) {
        assetsController.assetsInfo[assetId] = info;
      }

      // Ensure the asset is tracked for its account.
      if (accountId) {
        addCustomAsset(assetsController, accountId, assetId);
      }
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: heal wiped AssetsController metadata for niche-chain tokens failed: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
}
