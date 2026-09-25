import { createSelector, weakMapMemoize } from 'reselect';
import { BigNumber } from 'bignumber.js';
import type { AccountGroupId } from '@metamask/account-api';
import {
  parseCaipAssetType,
  type CaipAssetType,
  type CaipChainId,
  type Hex,
} from '@metamask/utils';
import {
  CHAIN_IDS_WITH_NO_NATIVE_TOKEN,
  toHex,
} from '@metamask/controller-utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
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
import { selectStablecoins } from '../../../../selectors/featureFlagController/stableTokens';
import type { RootState } from '../../../../reducers';
import { isNetworkTestnet } from '../hooks/send/useNetworkFilter';
import {
  ARC_USDC_ERC20_TOKEN_ADDRESS,
  STABLE_USDT0_ERC20_ADDRESS,
} from '../../../../enablement/assets/networks-customization';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { isTronSpecialAsset } from '../../../../core/Multichain/utils';
import { getNetworkBadgeSource } from '../utils/network';
import { formatFiat } from '../utils/fiat';
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

const EMPTY_ACCOUNTS: AccountRef[] = [];

/**
 * The pooled-staking vault token, surfaced as "Staked Ethereum" rather than a
 * regular entry. Lowercased at module load so lookups are case-insensitive.
 */
const EXCLUDED_STAKED_ASSET_IDS: ReadonlySet<string> = new Set(
  [
    'eip155:1/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df',
    'eip155:560048/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df',
  ].map((assetId) => assetId.toLowerCase()),
);

/**
 * Chain-specific ERC-20s that duplicate the chain's native gas token (Arc
 * USDC, Stable USDT0). Keys and values are lowercased at module load so
 * lookups are case-insensitive.
 */
const EXCLUDED_ASSET_ADDRESS_BY_CHAIN_ID: Record<string, string> =
  Object.fromEntries(
    Object.entries({
      [NETWORKS_CHAIN_ID.ARC]: ARC_USDC_ERC20_TOKEN_ADDRESS,
      [NETWORKS_CHAIN_ID.STABLE]: STABLE_USDT0_ERC20_ADDRESS,
    }).map(([chainId, address]) => [
      chainId.toLowerCase(),
      address.toLowerCase(),
    ]),
  );

interface AccountRef {
  id: string;
  type: string;
}

interface ParsedCaipAsset {
  address: string | undefined;
  caipChainId: CaipChainId;
  chainId: string;
  isEvm: boolean;
  isNative: boolean;
}

export type ConfirmationAsset = AssetType & {
  key: string;
  sortKey: number;
};

type AssetsBalanceState = ReturnType<typeof getAssetsBalance>;
type AssetsInfoState = ReturnType<typeof getAssetsInfo>;
type AssetsPriceState = ReturnType<typeof getAssetsPrice>;
type AssetPreferencesState = ReturnType<typeof getAssetPreferences>;

/**
 * A held asset with every piece of controller state it needs joined onto it:
 * balance, metadata, price, and the owning account.
 */
interface BaseAsset {
  accountId: string;
  accountType: string;
  address: string | undefined;
  assetId: CaipAssetType;
  balance: AssetBalance;
  chainId: string;
  isEvm: boolean;
  isNative: boolean;
  metadata: AssetMetadata;
  /**
   * Undefined when no market data is known for the asset. Unlike `balance` --
   * guaranteed present because these entries are built by iterating
   * `assetsBalance` -- price is a lookup into a separate slice that can miss.
   * A held asset with no price is still a real holding, so it stays in the
   * list with no fiat value rather than being dropped.
   */
  price: AssetPrice | undefined;
}

/**
 * Accounts of an explicit group, falling back to the selected group when no
 * override is active, reduced to the fields decoration needs.
 *
 * `type` must be carried through: `useSendTokens` filters the list with
 * `token.accountType?.includes(namespace)`, so an asset without `accountType`
 * is silently dropped from every send flow.
 *
 * `weakMapMemoize` keeps a cache entry per group ID so alternating between an
 * override and the selected group cannot thrash a single-slot cache.
 */
