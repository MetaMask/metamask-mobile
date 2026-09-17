import { createSelector, weakMapMemoize } from 'reselect';
import { BigNumber } from 'bignumber.js';
import type { AccountGroupId } from '@metamask/account-api';
import {
  parseCaipAssetType,
  type CaipAssetType,
  type Hex,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import {
  getAssetId,
  getNativeTokenAddress,
} from '@metamask/assets-controllers';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  normalizeAssetId,
  type AssetBalance,
  type AssetMetadata,
  type AssetPrice,
} from '@metamask/assets-controller';

import {
  getAssetsBalance,
  getAssetsInfo,
  getAssetsPrice,
  getAssetPreferences,
  getSelectedCurrency,
} from '../../../../selectors/assets/assets-controller';
import {
  selectAccountGroupWithInternalAccounts,
  selectSelectedAccountGroupInternalAccounts,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectShowFiatInTestnets } from '../../../../selectors/settings';
import { createDeepEqualSelector } from '../../../../selectors/util';
import type { RootState } from '../../../../reducers';
import { isTestNet } from '../../../../util/networks';
import { isExcludedAsset } from '../../../../enablement/assets/networks-customization';
import { getNetworkBadgeSource } from '../utils/network';
import { type AssetType, TokenStandard } from '../types/token';

/**
 * Assets pipeline built strictly on `AssetsController` state (`assetsInfo`,
 * `assetsBalance`, `assetsPrice`, `assetPreferences`).
 *
 * Joining, decoration and sorting run inside reselect selectors that memoise
 * per store state, so every consumer shares a single computation regardless of
 * how many components subscribe.
 *
 * No legacy controllers (TokensController, TokenBalancesController,
 * TokenRatesController, MultichainAssets*) are read here.
 */

interface AccountRef {
  id: string;
  type: string;
}

const EMPTY_ACCOUNTS: AccountRef[] = [];

export type SelectedAsset = AssetType & {
  isEvmRateEligible: boolean;
  key: string;
  sortKey: number;
};

type AssetsBalanceState = ReturnType<typeof getAssetsBalance>;
type AssetsInfoState = ReturnType<typeof getAssetsInfo>;
type AssetsPriceState = ReturnType<typeof getAssetsPrice>;
type AssetPreferencesState = ReturnType<typeof getAssetPreferences>;

type AssetBalanceSelectorArgs = [
  state: RootState,
  accountGroupId: AccountGroupId | undefined,
  chainId: string | undefined,
  address: string | undefined,
];

/**
 * Accounts of the selected group, reduced to the fields decoration needs.
 *
 * `type` must be carried through: `useSendTokens` filters the list with
 * `token.accountType?.includes(namespace)`, so an asset without `accountType`
 * is silently dropped from every send flow.
 */
const selectSelectedAccounts = createDeepEqualSelector(
  [selectSelectedAccountGroupInternalAccounts],
  (accounts: readonly InternalAccount[]): AccountRef[] =>
    accounts.map((account) => ({ id: account.id, type: account.type })),
);

/**
 * Account IDs for an explicit group, falling back to the selected group when
 * no override is active. `weakMapMemoize` keeps a cache entry per group ID so
 * alternating between an override and the selected group cannot thrash a
 * single-slot cache.
 */
const selectAccountsByGroupId = createSelector(
  [
    selectAccountGroupWithInternalAccounts,
    selectSelectedAccounts,
    (_state: RootState, accountGroupId: AccountGroupId | undefined) =>
      accountGroupId,
  ],
  (groups, selectedAccounts, accountGroupId): AccountRef[] => {
    if (!accountGroupId) {
      return selectedAccounts;
    }

    const group = groups.find((item) => item.id === accountGroupId);

    return group
      ? group.accounts.map((account) => ({
          id: account.id,
          type: account.type,
        }))
      : EMPTY_ACCOUNTS;
  },
  { memoize: weakMapMemoize },
);

