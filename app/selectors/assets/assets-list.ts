import type { AccountGroupId } from '@metamask/account-api';
import {
  AccountGroupAssets,
  Asset,
  AssetListState,
  selectAllAssets as _selectAllAssets,
  selectAssetsBySelectedAccountGroup as _selectAssetsBySelectedAccountGroup,
  getNativeTokenAddress,
} from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import {
  MULTICHAIN_NETWORK_DECIMAL_PLACES,
  toEvmCaipChainId,
} from '@metamask/multichain-network-controller';
import {
  CaipAssetType,
  CaipChainId,
  Hex,
  isCaipChainId,
  parseCaipAssetType,
} from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { createSelector } from 'reselect';

import I18n from '../../../locales/i18n';
import { getLocaleLanguageCode } from '../../components/hooks/useFormatters';
import { TokenI } from '../../components/UI/Tokens/types';
import { sortAssetsWithPriority } from '../../components/UI/Tokens/util/sortAssetsWithPriority';
import { KnownCaip19Id } from '../../core/Multichain/constants';
import { isTronSpecialAsset } from '../../core/Multichain/utils';
import { RootState } from '../../reducers';
import { formatWithThreshold } from '../../util/assets';
import {
  fromWei,
  hexToBigInt,
  weiToFiatNumber,
} from '../../util/number/bigint';
import { selectSelectedInternalAccountAddress } from '../accountsController';
import { selectAccountsByChainId } from '../accountTrackerController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../currencyRateController';
import { selectSelectedInternalAccountByScope } from '../multichainAccounts/accounts';
import { selectSelectedAccountGroup } from '../multichainAccounts/accountTreeController';
import {
  getAssetsBalance,
  getAssetsPrice,
  getSelectedCurrency,
} from './assets-controller';
import { selectEvmNetworkConfigurationsByChainId } from '../networkController';
import { selectEnabledNetworksByNamespace } from '../networkEnablementController';
import { selectTokenSortConfig } from '../preferencesController';
import { selectHideZeroBalanceTokens } from '../settings';
import { selectAllTokens } from '../tokensController';
import { createDeepEqualSelector } from '../util';
import {
  getAccountTrackerControllerAccountsByChainId,
  getCurrencyRateControllerCurrencyRates,
  getCurrencyRateControllerCurrentCurrency,
  getMultiChainAssetsControllerAccountsAssets,
  getMultiChainAssetsControllerAllIgnoredAssets,
  getMultiChainAssetsControllerAssetsMetadata,
  getMultiChainBalancesControllerBalances,
  getMultichainAssetsRatesControllerConversionRates,
  getTokenBalancesControllerTokenBalances,
  getTokenRatesControllerMarketData,
  getTokensControllerAllIgnoredTokens,
  getTokensControllerAllTokens,
} from './assets-migration';
import { isAssetSupportActivation } from '../stellar/stellar-assets';
import { filterExcludedAssets } from '../../enablement/assets/networks-customization';

/**
 * Structured map of Tron special assets for efficient access.
 *
 * Includes network resources (Energy, Bandwidth and their max capacities),
 * staking-related assets (staked TRX for Energy/Bandwidth, total staked TRX),
 * and additional staking lifecycle assets (Ready for Withdrawal, Staking
 * Rewards, In Lock Period).
 */
/**
 * Minimal representation of a Tron special asset consumed by the wallet UI.
 *
 * Only the fields actually read by consumers are modeled here so the selector
 * can build these objects straight from unified `AssetsController` state
 * (`assetsBalance` + `assetsInfo` + `assetsPrice`) without reconstructing the
 * full assets-controllers `Asset` shape.
 */
export interface TronSpecialAsset {
  /** CAIP-19 asset id (e.g. `tron:728126428/slip44:energy`) */
  assetId: string;
  /** Human-readable balance amount (e.g. `"65.48463"`) */
  balance: string;
  /** Fiat conversion in the user's selected currency, if a price is known */
  fiat: { balance: number; currency: string } | undefined;
  /**
   * True when the upstream API could not fetch this value and returned
   * `null`. Unknown values must be surfaced as "unavailable" by the UI,
   * never rendered as zero.
   */
  unknown?: boolean;
}

/**
 * Fetch state of the Tron data backing the map. All fields (resources, staking,
 * lifecycle) come from the same Account Activity API balance request, so a
 * single status is enough: `'loading'` while no balance data has been fetched
 * for the selected accounts yet (consumers must skip computations and render
 * no values), `'ready'` once balance data exists — from that point each field
 * is either readable or flagged as {@link TronSpecialAsset.unknown}.
 */
export const TronSpecialAssetsStatus = {
  Loading: 'loading',
  Ready: 'ready',
} as const;

export type TronSpecialAssetsStatus =
  (typeof TronSpecialAssetsStatus)[keyof typeof TronSpecialAssetsStatus];

