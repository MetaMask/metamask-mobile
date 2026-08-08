import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  getErrorMessage,
  hasProperty,
  isHexString,
  isObject,
} from '@metamask/utils';
import { captureException } from '@sentry/react-native';

import { ensureValidState } from './util';

export const migrationVersion = 139;

type AssetType = 'erc20' | 'spl' | 'native';

interface AssetInfo {
  type: AssetType;
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  aggregators?: string[];
}

interface BalanceEntry {
  amount: string;
}

interface AssetsControllerState {
  assetsInfo: Record<string, AssetInfo>;
  assetsBalance: Record<string, Record<string, BalanceEntry>>;
  assetsPrice: Record<string, unknown>;
  customAssets: Record<string, string[]>;
  assetPreferences: Record<string, unknown>;
  selectedCurrency: string;
}

const EVM_ASSET_PREFIX = 'eip155:';
const DEFAULT_SELECTED_CURRENCY = 'usd';
const EVM_ADDRESS_REGEX = /^(0x)?[0-9a-fA-F]{40}$/u;

function getDefaultAssetsControllerState(): AssetsControllerState {
  return {
    assetsInfo: {},
    assetsBalance: {},
    assetsPrice: {},
    customAssets: {},
    assetPreferences: {},
    selectedCurrency: DEFAULT_SELECTED_CURRENCY,
  };
}

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