const selectAccountsByAccountGroupId = createSelector(
  [
    selectAccountGroupWithInternalAccounts,
    selectSelectedAccountGroupInternalAccounts,
    (_state: RootState, accountGroupId: AccountGroupId | undefined) =>
      accountGroupId,
  ],
  (groups, selectedAccounts, accountGroupId): AccountRef[] => {
    const accounts = accountGroupId
      ? groups.find((item) => item.id === accountGroupId)?.accounts
      : selectedAccounts;

    if (!accounts) {
      return EMPTY_ACCOUNTS;
    }

    return accounts.map((account) => ({
      id: account.id,
      type: account.type,
    }));
  },
  { memoize: weakMapMemoize },
);

/**
 * Joins the group's accounts against every asset slice of controller state,
 * flattened into one entry per held asset and tagged with the owning account
 * so `accountId` survives decoration.
 *
 * This is the single point at which raw controller state is read; the
 * confirmation selector downstream only adds its own display fields, so
 * nothing else needs to know how the controller shapes its slices.
 *
 * Every reason to drop a holding is applied here rather than during
 * decoration, so `decorateAsset` never does work it has to throw away:
 * assets the user hid (`assetPreferences` is keyed by asset ID alone, so
 * hiding applies across every account), assets with a balance but no metadata
 * or an unparseable ID, which cannot be rendered, and the chain-specific
 * ERC-20s that duplicate a native gas token.
 *
 * Iterating `assetsBalance[accountId]` matches the controller's own notion of
 * which assets an account holds -- `getAccountAssetsByScope` walks exactly
 * these keys. The map is the tracked-asset index rather than a non-zero-only
 * list, so zero-amount holdings are present here and reach consumers that ask
 * for them via `includeNoBalance`.
 */
const selectAssetsByAccountGroupId = createSelector(
  [
    selectAccountsByAccountGroupId,
    getAssetsBalance,
    getAssetsInfo,
    getAssetPreferences,
    getAssetsPrice,
  ],
  (
    accounts: AccountRef[],
    assetsBalance: AssetsBalanceState,
    assetsInfo: AssetsInfoState,
    assetPreferences: AssetPreferencesState,
    assetsPrice: AssetsPriceState,
  ): BaseAsset[] => {
    const entries: BaseAsset[] = [];

    for (const account of accounts) {
      const balances = assetsBalance[account.id];

      if (!balances) {
        continue;
      }

      for (const [assetId, balance] of Object.entries(balances)) {
        const typedAssetId = assetId as CaipAssetType;

        if (assetPreferences[typedAssetId]?.hidden) {
          continue;
        }

        const metadata = assetsInfo[typedAssetId];

        if (!metadata) {
          continue;
        }

        const parsed = parseCaipAsset(typedAssetId);

        if (!parsed) {
          continue;
        }

        const { address, chainId, isEvm, isNative } = parsed;

        if (isExcludedAsset(typedAssetId, parsed)) {
          continue;
        }

        entries.push({
          accountId: account.id,
          accountType: account.type,
          address,
          assetId: typedAssetId,
          balance,
          chainId,
          isEvm,
          isNative,
          metadata,
          price: assetsPrice[typedAssetId],
        });
      }
    }

    return entries;
  },
  { memoize: weakMapMemoize },
);

/**
 * Adds the confirmation-specific display fields to each joined asset and
 * sorts by fiat balance.
 *
 * `currencyOverride` is the currency that the display string
 * (`balanceInSelectedCurrency`) is denominated in; `fiat` always stays in the
 * user's preferred currency. Pay-flow confirmations price everything in USD,
 * and taking that as an argument rather than reading the transaction keeps
 * this file free of any knowledge of transaction types.
 *
 * Computed once per store state and shared by every consumer via reselect
 * memoisation.
 */