export interface TronSpecialAssetsMap {
  /**
   * Whether the underlying balance request has been fetched. Derived from the
   * presence of the TRX native balance entry (a fetched Tron account always
   * has one), since `AssetsController` state carries no in-flight flag.
   */
  status: TronSpecialAssetsStatus;
  /** Current available energy */
  energy: TronSpecialAsset | undefined;
  /** Current available bandwidth */
  bandwidth: TronSpecialAsset | undefined;
  /** Maximum energy capacity */
  maxEnergy: TronSpecialAsset | undefined;
  /** Maximum bandwidth capacity */
  maxBandwidth: TronSpecialAsset | undefined;
  /** TRX staked for energy (sTRX-Energy) */
  stakedTrxForEnergy: TronSpecialAsset | undefined;
  /** TRX staked for bandwidth (sTRX-Bandwidth) */
  stakedTrxForBandwidth: TronSpecialAsset | undefined;
  /** Total staked TRX (sum of energy + bandwidth staking) */
  totalStakedTrx: number;
  /** TRX ready for withdrawal (unstaked TRX that has completed the lock period) */
  trxReadyForWithdrawal: TronSpecialAsset | undefined;
  /** TRX staking rewards */
  trxStakingRewards: TronSpecialAsset | undefined;
  /** TRX in lock period (unstaked but waiting for lock period to end) */
  trxInLockPeriod: TronSpecialAsset | undefined;
}

type TronSpecialAssetKey = Exclude<
  keyof TronSpecialAssetsMap,
  'totalStakedTrx' | 'status'
>;

/**
 * Maps each Tron special-asset CAIP-19 ID to its semantic key in
 * {@link TronSpecialAssetsMap}. Network-specific IDs collapse to the same key.
 */
const TRON_SPECIAL_ASSET_KEYS = {
  [KnownCaip19Id.EnergyMainnet]: 'energy',
  [KnownCaip19Id.EnergyNile]: 'energy',
  [KnownCaip19Id.EnergyShasta]: 'energy',

  [KnownCaip19Id.BandwidthMainnet]: 'bandwidth',
  [KnownCaip19Id.BandwidthNile]: 'bandwidth',
  [KnownCaip19Id.BandwidthShasta]: 'bandwidth',

  [KnownCaip19Id.MaximumEnergyMainnet]: 'maxEnergy',
  [KnownCaip19Id.MaximumEnergyNile]: 'maxEnergy',
  [KnownCaip19Id.MaximumEnergyShasta]: 'maxEnergy',

  [KnownCaip19Id.MaximumBandwidthMainnet]: 'maxBandwidth',
  [KnownCaip19Id.MaximumBandwidthNile]: 'maxBandwidth',
  [KnownCaip19Id.MaximumBandwidthShasta]: 'maxBandwidth',

  [KnownCaip19Id.TrxStakedForEnergyMainnet]: 'stakedTrxForEnergy',
  [KnownCaip19Id.TrxStakedForEnergyNile]: 'stakedTrxForEnergy',
  [KnownCaip19Id.TrxStakedForEnergyShasta]: 'stakedTrxForEnergy',

  [KnownCaip19Id.TrxStakedForBandwidthMainnet]: 'stakedTrxForBandwidth',
  [KnownCaip19Id.TrxStakedForBandwidthNile]: 'stakedTrxForBandwidth',
  [KnownCaip19Id.TrxStakedForBandwidthShasta]: 'stakedTrxForBandwidth',

  [KnownCaip19Id.TrxReadyForWithdrawalMainnet]: 'trxReadyForWithdrawal',
  [KnownCaip19Id.TrxReadyForWithdrawalNile]: 'trxReadyForWithdrawal',
  [KnownCaip19Id.TrxReadyForWithdrawalShasta]: 'trxReadyForWithdrawal',

  [KnownCaip19Id.TrxStakingRewardsMainnet]: 'trxStakingRewards',
  [KnownCaip19Id.TrxStakingRewardsNile]: 'trxStakingRewards',
  [KnownCaip19Id.TrxStakingRewardsShasta]: 'trxStakingRewards',

  [KnownCaip19Id.TrxInLockPeriodMainnet]: 'trxInLockPeriod',
  [KnownCaip19Id.TrxInLockPeriodNile]: 'trxInLockPeriod',
  [KnownCaip19Id.TrxInLockPeriodShasta]: 'trxInLockPeriod',
} as const satisfies Record<KnownCaip19Id, TronSpecialAssetKey>;

/**
 * Empty constant to avoid creating new objects on each call when no Tron networks are enabled.
 */
const EMPTY_TRON_SPECIAL_ASSETS_MAP: TronSpecialAssetsMap = Object.freeze({
  status: TronSpecialAssetsStatus.Ready,
  energy: undefined,
  bandwidth: undefined,
  maxEnergy: undefined,
  maxBandwidth: undefined,
  stakedTrxForEnergy: undefined,
  stakedTrxForBandwidth: undefined,
  totalStakedTrx: 0,
  trxReadyForWithdrawal: undefined,
  trxStakingRewards: undefined,
  trxInLockPeriod: undefined,
});