function ensureAssetsController(
  backgroundState: Record<string, unknown>,
): AssetsControllerState {
  if (
    !hasProperty(backgroundState, 'AssetsController') ||
    !isObject(backgroundState.AssetsController)
  ) {
    backgroundState.AssetsController = getDefaultAssetsControllerState();
  }

  const assetsController = backgroundState.AssetsController as Record<
    string,
    unknown
  >;

  if (!isObject(assetsController.assetsInfo)) {
    assetsController.assetsInfo = {};
  }
  if (!isObject(assetsController.assetsBalance)) {
    assetsController.assetsBalance = {};
  }
  if (!isObject(assetsController.assetsPrice)) {
    assetsController.assetsPrice = {};
  }
  if (!isObject(assetsController.customAssets)) {
    assetsController.customAssets = {};
  }
  if (!isObject(assetsController.assetPreferences)) {
    assetsController.assetPreferences = {};
  }
  if (typeof assetsController.selectedCurrency !== 'string') {
    assetsController.selectedCurrency = DEFAULT_SELECTED_CURRENCY;
  }

  return assetsController as unknown as AssetsControllerState;
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

function collectRelevantAccountIds(
  backgroundState: Record<string, unknown>,
  addressToId: Record<string, string>,
): Set<string> {
  const accountIds = new Set<string>();

  const selectedAccountId = readPath(backgroundState, [
    'AccountsController',
    'internalAccounts',
    'selectedAccount',
  ]);

  if (typeof selectedAccountId === 'string' && selectedAccountId) {
    accountIds.add(selectedAccountId);
  }

  const allTokens = readPath(backgroundState, [
    'TokensController',
    'allTokens',
  ]);
  if (isObject(allTokens)) {
    for (const [hexChainId, accountTokens] of Object.entries(allTokens)) {
      if (!isObject(accountTokens)) {
        continue;
      }

      for (const [rawAddress, tokens] of Object.entries(accountTokens)) {
        if (!Array.isArray(tokens)) {
          continue;
        }

        const hasErc20Token = tokens.some(
          (token) =>
            isObject(token) &&
            token.isERC721 !== true &&
            typeof token.address === 'string' &&
            buildErc20AssetId(hexChainId, token.address) !== null,
        );

        if (!hasErc20Token) {
          continue;
        }

        const accountId = addressToId[rawAddress.toLowerCase()];
        if (accountId) {
          accountIds.add(accountId);
        }
      }
    }
  }

  const accountsAssets = readPath(backgroundState, [
    'MultichainAssetsController',
    'accountsAssets',
  ]);

  if (isObject(accountsAssets)) {
    for (const [accountId, assetIds] of Object.entries(accountsAssets)) {
      if (
        Array.isArray(assetIds) &&
        assetIds.some(
          (assetId) => typeof assetId === 'string' && !isNativeAssetId(assetId),
        )
      ) {
        accountIds.add(accountId);
      }
    }
  }

  return accountIds;
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

function buildErc20AssetId(
  hexChainId: string,
  tokenAddress: string,
): string | null {
  const caip2 = hexChainIdToCaip2(hexChainId);
  if (!caip2 || !EVM_ADDRESS_REGEX.test(tokenAddress)) {
    return null;
  }

  return `${caip2}/erc20:${toChecksumHexAddress(tokenAddress)}`;
}

function assetTypeFromCaip19(assetId: string): AssetType {
  const slashIndex = assetId.indexOf('/');
  if (slashIndex === -1) {
    return 'spl';
  }

  const namespace = assetId.slice(slashIndex + 1).split(':', 1)[0];

  switch (namespace) {
    case 'erc20':
      return 'erc20';
    case 'slip44':
      return 'native';
    case 'spl':
    default:
      return 'spl';
  }
}

function isNativeAssetId(assetId: string): boolean {
  return assetTypeFromCaip19(assetId) === 'native';
}

function writeAssetInfoIfAbsent(
  assetsController: AssetsControllerState,
  assetId: string,
  assetInfo: AssetInfo,
): void {
  if (
    Object.prototype.hasOwnProperty.call(assetsController.assetsInfo, assetId)
  ) {
    return;
  }

  assetsController.assetsInfo[assetId] = assetInfo;
}

function addCustomAsset(
  assetsController: AssetsControllerState,
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

function cleanupCustomAssets(assetsController: AssetsControllerState): void {
  for (const [accountId, assetIds] of Object.entries(
    assetsController.customAssets,
  )) {
    if (!Array.isArray(assetIds)) {
      continue;
    }

    assetsController.customAssets[accountId] = assetIds.filter(
      (assetId) => !isNativeAssetId(assetId),
    );
  }
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

function migrateEvmTokens(
  backgroundState: Record<string, unknown>,
  assetsController: AssetsControllerState,
  addressToId: Record<string, string>,
  relevantAccountIds: Set<string>,
): void {
  const allTokens = readPath(backgroundState, [
    'TokensController',
    'allTokens',
  ]);

  if (!isObject(allTokens)) {
    return;
  }

  for (const [hexChainId, accountTokens] of Object.entries(allTokens)) {
    if (!isObject(accountTokens)) {
      continue;
    }

    for (const [rawAddress, tokens] of Object.entries(accountTokens)) {
      if (!Array.isArray(tokens)) {
        continue;
      }

      const accountId = addressToId[rawAddress.toLowerCase()];
      const accountIsRelevant =
        Boolean(accountId) && relevantAccountIds.has(accountId);

      for (const token of tokens) {
        if (
          !isObject(token) ||
          token.isERC721 === true ||
          typeof token.address !== 'string' ||
          !token.address
        ) {
          continue;
        }

        const assetId = buildErc20AssetId(hexChainId, token.address);
        if (!assetId) {
          continue;
        }

        writeAssetInfoIfAbsent(
          assetsController,
          assetId,
          buildEvmAssetInfo(token),
        );

        if (accountIsRelevant && accountId) {
          addCustomAsset(assetsController, accountId, assetId);
        }
      }
    }
  }
}

function buildNonEvmAssetInfo(assetId: string, metadata: unknown): AssetInfo {
  const fallback: AssetInfo = {
    type: assetTypeFromCaip19(assetId),
    symbol: '',
    name: '',
    decimals: 0,
  };

  if (!isObject(metadata) || metadata.fungible !== true) {
    return fallback;
  }

  const units = Array.isArray(metadata.units) ? metadata.units : [];
  const firstUnit = isObject(units[0]) ? units[0] : undefined;
  const symbol =
    typeof metadata.symbol === 'string'
      ? metadata.symbol
      : firstUnit && typeof firstUnit.symbol === 'string'
        ? firstUnit.symbol
        : '';

  const assetInfo: AssetInfo = {
    type: assetTypeFromCaip19(assetId),
    symbol,
    name: typeof metadata.name === 'string' ? metadata.name : '',
    decimals:
      firstUnit && typeof firstUnit.decimals === 'number'
        ? firstUnit.decimals
        : 0,
  };

  if (typeof metadata.iconUrl === 'string' && metadata.iconUrl) {
    assetInfo.image = metadata.iconUrl;
  }

  return assetInfo;
}

function migrateNonEvmAssets(
  backgroundState: Record<string, unknown>,
  assetsController: AssetsControllerState,
  relevantAccountIds: Set<string>,
): void {
  const accountsAssets = readPath(backgroundState, [
    'MultichainAssetsController',
    'accountsAssets',
  ]);

  if (!isObject(accountsAssets)) {
    return;
  }

  const assetsMetadata = readPath(backgroundState, [
    'MultichainAssetsController',
    'assetsMetadata',
  ]);
  const metadataByAssetId = isObject(assetsMetadata) ? assetsMetadata : {};

  for (const [accountId, assetIds] of Object.entries(accountsAssets)) {
    if (!Array.isArray(assetIds)) {
      continue;
    }

    const accountIsRelevant = relevantAccountIds.has(accountId);

    for (const assetId of assetIds) {
      if (typeof assetId !== 'string' || !assetId || isNativeAssetId(assetId)) {
        continue;
      }

      writeAssetInfoIfAbsent(
        assetsController,
        assetId,
        buildNonEvmAssetInfo(assetId, metadataByAssetId[assetId]),
      );

      if (accountIsRelevant) {
        addCustomAsset(assetsController, accountId, assetId);
      }
    }
  }
}

/**
 * Migration 139: Consolidate imported asset state into AssetsController.
 *
 * User-imported ERC-20 tokens and non-native multichain assets move into
 * AssetsController.assetsInfo and per-account customAssets. Balances are not
 * migrated because AssetsController rebuilds them at runtime.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;
    const assetsController = ensureAssetsController(backgroundState);
    const addressToId = buildAddressToIdMap(backgroundState);
    const relevantAccountIds = collectRelevantAccountIds(
      backgroundState,
      addressToId,
    );

    migrateEvmTokens(
      backgroundState,
      assetsController,
      addressToId,
      relevantAccountIds,
    );
    migrateNonEvmAssets(backgroundState, assetsController, relevantAccountIds);
    cleanupCustomAssets(assetsController);
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to consolidate asset state: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
}