/**
 * Flattens `assetsBalance` for the given accounts into `[assetId, balance]`
 * pairs, joined with the owning account so `accountId` survives decoration.
 */
const selectAccountAssetEntries = createSelector(
  [selectAccountsByGroupId, getAssetsBalance],
  (accounts: AccountRef[], assetsBalance: AssetsBalanceState) => {
    const entries: {
      accountId: string;
      accountType: string;
      assetId: CaipAssetType;
      balance: AssetBalance;
    }[] = [];

    for (const account of accounts) {
      const balances = assetsBalance[account.id];

      if (!balances) {
        continue;
      }

      for (const [assetId, balance] of Object.entries(balances)) {
        entries.push({
          accountId: account.id,
          accountType: account.type,
          assetId: assetId as CaipAssetType,
          balance,
        });
      }
    }

    return entries;
  },
  { memoize: weakMapMemoize },
);

/**
 * Joins balances with metadata, price and preferences, then decorates.
 *
 * Computed once per store state and shared by every consumer via reselect
 * memoisation.
 */
export const selectAccountGroupAssets = createSelector(
  [
    selectAccountAssetEntries,
    getAssetsInfo,
    getAssetsPrice,
    getAssetPreferences,
    getSelectedCurrency,
    selectShowFiatInTestnets,
  ],
  (
    entries,
    assetsInfo: AssetsInfoState,
    assetsPrice: AssetsPriceState,
    assetPreferences: AssetPreferencesState,
    selectedCurrency: string,
    showFiatOnTestnets: boolean,
  ): SelectedAsset[] => {
    const assets: SelectedAsset[] = [];

    for (const { accountId, accountType, assetId, balance } of entries) {
      if (assetPreferences[assetId]?.hidden) {
        continue;
      }

      const metadata = assetsInfo[assetId];

      // An asset with a balance but no metadata cannot be rendered.
      if (!metadata) {
        continue;
      }

      const asset = buildAsset({
        accountId,
        accountType,
        assetId,
        balance,
        metadata,
        price: assetsPrice[assetId],
        selectedCurrency,
        showFiatOnTestnets,
      });

      if (!asset) {
        continue;
      }

      // Some chains expose an ERC-20 that duplicates the native gas token
      // (Arc USDC, Stable USDT0). Including both double-counts the balance.
      if (
        !asset.isNative &&
        asset.chainId &&
        asset.address &&
        isExcludedAsset(asset.chainId, asset.address)
      ) {
        continue;
      }

      assets.push(asset);
    }

    assets.sort((a, b) => b.sortKey - a.sortKey);

    return assets;
  },
  { memoize: weakMapMemoize },
);

/** Assets for a group that hold a non-zero balance. */
export const selectAccountGroupAssetsWithBalance = createSelector(
  [selectAccountGroupAssets],
  (assets: SelectedAsset[]): SelectedAsset[] => {
    const withBalance = assets.filter(hasBalance);

    return withBalance.length === assets.length ? assets : withBalance;
  },
  { memoize: weakMapMemoize },
);

const selectAccountGroupAssetId = createSelector(
  [
    (...[, , chainId]: AssetBalanceSelectorArgs) => chainId,
    (...[, , , address]: AssetBalanceSelectorArgs) => address?.toLowerCase(),
    (state: RootState) =>
      state.engine.backgroundState.NetworkEnablementController
        ?.nativeAssetIdentifiers,
  ],
  (chainId, address, nativeAssetIdentifiers) => {
    if (address === undefined || chainId === undefined) {
      return undefined;
    }

    const assetId = getAssetId({
      chainId: chainId as Hex,
      nativeAssetIdentifiers,
      tokenAddress: address,
    });

    if (
      !assetId ||
      (assetId.includes('/erc20:') && isExcludedAsset(chainId, address))
    ) {
      return undefined;
    }

    // AssetsController keys ERC-20s by checksummed CAIP-19 ID. Normalize once
    // per token rather than scanning every asset for case-insensitive matches.
    try {
      return normalizeAssetId(assetId);
    } catch {
      return undefined;
    }
  },
  { memoize: weakMapMemoize },
);