export const selectConfirmationAssetsByAccountGroupId = createSelector(
  [
    selectAssetsByAccountGroupId,
    getSelectedCurrency,
    (
      _state: RootState,
      _accountGroupId: AccountGroupId | undefined,
      currencyOverride?: string,
    ) => currencyOverride,
    selectShowFiatInTestnets,
    selectStablecoins,
  ],
  (
    entries: BaseAsset[],
    selectedCurrency: string,
    currencyOverride: string | undefined,
    showFiatOnTestnets: boolean,
    stablecoins: Record<Hex, Hex[]>,
  ): ConfirmationAsset[] => {
    const assets = entries.map((entry) =>
      decorateAsset({
        ...entry,
        displayCurrency: currencyOverride ?? selectedCurrency,
        selectedCurrency,
        showFiatOnTestnets,
        stablecoins,
      }),
    );

    assets.sort((a, b) => b.sortKey - a.sortKey);

    return assets;
  },
  { memoize: weakMapMemoize },
);

/** Assets for a group that hold a non-zero balance. */
export const selectConfirmationAssetsWithBalanceByAccountGroupId =
  createSelector(
    [selectConfirmationAssetsByAccountGroupId],
    (assets: ConfirmationAsset[]): ConfirmationAsset[] => {
      const withBalance = assets.filter(hasBalance);

      return withBalance.length === assets.length ? assets : withBalance;
    },
    { memoize: weakMapMemoize },
  );

function hasBalance(asset: ConfirmationAsset): boolean {
  return (
    (asset.fiat?.balance !== undefined && asset.fiat.balance > 0) ||
    (Boolean(asset.rawBalance) && asset.rawBalance !== '0x0')
  );
}

/**
 * Price of one unit of the asset in `displayCurrency`, or `undefined` when no
 * usable rate exists.
 *
 * `AssetPrice.price` is already denominated in the user's preferred currency,
 * so it only serves the non-override case. When the caller overrides to USD
 * the rate must come from `usdPrice`; falling back to `price` there would
 * label a preferred-currency amount with a dollar sign.
 *
 * Mirrors the rate selection that `useTokenFiatRates` performed before this
 * pipeline moved into selectors, including the stablecoin bypass: a token on
 * the remote-flagged stablecoin list is pinned to exactly 1 USD rather than
 * inheriting the price API's drift around the peg.
 */
function getDisplayRate({
  address,
  chainId,
  displayCurrency,
  price,
  stablecoins,
}: {
  address: string | undefined;
  chainId: string;
  displayCurrency: string;
  price: AssetPrice | undefined;
  stablecoins: Record<Hex, Hex[]>;
}): number | undefined {
  if (displayCurrency.toLowerCase() !== 'usd') {
    return price?.price;
  }

  const isStablecoin = Boolean(
    address &&
      stablecoins[chainId.toLowerCase() as Hex]?.includes(
        address.toLowerCase() as Hex,
      ),
  );

  if (isStablecoin) {
    return 1;
  }

  // `usdPrice` is only present on fungible prices; NFT prices have no USD
  // figure, so there is nothing safe to display.
  return price && 'usdPrice' in price ? price.usdPrice : undefined;
}

/**
 * The fiat amount to display for a balance.
 *
 * A zero balance is worth zero in every currency, so it displays as `$0` even
 * with no price available. Without that branch a priceless zero-balance token
 * renders a blank cell instead.
 */
function deriveDisplayBalance(
  humanBalance: number,
  isBalanceUsable: boolean,
  displayRate: number | undefined,
): number | undefined {
  if (!isBalanceUsable) {
    return undefined;
  }

  if (displayRate !== undefined) {
    return humanBalance * displayRate;
  }

  return humanBalance === 0 ? 0 : undefined;
}

/**
 * Whether a held asset should never appear in the confirmation token list:
 * Tron network resources, the pooled-staking vault token, native tokens on
 * chains that have none, and ERC-20s duplicating the native gas token.
 *
 * TODO: Duplicates rules that are private to `app/core/Multichain`,
 * `app/selectors/assets/assets-migration.ts` and
 * `app/enablement/assets/networks-customization.ts`. The assets team should
 * expose this as one universal util from the controller.
 */