const EMPTY_ACCOUNT_TREE: AssetListState['accountTree'] = { wallets: {} };
const EMPTY_INTERNAL_ACCOUNTS: AssetListState['internalAccounts'] = {
  accounts: {},
  selectedAccount: '',
};
const EMPTY_NETWORK_CONFIGURATIONS: AssetListState['networkConfigurationsByChainId'] =
  {};

const getStateForAssetSelector = (state: RootState): AssetListState => {
  const { AccountTreeController, AccountsController, NetworkController } =
    state.engine.backgroundState;

  return {
    accountTree: AccountTreeController?.accountTree ?? EMPTY_ACCOUNT_TREE,
    selectedAccountGroup: AccountTreeController?.selectedAccountGroup ?? '',
    internalAccounts:
      AccountsController?.internalAccounts ?? EMPTY_INTERNAL_ACCOUNTS,
    allTokens: getTokensControllerAllTokens(state),
    allIgnoredTokens: getTokensControllerAllIgnoredTokens(state),
    tokenBalances: getTokenBalancesControllerTokenBalances(state),
    marketData: getTokenRatesControllerMarketData(state),
    assetsMetadata: getMultiChainAssetsControllerAssetsMetadata(state),
    accountsAssets: getMultiChainAssetsControllerAccountsAssets(state),
    allIgnoredAssets: getMultiChainAssetsControllerAllIgnoredAssets(state),
    balances: getMultiChainBalancesControllerBalances(state),
    conversionRates: getMultichainAssetsRatesControllerConversionRates(state),
    currencyRates: getCurrencyRateControllerCurrencyRates(state),
    currentCurrency: getCurrencyRateControllerCurrentCurrency(state),
    networkConfigurationsByChainId:
      NetworkController?.networkConfigurationsByChainId ??
      EMPTY_NETWORK_CONFIGURATIONS,
    accountsByChainId: getAccountTrackerControllerAccountsByChainId(
      state,
    ) as AssetListState['accountsByChainId'],
  };
};

/**
 * Invokes the assets-controllers selector; on failure returns {} so the wallet UI
 * does not red-screen during brief AccountTree / internalAccounts mismatch (e.g. after unlock).
 */
function callSelectAssetsBySelectedAccountGroup(
  assetsState: AssetListState,
  opts?: { filterTronStakedTokens: boolean },
) {
  try {
    return opts === undefined
      ? _selectAssetsBySelectedAccountGroup(assetsState)
      : _selectAssetsBySelectedAccountGroup(assetsState, opts);
  } catch {
    return {};
  }
}

export const selectAssetsBySelectedAccountGroup = createDeepEqualSelector(
  getStateForAssetSelector,
  (assetsState) =>
    filterExcludedAssets(callSelectAssetsBySelectedAccountGroup(assetsState)),
);

/**
 * Cheap boolean check: does the selected account group hold any
 * positive-fiat-balance asset.
 *
 * A held asset is itself a valid swap source (it can be swapped away), so the
 * currently-viewed token is intentionally counted. This drives the Token
 * Details footer's Swap / QuickBuy visibility and the Buy on-ramp fallback.
 */
export const selectHasEligibleSwapSource = createSelector(
  [selectAssetsBySelectedAccountGroup],
  (assetsByChain): boolean => {
    for (const chainAssets of Object.values(assetsByChain)) {
      for (const asset of chainAssets) {
        if ((asset.fiat?.balance ?? 0) > 0) {
          return true;
        }
      }
    }

    return false;
  },
);

const EMPTY_ACCOUNT_GROUP_ASSETS: AccountGroupAssets = {};

const selectAllAssetsGrouped = createDeepEqualSelector(
  getStateForAssetSelector,
  (assetsState) => {
    try {
      return _selectAllAssets(assetsState);
    } catch {
      return {};
    }
  },
);

export const selectAssetsByAccountGroupId = (
  state: RootState,
  accountGroupId: AccountGroupId | undefined,
): AccountGroupAssets => {
  if (!accountGroupId) {
    return EMPTY_ACCOUNT_GROUP_ASSETS;
  }
  const allAssets = selectAllAssetsGrouped(state);
  return allAssets[accountGroupId] ?? EMPTY_ACCOUNT_GROUP_ASSETS;
};