const selectAccountGroupAssetAmount = createSelector(
  [
    selectAccountsByGroupId,
    getAssetsBalance,
    selectAccountGroupAssetId,
    (...args: AssetBalanceSelectorArgs) => {
      const assetId = selectAccountGroupAssetId(...args);
      return assetId ? getAssetsPrice(args[0])[assetId]?.price : undefined;
    },
    (...[state, , chainId]: AssetBalanceSelectorArgs) =>
      !selectShowFiatInTestnets(state) &&
      Boolean(chainId && isTestNet(chainId as Hex)),
  ],
  (accounts, assetsBalance, assetId, price, isFiatHidden) => {
    if (!assetId) {
      return undefined;
    }

    let selectedAmount: string | undefined;
    let highestSortKey = -Infinity;

    // Only visit accounts in this group. Each balance is a keyed lookup;
    // duplicate holdings retain the token list's highest-fiat-first behavior.
    for (const account of accounts) {
      const balance = assetsBalance[account.id]?.[assetId];
      if (!balance) {
        continue;
      }

      const amount = typeof balance.amount === 'string' ? balance.amount : '0';
      const humanBalance = Number(amount);
      const sortKey =
        !isFiatHidden && price !== undefined && Number.isFinite(humanBalance)
          ? humanBalance * price
          : 0;

      if (selectedAmount === undefined || sortKey > highestSortKey) {
        selectedAmount = amount;
        highestSortKey = sortKey;
      }
    }

    return selectedAmount;
  },
  { memoize: weakMapMemoize },
);

/**
 * Reads one asset's balance directly from controller state without building
 * the decorated asset list. Only the selected balance is converted to raw units.
 * Primitive inputs keep the result stable when unrelated assets change.
 */
export const selectAccountGroupAssetBalance = createSelector(
  [
    selectAccountGroupAssetAmount,
    (...args: AssetBalanceSelectorArgs) => {
      const assetId = selectAccountGroupAssetId(...args);
      const metadata = assetId ? getAssetsInfo(args[0])[assetId] : undefined;

      if (
        !assetId ||
        !metadata ||
        getAssetPreferences(args[0])[assetId]?.hidden
      ) {
        return undefined;
      }

      return 'decimals' in metadata ? metadata.decimals : 0;
    },
  ],
  (amount, decimals) => {
    if (amount === undefined || decimals === undefined) {
      return undefined;
    }

    const rawBalance = toRawBalance(amount, decimals);
    return rawBalance === undefined ? undefined : { decimals, rawBalance };
  },
  { memoize: weakMapMemoize },
);

export function hasBalance(asset: SelectedAsset): boolean {
  return (
    (asset.fiat?.balance !== undefined && asset.fiat.balance > 0) ||
    (Boolean(asset.rawBalance) && asset.rawBalance !== '0x0')
  );
}