function isExcludedAsset(
  assetId: CaipAssetType,
  { address, caipChainId, chainId, isNative }: ParsedCaipAsset,
): boolean {
  // Hoisted: `isTronSpecialAsset` is declared as a `assetId is string` type
  // predicate, so calling it inline narrows `assetId` to `never` in the rest
  // of the condition.
  const isStakedAsset = EXCLUDED_STAKED_ASSET_IDS.has(assetId.toLowerCase());

  if (isTronSpecialAsset(assetId) || isStakedAsset) {
    return true;
  }

  if (isNative) {
    // The constant is a readonly tuple of two literals, so `includes` rejects
    // any wider CAIP chain ID without this widening.
    return (CHAIN_IDS_WITH_NO_NATIVE_TOKEN as readonly string[]).includes(
      caipChainId,
    );
  }

  return (
    Boolean(address) &&
    EXCLUDED_ASSET_ADDRESS_BY_CHAIN_ID[chainId.toLowerCase()] ===
      (address as string).toLowerCase()
  );
}

function decorateAsset({
  accountId,
  accountType,
  address,
  assetId,
  balance,
  chainId,
  displayCurrency,
  isEvm,
  isNative,
  metadata,
  price,
  selectedCurrency,
  showFiatOnTestnets,
  stablecoins,
}: BaseAsset & {
  displayCurrency: string;
  selectedCurrency: string;
  showFiatOnTestnets: boolean;
  stablecoins: Record<Hex, Hex[]>;
}): ConfirmationAsset {
  // Matches the controller's `Asset` contract: EVM assets expose the hex token
  // address as `assetId`, non-EVM assets expose the CAIP-19 ID. Consumers rely
  // on both forms -- `useCurrencyConversions` reads it as an address, while
  // `useSendActions` casts it to `CaipAssetType`.
  const publicAssetId = isEvm ? address : assetId;

  // `isNetworkTestnet` handles both hex and CAIP chain IDs, so non-EVM
  // testnets (Solana Devnet, Bitcoin testnets) are covered too.
  const isFiatHidden =
    !showFiatOnTestnets && Boolean(chainId) && isNetworkTestnet(chainId);

  const decimals = 'decimals' in metadata ? metadata.decimals : 0;

  // `assetsBalance` amounts are already human-readable decimal strings (e.g.
  // "0.0001" for an 18-decimal token), NOT raw base units. They must not be
  // divided by `10 ** decimals`.
  const amount = typeof balance?.amount === 'string' ? balance.amount : '0';
  const humanBalance = Number(amount);
  const isBalanceUsable = !isFiatHidden && Number.isFinite(humanBalance);

  const fiatBalance =
    isBalanceUsable && price?.price !== undefined
      ? humanBalance * price.price
      : undefined;

  const displayRate = getDisplayRate({
    address,
    chainId,
    displayCurrency,
    price,
    stablecoins,
  });

  const displayBalance = deriveDisplayBalance(
    humanBalance,
    isBalanceUsable,
    displayRate,
  );

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
    balanceInSelectedCurrency: formatFiat(displayBalance, displayCurrency),
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
    isNative,
    key: `${chainId.toLowerCase()}:${(address ?? '').toLowerCase()}`,
    logo: metadata.image ?? undefined,
    name: metadata.name ?? '',
    networkBadgeSource: getNetworkBadgeSource(chainId as Hex),
    rawBalance: toRawBalance(amount, decimals),
    sortKey: isFiatHidden ? 0 : (fiatBalance ?? 0),
    standard: TokenStandard.ERC20,
    symbol: metadata.symbol ?? '',
  } as ConfirmationAsset;
}

/**
 * Splits a CAIP-19 asset ID into the fields the confirmation asset shape
 * needs. Returns `undefined` for IDs that cannot be parsed rather than
 * throwing, so one malformed entry cannot break the whole list.
 */
function parseCaipAsset(assetId: CaipAssetType): ParsedCaipAsset | undefined {
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
      caipChainId,
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