// BIP44 MAINTENANCE: Add these items at controller level, but have them being optional on selectAssetsBySelectedAccountGroup to avoid breaking changes
const selectStakedAssets = createDeepEqualSelector(
  [
    (state: RootState) =>
      state.engine.backgroundState.AccountsController.internalAccounts.accounts,
    selectAccountsByChainId,
    selectEvmNetworkConfigurationsByChainId,
    selectCurrencyRates,
    selectCurrentCurrency,
  ],
  (
    internalAccounts,
    accountsByChainId,
    networkConfigurationsByChainId,
    currencyRates,
    currentCurrency,
  ) => {
    const stakedAssets = Object.entries(accountsByChainId)
      // Only include mainnet and hoodi
      .filter(([chainId, _]) => chainId === '0x1' || chainId === '0x88bb0')
      .flatMap(([chainId, chainAccounts]) =>
        Object.entries(chainAccounts)
          .filter(
            ([_, accountInformation]) =>
              accountInformation.stakedBalance &&
              hexToBigInt(accountInformation.stakedBalance) > 0,
          )
          .map(([address, accountInformation]) => {
            const stakedBalance = accountInformation.stakedBalance as Hex;

            const nativeCurrency =
              networkConfigurationsByChainId[chainId as Hex]?.nativeCurrency ||
              'NATIVE';

            const nativeToken = {
              address: getNativeTokenAddress(chainId as Hex),
              decimals: 18,
              name: nativeCurrency === 'ETH' ? 'Ethereum' : nativeCurrency,
              symbol: nativeCurrency,
            };

            const conversionRate =
              currencyRates[nativeCurrency]?.conversionRate;

            const fiatBalance = conversionRate
              ? weiToFiatNumber(hexToBigInt(stakedBalance), conversionRate)
              : undefined;

            const account = Object.values(internalAccounts).find(
              (internalAccount) =>
                internalAccount.address === address.toLowerCase(),
            );

            if (!account) {
              return undefined;
            }

            const stakedAsset = {
              accountType: account.type,
              assetId: nativeToken.address,
              isNative: true,
              isStaked: true,
              address: nativeToken.address,
              image: '',
              name: 'Staked Ethereum',
              symbol: nativeToken.symbol,
              accountId: account.id,
              decimals: nativeToken.decimals,
              rawBalance: stakedBalance,
              balance: fromWei(hexToBigInt(stakedBalance)),
              fiat: fiatBalance
                ? {
                    balance: Number(fiatBalance),
                    currency: currentCurrency,
                    conversionRate,
                  }
                : undefined,
              chainId,
            } as Asset;

            return {
              chainId,
              accountId: account.id,
              stakedAsset,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      );

    return stakedAssets;
  },
);

export const selectEnabledNetworks = createDeepEqualSelector(
  [selectEnabledNetworksByNamespace],
  (enabledNetworksByNamespace) =>
    Object.values(enabledNetworksByNamespace).flatMap((network) =>
      Object.entries(network)
        .filter(([_, enabled]) => enabled)
        .map(([networkId]) => networkId),
    ),
);

/**
 * Factory that returns a selector for sorted assets by selected account group.
 * @param enabledNetworksSelector - Selector that returns the list of enabled network IDs to filter by. Defaults to selectEnabledNetworks.
 * @returns Memoized selector returning sorted asset keys for the selected account group.
 */
export const createSelectSortedAssetsBySelectedAccountGroup = (
  enabledNetworksSelector = selectEnabledNetworks,
) =>
  createDeepEqualSelector(
    [
      selectAssetsBySelectedAccountGroup,
      enabledNetworksSelector,
      selectTokenSortConfig,
      selectStakedAssets,
      selectHideZeroBalanceTokens,
    ],
    (
      bip44Assets,
      enabledNetworks,
      tokenSortConfig,
      stakedAssets,
      hideZeroBalance,
    ) => {
      const filteredAssets = Object.entries(bip44Assets)
        .filter(([networkId]) => enabledNetworks.includes(networkId))
        .flatMap(([_, chainAssets]) =>
          chainAssets.filter((asset) => {
            if (isTronSpecialAsset(asset.assetId)) return false;
            if (isAssetSupportActivation(asset.assetId)) return true;
            if (
              hideZeroBalance &&
              !asset.isNative &&
              parseFloat(asset.balance ?? '0') === 0
            )
              return false;
            return true;
          }),
        );
      return mergeStakedSortAndDedupeAssets(
        filteredAssets,
        stakedAssets,
        tokenSortConfig,
      );
    },
  );

/** Default selector using selectEnabledNetworks. Use createSelectSortedAssetsBySelectedAccountGroup(customSelector) for a custom enabled-networks source. */
export const selectSortedAssetsBySelectedAccountGroup =
  createSelectSortedAssetsBySelectedAccountGroup();

interface SortedAssetItem {
  address: string;
  chainId: string;
  isStaked: boolean;
}

interface StakedAssetEntry {
  chainId: string;
  accountId: string;
  stakedAsset: Asset;
}

/**
 * Merges staked assets into the list, sorts by token sort config, and deduplicates by assetId-chainId-isStaked.
 * Shared by createSelectSortedAssetsBySelectedAccountGroup and selectSortedAssetsBySelectedAccountGroupForChainIds.
 */
function mergeStakedSortAndDedupeAssets(
  filteredChainAssets: Asset[],
  stakedAssets: StakedAssetEntry[],
  tokenSortConfig: ReturnType<typeof selectTokenSortConfig>,
): SortedAssetItem[] {
  const assets = [...filteredChainAssets];
  const stakedAssetsArray: Asset[] = [];
  for (const asset of assets) {
    if (asset.isNative) {
      const stakedAsset = stakedAssets.find(
        (item) =>
          item.chainId === asset.chainId && item.accountId === asset.accountId,
      );
      if (stakedAsset) {
        stakedAssetsArray.push({ ...stakedAsset.stakedAsset } as Asset);
      }
    }
  }
  assets.push(...stakedAssetsArray);

  const tokensSorted = sortAssetsWithPriority(
    assets.map((asset) => ({
      ...asset,
      tokenFiatAmount: asset.fiat?.balance.toString(),
    })),
    tokenSortConfig,
  );

  const uniqueTokensMap = new Map<string, SortedAssetItem>();
  tokensSorted.forEach(
    ({ assetId, chainId, isStaked }: Asset & { isStaked?: boolean }) => {
      const uniqueKey = `${assetId}-${chainId}-${Boolean(isStaked)}`;
      if (!uniqueTokensMap.has(uniqueKey)) {
        uniqueTokensMap.set(uniqueKey, {
          address: assetId || '',
          chainId: chainId?.toString() || '',
          isStaked: Boolean(isStaked),
        });
      }
    },
  );
  return Array.from(uniqueTokensMap.values());
}

/**
 * Builds a set of network IDs for filtering. listPopularNetworks() returns CAIP-2;
 * asset keys may be Hex for EVM, so we include both forms for eip155:*.
 */
function buildAllowedNetworkIdSet(chainIds: string[]): Set<string> {
  const set = new Set(chainIds);
  for (const id of chainIds) {
    if (id.startsWith('eip155:')) {
      const reference = id.slice(7);
      if (reference) set.add(toHex(reference) as Hex);
    }
  }
  return set;
}

/** Sort config for "by balance" (fiat value descending). Used for homepage so it always shows balance order; View all uses user preference. */
const BALANCE_SORT_CONFIG = {
  key: 'tokenFiatAmount',
  order: 'dsc',
  sortCallback: 'stringNumeric',
} as const;

/**
 * Sorted assets by selected account group filtered by an explicit list of chain IDs (e.g. from listPopularNetworks()).
 * Use when the chain list comes from a hook or callback rather than from state.
 * Respects user's token sort preference (balance vs name).
 * @param state - Redux state
 * @param chainIds - Array of network/chain IDs (CAIP-2 or Hex) to include
 */
export const selectSortedAssetsBySelectedAccountGroupForChainIds =
  createDeepEqualSelector(
    [
      selectAssetsBySelectedAccountGroup,
      (_state: RootState, chainIds: string[]) => chainIds,
      selectTokenSortConfig,
      selectStakedAssets,
    ],
    (bip44Assets, chainIds, tokenSortConfig, stakedAssets) => {
      const allowedIds = buildAllowedNetworkIdSet(chainIds);
      const filteredAssets = Object.entries(bip44Assets)
        .filter(([networkId]) => allowedIds.has(networkId))
        .flatMap(([_, chainAssets]) =>
          chainAssets.filter((asset) => !isTronSpecialAsset(asset.assetId)),
        );
      return mergeStakedSortAndDedupeAssets(
        filteredAssets,
        stakedAssets,
        tokenSortConfig,
      );
    },
  );

/**
 * Like selectSortedAssetsBySelectedAccountGroupForChainIds but always sorts by balance (fiat value desc).
 * Use on the homepage so the tokens section always shows by balance; the full "View all" list keeps the user's sort preference.
 */
export const selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance =
  createDeepEqualSelector(
    [
      selectAssetsBySelectedAccountGroup,
      (_state: RootState, chainIds: string[]) => chainIds,
      selectStakedAssets,
      selectHideZeroBalanceTokens,
    ],
    (bip44Assets, chainIds, stakedAssets, hideZeroBalance) => {
      const allowedIds = buildAllowedNetworkIdSet(chainIds);
      const filteredAssets = Object.entries(bip44Assets)
        .filter(([networkId]) => allowedIds.has(networkId))
        .flatMap(([_, chainAssets]) =>
          chainAssets.filter((asset) => {
            if (isTronSpecialAsset(asset.assetId)) return false;
            if (isAssetSupportActivation(asset.assetId)) return true;
            if (hideZeroBalance && parseFloat(asset.balance ?? '0') === 0)
              return false;
            return true;
          }),
        );
      return mergeStakedSortAndDedupeAssets(
        filteredAssets,
        stakedAssets,
        BALANCE_SORT_CONFIG,
      );
    },
  );

export const makeSelectSortedAssetsBySelectedAccountGroupForChainIdsByBalance =
  (chainIds: string[]) => (state: RootState) =>
    selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance(
      state,
      chainIds,
    );

// TODO BIP44 - Remove this selector and instead pass down the asset from the token list to the list item to avoid unnecessary re-renders
export const selectAsset = createSelector(
  [
    selectAssetsBySelectedAccountGroup,
    selectStakedAssets,
    selectAllTokens,
    selectSelectedInternalAccountAddress,
    selectSelectedInternalAccountByScope,
    (
      _state: RootState,
      params: { address: string; chainId: string; isStaked?: boolean },
    ) => params.address,
    (
      _state: RootState,
      params: { address: string; chainId: string; isStaked?: boolean },
    ) => params.chainId,
    (
      _state: RootState,
      params: { address: string; chainId: string; isStaked?: boolean },
    ) => params.isStaked,
  ],
  (
    assets,
    stakedAssets,
    allTokens,
    selectedAddress,
    getAccountByScope,
    address,
    chainId,
    isStaked,
  ) => {
    const chainIdInCaip = isCaipChainId(chainId)
      ? chainId
      : toEvmCaipChainId(chainId as Hex);

    // Get the account for this chain from the selected account group
    const scopedAccountId = getAccountByScope(chainIdInCaip)?.id;

    const asset = isStaked
      ? stakedAssets.find(
          (item) =>
            item.chainId === chainId &&
            (!scopedAccountId || item.accountId === scopedAccountId) &&
            item.stakedAsset.assetId === address,
        )?.stakedAsset
      : assets[chainId]?.find((item: Asset & { isStaked?: boolean }) => {
          const itemIsStaked = Boolean(item.isStaked);
          const targetIsStaked = Boolean(isStaked);
          return (
            item.assetId === address &&
            (!scopedAccountId || item.accountId === scopedAccountId) &&
            itemIsStaked === targetIsStaked
          );
        });

    // Look up aggregators and rwaData from the original token in allTokens
    const originalToken = selectedAddress
      ? allTokens?.[chainId as Hex]?.[selectedAddress]?.find(
          (token) => token.address.toLowerCase() === address.toLowerCase(),
        )
      : undefined;

    const aggregators = originalToken?.aggregators;
    const rwaData = (originalToken as TokenI | undefined)?.rwaData;

    return asset ? assetToToken(asset, aggregators, rwaData) : undefined;
  },
);

const oneHundredThousandths = 0.00001;
const oneHundredths = 0.01;

// BIP44 MAINTENANCE: Review what fields are really needed
function assetToToken(
  asset: Asset & { isStaked?: boolean },
  aggregators?: string[],
  rwaData?: TokenI['rwaData'],
): TokenI {
  return {
    address: asset.assetId,
    aggregators: aggregators ?? [],
    decimals: asset.decimals,
    image: asset.image,
    name: asset.name,
    symbol: asset.symbol,
    balance: formatWithThreshold(
      parseFloat(asset.balance),
      oneHundredThousandths,
      I18n.locale,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits:
          MULTICHAIN_NETWORK_DECIMAL_PLACES[asset.chainId as CaipChainId] || 5,
      },
    ),
    balanceFiat: asset.fiat
      ? formatWithThreshold(
          asset.fiat.balance,
          oneHundredths,
          getLocaleLanguageCode(),
          {
            style: 'currency',
            currency: asset.fiat.currency,
          },
        )
      : undefined,
    logo:
      asset.accountType.startsWith('eip155') && asset.isNative
        ? '../images/eth-logo-new.png'
        : asset.image,
    isETH:
      asset.accountType.startsWith('eip155') &&
      asset.isNative &&
      asset.symbol === 'ETH',
    isStaked: asset.isStaked || false,
    chainId: asset.chainId,
    isNative: asset.isNative,
    ticker: asset.symbol,
    accountType: asset.accountType,
    rwaData,
  };
}

/**
 * Result of reading one raw Tron value from `AssetsController` state.
 * `absent`: the field (or its section / balance entry) does not exist, so a
 * legacy special-asset entry may stand and otherwise the entry stays unset.
 * `unknown`: the field exists but could not be read (`null` upstream fetch
 * failure, unexpected type, or a non-numeric string), so the UI must show
 * an "unavailable" state instead of a zero.
 * `value`: a readable base-unit raw amount string (e.g. SUN).
 */
type TronValue =
  | { kind: 'absent' }
  | { kind: 'unknown' }
  | { kind: 'value'; amount: string };

const isJsonRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Single grammar for every raw Tron value read from `AssetsController` state.
 * Only numeric strings count as values; `undefined` means the value is absent;
 * everything else (`null`, unexpected types, non-numeric strings) means the
 * upstream value could not be fetched and must never render as zero.
 */
const readTronValue = (raw: unknown): TronValue => {
  if (raw === undefined) {
    return { kind: 'absent' };
  }
  if (typeof raw !== 'string' || new BigNumber(raw).isNaN()) {
    return { kind: 'unknown' };
  }
  return { kind: 'value', amount: raw };
};

/**
 * Converts a raw Tron amount (e.g. SUN for TRX-denominated metadata fields)
 * into its human-readable unit representation using the network decimals.
 * Returns undefined when the network decimals are unknown. Inputs are
 * {@link TronValue} `value` results, i.e. numeric strings.
 */
const convertRawTronAmountToUi = (
  rawAmount: string,
  chainId: string,
): string | undefined => {
  const decimals = MULTICHAIN_NETWORK_DECIMAL_PLACES[chainId as CaipChainId];
  if (decimals === undefined) {
    return undefined;
  }
  return new BigNumber(rawAmount).dividedBy(10 ** decimals).toString();
};

/**
 * Merges Tron energy/bandwidth/staking metadata from the TRX native asset
 * balance entry into the special assets map, per field. A readable metadata
 * value always wins over the legacy special-asset entry. A `null` (or
 * unreadable) metadata value falls back to the legacy special-asset entry when
 * one exists; when it does not, the field is surfaced as an
 * {@link TronSpecialAsset.unknown} entry so the UI can show an "unavailable"
 * state instead of a wrong zero. An absent metadata section leaves the legacy
 * entry untouched.
 */
const applyTronBalanceMetadata = (
  specialAssetsMap: TronSpecialAssetsMap,
  accountBalances: Record<string, { amount?: string; metadata?: unknown }>,
  chainId: string,
  assetsPrice: Record<string, { price?: number } | undefined>,
  selectedCurrency: string,
) => {
  const nativeAssetId = `${chainId}/slip44:195`;
  const balanceData = accountBalances[nativeAssetId];
  if (!balanceData) {
    return;
  }
  const metadata = balanceData.metadata;

  const energySection = isJsonRecord(metadata) ? metadata.energy : undefined;
  const bandwidthSection = isJsonRecord(metadata)
    ? metadata.bandwidth
    : undefined;
  const stakingSection = isJsonRecord(metadata) ? metadata.staking : undefined;

  const trxFiatPrice = assetsPrice[nativeAssetId]?.price;
  const toFiat = (uiAmount: string) =>
    trxFiatPrice === undefined
      ? undefined
      : {
          balance: new BigNumber(uiAmount)
            .multipliedBy(trxFiatPrice)
            .toNumber(),
          currency: selectedCurrency,
        };

  // Staking fields are TRX-denominated raw amounts (SUN) and need conversion
  // to the human-readable unit. Resource fields are raw energy/bandwidth
  // units and pass through untouched.
  const toUiAmount = (raw: string) => convertRawTronAmountToUi(raw, chainId);

  const setUnknown = (key: TronSpecialAssetKey) => {
    if (!specialAssetsMap[key]) {
      specialAssetsMap[key] = {
        assetId: nativeAssetId,
        balance: '0',
        fiat: undefined,
        unknown: true,
      };
    }
  };

  const setFromMetadata = (
    key: TronSpecialAssetKey,
    section: unknown,
    field: string,
    convertToUi: boolean,
  ) => {
    // A section that is not a record means the field was not sent: the legacy
    // special-asset entry stands.
    const read = isJsonRecord(section)
      ? readTronValue(section[field])
      : ({ kind: 'absent' } as TronValue);

    if (read.kind === 'absent') {
      return;
    }

    if (read.kind === 'unknown') {
      // Metadata could not provide the value: fall back to the legacy entry
      // when available, otherwise mark the field as unknown.
      setUnknown(key);
      return;
    }

    // Metadata value wins over the legacy entry.
    const balance = convertToUi ? toUiAmount(read.amount) : read.amount;
    if (balance === undefined) {
      // Network decimals unknown: the value cannot be converted.
      setUnknown(key);
      return;
    }
    specialAssetsMap[key] = {
      assetId: nativeAssetId,
      balance,
      fiat: convertToUi ? toFiat(balance) : undefined,
    };
  };

  setFromMetadata('energy', energySection, 'available', false);
  setFromMetadata('maxEnergy', energySection, 'limit', false);
  setFromMetadata('bandwidth', bandwidthSection, 'available', false);
  setFromMetadata('maxBandwidth', bandwidthSection, 'limit', false);
  setFromMetadata('stakedTrxForEnergy', stakingSection, 'energy', true);
  setFromMetadata('stakedTrxForBandwidth', stakingSection, 'bandwidth', true);
  setFromMetadata('trxStakingRewards', stakingSection, 'rewards', true);
  setFromMetadata('trxInLockPeriod', stakingSection, 'inLockPeriod', true);
  setFromMetadata(
    'trxReadyForWithdrawal',
    stakingSection,
    'readyForWithdrawal',
    true,
  );
};

/**
 * Selects Tron special assets for the currently selected account group.
 *
 * This includes:
 * - **Network resources**: Energy, Bandwidth, and their maximum capacities.
 * - **Staking assets**: TRX staked for Energy/Bandwidth and a pre-computed `totalStakedTrx` sum.
 * - **Staking lifecycle assets**: TRX Ready for Withdrawal, Staking Rewards, and TRX In Lock Period.
 *
 * Two data sources are merged per field, mirroring the extension behavior:
 * **Legacy special assets** (each resource/staking value is its own entry in
 * `assetsBalance`, e.g. `tron:.../slip44:energy`) and **TRX balance metadata**
 * (the Account Activity API reports the values as metadata nested inside the
 * TRX native asset balance: `metadata.staking`, `metadata.bandwidth`,
 * `metadata.energy`).
 *
 * Metadata values win; special-asset balances fill in any value the metadata
 * does not provide. Values that arrive as `null` (upstream fetch failure) with
 * no legacy fallback are surfaced as {@link TronSpecialAsset.unknown} entries
 * so the UI can show an "unavailable" state instead of a wrong zero.
 *
 * The map also carries the fetch {@link TronSpecialAssetsStatus} of the shared
 * balance request: `'loading'` until any account in the group has a TRX native
 * balance entry, `'ready'` afterwards.
 *
 * Returns a structured {@link TronSpecialAssetsMap} with all assets pre-mapped by type
 * for efficient access, eliminating the need for consumers to iterate or search the array.
 */
export const selectTronSpecialAssetsBySelectedAccountGroup =
  createDeepEqualSelector(
    [
      selectSelectedAccountGroup,
      selectEnabledNetworks,
      getAssetsBalance,
      getAssetsPrice,
      getSelectedCurrency,
    ],
    (
      selectedGroup,
      enabledNetworks,
      assetsBalance,
      assetsPrice,
      selectedCurrency,
    ): TronSpecialAssetsMap => {
      const enabledTronNetworks = enabledNetworks.filter((networkId) =>
        networkId.startsWith('tron:'),
      );

      if (!selectedGroup || enabledTronNetworks.length === 0) {
        return EMPTY_TRON_SPECIAL_ASSETS_MAP;
      }

      const enabledTronNetworksSet = new Set(enabledTronNetworks);

      const specialAssetsMap: TronSpecialAssetsMap = {
        status: TronSpecialAssetsStatus.Loading,
        energy: undefined,
        bandwidth: undefined,
        maxEnergy: undefined,
        maxBandwidth: undefined,
        stakedTrxForEnergy: undefined,
        stakedTrxForBandwidth: undefined,
        totalStakedTrx: 0,
        trxReadyForWithdrawal: undefined,
        trxStakingRewards: undefined,
        trxInLockPeriod: undefined,
      };

      for (const accountId of selectedGroup.accounts) {
        const accountBalances = assetsBalance[accountId];
        if (!accountBalances) {
          continue;
        }

        // Legacy source: each special asset is its own entry in assetsBalance.
        // Look up each known Tron special asset id directly rather than
        // scanning every balance the account holds.
        for (const [assetId, key] of Object.entries(TRON_SPECIAL_ASSET_KEYS)) {
          const { chainId } = parseCaipAssetType(assetId as CaipAssetType);
          if (!enabledTronNetworksSet.has(chainId)) {
            continue;
          }

          const balanceData = accountBalances[assetId as CaipAssetType];
          const read = readTronValue(balanceData?.amount);
          if (read.kind !== 'value') {
            // No legacy entry, or one without a readable amount: the metadata
            // source (or an `unknown` entry) decides the field.
            continue;
          }

          const price = assetsPrice[assetId as CaipAssetType]?.price;
          const fiat =
            price !== undefined
              ? {
                  balance: new BigNumber(read.amount)
                    .multipliedBy(price)
                    .toNumber(),
                  currency: selectedCurrency,
                }
              : undefined;

          specialAssetsMap[key] = {
            assetId,
            balance: read.amount,
            fiat,
          };
        }

        // Migration source: metadata nested in the TRX native asset balance,
        // merged on top of the legacy entries per field (metadata wins).
        for (const chainId of enabledTronNetworksSet) {
          // A fetched Tron account always has a TRX native balance entry, so
          // its presence marks the balance request as complete. Without it the
          // map stays in the `loading` state.
          if (accountBalances[`${chainId}/slip44:195` as CaipAssetType]) {
            specialAssetsMap.status = TronSpecialAssetsStatus.Ready;
          }

          applyTronBalanceMetadata(
            specialAssetsMap,
            accountBalances,
            chainId,
            assetsPrice,
            selectedCurrency,
          );
        }
      }

      /**
       * Compute total staked TRX using BigNumber to avoid floating-point
       * precision errors. Balances are grammar-guaranteed numeric strings
       * (`'0'` for `unknown` entries, which consumers gate via `unknown`).
       */
      const stakedTrxForEnergyBN = new BigNumber(
        specialAssetsMap.stakedTrxForEnergy?.balance ?? 0,
      );
      const stakedTrxForBandwidthBN = new BigNumber(
        specialAssetsMap.stakedTrxForBandwidth?.balance ?? 0,
      );
      const totalStakedTrxBN = stakedTrxForEnergyBN.plus(
        stakedTrxForBandwidthBN,
      );

      specialAssetsMap.totalStakedTrx = totalStakedTrxBN.toNumber();

      return specialAssetsMap;
    },
  );