function buildAsset({
  accountId,
  accountType,
  assetId,
  balance,
  metadata,
  price,
  selectedCurrency,
  showFiatOnTestnets,
}: {
  accountId: string;
  accountType: string;
  assetId: CaipAssetType;
  balance: AssetBalance;
  metadata: AssetMetadata;
  price: AssetPrice | undefined;
  selectedCurrency: string;
  showFiatOnTestnets: boolean;
}): SelectedAsset | undefined {
  const parsed = parseCaipAsset(assetId);

  if (!parsed) {
    return undefined;
  }

  const { address, chainId, isEvm, isNative } = parsed;

  // Matches the controller's `Asset` contract: EVM assets expose the hex token
  // address as `assetId`, non-EVM assets expose the CAIP-19 ID. Consumers rely
  // on both forms -- `useCurrencyConversions` reads it as an address, while
  // `useSendActions` casts it to `CaipAssetType`.
  const publicAssetId = isEvm ? address : assetId;

  // Mirrors `isEvmRateEligible`: EVM-scoped with a usable address.
  const isEvmRateEligible = isEvm && Boolean(address);

  const isFiatHidden =
    !showFiatOnTestnets && Boolean(chainId) && isTestNet(chainId as Hex);

  const decimals = 'decimals' in metadata ? metadata.decimals : 0;

  // `assetsBalance` amounts are already human-readable decimal strings (e.g.
  // "0.0001" for an 18-decimal token), NOT raw base units. They must not be
  // divided by `10 ** decimals`.
  const amount = typeof balance?.amount === 'string' ? balance.amount : '0';
  const humanBalance = Number(amount);

  const fiatBalance =
    !isFiatHidden && price?.price !== undefined && Number.isFinite(humanBalance)
      ? humanBalance * price.price
      : undefined;

  return {
    accountId,
    // Required by `useSendTokens`, which filters on
    // `accountType.includes(<chain namespace>)`.
    accountType,
    address,
    aggregators:
      'aggregators' in metadata
        ? (metadata.aggregators as string[])
        : undefined,
    assetId: publicAssetId,
    balance: amount,
    chainId,
    decimals,
    fiat:
      fiatBalance === undefined
        ? undefined
        : {
            balance: fiatBalance,
            conversionRate: price?.price,
            currency: selectedCurrency,
          },
    image: metadata.image ?? '',
    isETH: isNative && isEvm,
    isEvmRateEligible,
    isNative,
    key: `${chainId.toLowerCase()}:${(address ?? '').toLowerCase()}`,
    logo: metadata.image ?? undefined,
    name: metadata.name ?? '',
    networkBadgeSource: getNetworkBadgeSource(chainId as Hex),
    rawBalance: toRawBalance(amount, decimals),
    sortKey: isFiatHidden ? 0 : (fiatBalance ?? 0),
    standard: TokenStandard.ERC20,
    symbol: metadata.symbol ?? '',
  } as SelectedAsset;
}

/**
 * Splits a CAIP-19 asset ID into the fields the confirmation asset shape
 * needs. Returns `undefined` for IDs that cannot be parsed rather than
 * throwing, so one malformed entry cannot break the whole list.
 */
function parseCaipAsset(assetId: CaipAssetType):
  | {
      address: string | undefined;
      chainId: string;
      isEvm: boolean;
      isNative: boolean;
    }
  | undefined {
  try {
    const {
      chainId: caipChainId,
      assetNamespace,
      assetReference,
    } = parseCaipAssetType(assetId);

    const [namespace, reference] = caipChainId.split(':');
    const isEvm = namespace === 'eip155';
    const isNative = assetNamespace === 'slip44' || assetNamespace === 'native';

    // EVM consumers compare against hex chain IDs; non-EVM keep CAIP form.
    const chainId = isEvm ? toHex(reference) : caipChainId;

    // Native EVM assets must carry the native token address, not an empty
    // string: consumers match the pay token by address
    // (`usePayTokenAccountBalance`) and derive `isNative` from
    // `address === getNativeTokenAddress(chainId)` (`useTransactionPayToken`).
    let address: string | undefined;

    if (isEvm) {
      address = isNative
        ? getNativeTokenAddress(chainId as Hex)
        : assetReference;
    }

    return {
      address,
      chainId,
      isEvm,
      isNative,
    };
  } catch {
    return undefined;
  }
}

/**
 * Converts the human-readable decimal amount back into raw base units.
 *
 * Consumers such as `usePayTokenAccountBalance` run `new BigNumber(rawBalance)`
 * and expect an exact integer, so this uses BigNumber rather than float maths
 * to avoid precision loss on 18-decimal tokens.
 */
function toRawBalance(amount: string, decimals: number): Hex | undefined {
  try {
    const raw = new BigNumber(amount).shiftedBy(decimals);

    if (!raw.isFinite()) {
      return undefined;
    }

    return `0x${raw.integerValue(BigNumber.ROUND_DOWN).toString(16)}` as Hex;
  } catch {
    return undefined;
  }
}
