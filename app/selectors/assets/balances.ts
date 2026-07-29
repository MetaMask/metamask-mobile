import { createSelector } from 'reselect';
import {
  calculateBalanceForAllWallets,
  type TokenBalancesControllerState,
  type TokenRatesControllerState,
  type MultichainBalancesControllerState,
  type MultichainAssetsRatesControllerState,
  type TokensControllerState,
  type CurrencyRateState,
  type BalanceChangeResult,
  calculateBalanceChangeForAllWallets,
  calculateBalanceChangeForAccountGroup,
  type BalanceChangePeriod,
  MultichainAssetsControllerState,
} from '@metamask/assets-controllers';
import {
  calculateBalanceForAllWallets as calculateBalanceForAllWalletsFromUnified,
  calculateBalanceChangeForAccountGroup as calculateBalanceChangeForAccountGroupFromUnified,
  getAggregatedBalanceForAccount,
  type AccountGroupBalance,
  type AssetsControllerState,
  type EnabledNetworkMap,
} from '@metamask/assets-controller';
import type { AccountTreeControllerState } from '@metamask/account-tree-controller';
import type { AccountsControllerState } from '@metamask/accounts-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { NON_EVM_TESTNET_IDS } from '@metamask/multichain-network-controller';
import {
  parseCaipChainId,
  CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { TEST_NETWORK_IDS } from '../../constants/network';

// RootState used by reselect inputs for existing selectors
import { selectEnabledNetworksByNamespace } from '../networkEnablementController';
import {
  selectNetworkConfigurations,
  selectNetworkConfigurationsByCaipChainId,
} from '../networkController';
import {
  selectAccountTreeControllerState,
  selectSelectedAccountGroupId,
} from '../multichainAccounts/accountTreeController';
import {
  selectMultichainBalances,
  selectMultichainAssetsRates,
  selectMultichainAssetsAllIgnoredAssets,
  selectMultichainAssets,
  selectMultichainAssetsMetadata,
} from '../multichain/multichain';
import { selectTokenMarketData } from '../tokenRatesController';
import { selectAllTokenBalances } from '../tokenBalancesController';
import { selectAllTokens } from '../tokensController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../currencyRateController';
import {
  selectInternalAccountsById,
  selectSelectedInternalAccountId,
} from '../accountsController';
import type { NetworkConfig } from '@metamask/network-enablement-controller';
import { selectIsAssetsUnifyStateEnabled } from '../featureFlagController/assetsUnifyState';
import { selectAssetsControllerStateForBalances } from './assets-controller';
import { augmentAssetControllersState } from '../../enablement/assets/arc';
import { filterExcludedTokenBalances } from '../../enablement/assets/networks-customization';

/**
 * TEMPORARY (until scaleToHumanIfRaw is fixed in core): strip `assetsInfo` so
 * aggregation cannot re-divide large human-readable balances by 10^decimals
 * and drop them from the fiat total (#44786).
 *
 * @param state - AssetsController state slice.
 * @returns State with empty assetsInfo.
 */
function stripAssetsInfoForAggregation(
  state: AssetsControllerState,
): AssetsControllerState {
  return {
    ...state,
    assetsInfo: {},
  };
}

/**
 * Account ids that belong to a group, read from the account tree.
 *
 * @param accountTreeState - AccountTreeController state.
 * @param groupId - Account group id.
 * @returns Account ids in the group.
 */
function getAccountIdsForGroup(
  accountTreeState: AccountTreeControllerState,
  groupId: string,
): string[] {
  const wallets = accountTreeState.accountTree?.wallets ?? {};
  for (const wallet of Object.values(wallets)) {
    const group = wallet?.groups?.[groupId as keyof typeof wallet.groups];
    if (group?.accounts) {
      return [...group.accounts];
    }
  }
  return [];
}

/**
 * Calculate aggregated fiat balance for a single account group from unified
 * AssetsController state.
 *
 * @param assetsControllerState - AssetsController state slice.
 * @param accountTreeState - AccountTreeController state.
 * @param groupId - Account group id.
 * @param enabledNetworkMap - Enabled networks map.
 * @returns Account group balance entry.
 */
export function getUnifiedBalanceForAccountGroup(
  assetsControllerState: AssetsControllerState,
  accountTreeState: AccountTreeControllerState,
  groupId: string,
  enabledNetworkMap: EnabledNetworkMap,
): AccountGroupBalance {
  const userCurrency = assetsControllerState.selectedCurrency ?? 'usd';
  const walletId = groupId.split('/')[0];
  const accountIds = getAccountIdsForGroup(accountTreeState, groupId);

  if (accountIds.length === 0) {
    return {
      walletId,
      groupId,
      totalBalanceInUserCurrency: 0,
      userCurrency,
    };
  }

  // `getAggregatedBalanceForAccount` resolves accounts from `accountIds`; the
  // selected-account argument is only a placeholder.
  const placeholderAccount = { id: accountIds[0] } as InternalAccount;
  const { totalBalanceInFiat = 0 } = getAggregatedBalanceForAccount(
    stripAssetsInfoForAggregation(assetsControllerState),
    placeholderAccount,
    enabledNetworkMap,
    undefined,
    accountIds,
  );

  return {
    walletId,
    groupId,
    totalBalanceInUserCurrency: totalBalanceInFiat,
    userCurrency,
  };
}

// Narrow controller-state shapes using existing selectors
const selectAccountTreeStateForBalances = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeControllerState): AccountTreeControllerState =>
    ({
      accountTree: accountTreeControllerState.accountTree,
      selectedAccountGroup:
        accountTreeControllerState.selectedAccountGroup ?? '',
      // Mobile may not define these metadata fields yet; fall back to empty objects
      // They are optional in the pure function usage path we take
      accountGroupsMetadata:
        (
          accountTreeControllerState as unknown as {
            accountGroupsMetadata?: AccountTreeControllerState['accountGroupsMetadata'];
          }
        ).accountGroupsMetadata ?? {},
      accountWalletsMetadata:
        (
          accountTreeControllerState as unknown as {
            accountWalletsMetadata?: AccountTreeControllerState['accountWalletsMetadata'];
          }
        ).accountWalletsMetadata ?? {},
    }) as AccountTreeControllerState,
);

const selectAccountsStateForBalances = createSelector(
  [selectInternalAccountsById, selectSelectedInternalAccountId],
  (accountsById, selectedAccountId): AccountsControllerState =>
    ({
      internalAccounts: {
        accounts: accountsById,
        selectedAccount: selectedAccountId ?? '',
      },
    }) as AccountsControllerState,
);

export const selectTokenBalancesStateForBalances = createSelector(
  [selectAllTokenBalances],
  (tokenBalances): TokenBalancesControllerState => ({
    tokenBalances: filterExcludedTokenBalances(tokenBalances),
  }),
);

const selectTokenRatesStateForBalances = createSelector(
  [selectTokenMarketData],
  (marketData): TokenRatesControllerState =>
    ({ marketData }) as TokenRatesControllerState,
);

const selectMultichainBalancesStateForBalances = createSelector(
  [selectMultichainBalances],
  (balances): MultichainBalancesControllerState =>
    ({ balances }) as MultichainBalancesControllerState,
);

const selectMultichainAssetsControllerStateForBalances = createSelector(
  [
    selectMultichainAssets,
    selectMultichainAssetsMetadata,
    selectMultichainAssetsAllIgnoredAssets,
  ],
  (
    accountsAssets,
    assetsMetadata,
    allIgnoredAssets,
  ): MultichainAssetsControllerState => ({
    accountsAssets,
    assetsMetadata,
    allIgnoredAssets,
  }),
);

const selectMultichainAssetsRatesStateForBalances = createSelector(
  [selectMultichainAssetsRates],
  (conversionRates): MultichainAssetsRatesControllerState =>
    ({ conversionRates }) as MultichainAssetsRatesControllerState,
);

const selectTokensStateForBalances = createSelector(
  [selectAllTokens],
  (allTokens): TokensControllerState =>
    ({
      allTokens: allTokens ?? {},
      allIgnoredTokens: {},
      allDetectedTokens: {},
    }) as TokensControllerState,
);

const selectCurrencyRateStateForBalances = createSelector(
  [selectCurrentCurrency, selectCurrencyRates],
  (currentCurrency, currencyRates): CurrencyRateState =>
    ({
      currentCurrency: currentCurrency ?? 'usd',
      currencyRates: currencyRates ?? {},
    }) as CurrencyRateState,
);

/**
 * Networks map for balance calculations. When popularChainIds is passed (e.g. from
 * NetworkEnablementController.listPopularNetworks()), uses that full list so balances
 * for popular networks are always displayed; otherwise falls back to enabled networks by namespace.
 */
const selectNetworksMapForBalances = (
  popularChainIds: CaipChainId[] | undefined,
) =>
  createSelector(
    [selectEnabledNetworksByNamespace],
    (enabledNetworksByNamespace): Record<string, Record<string, boolean>> => {
      if (!popularChainIds?.length) {
        return enabledNetworksByNamespace ?? {};
      }
      const map: Record<string, Record<string, boolean>> = {};
      for (const caipChainId of popularChainIds) {
        const { namespace, reference } = parseCaipChainId(
          caipChainId as CaipChainId,
        );
        if (namespace === KnownCaipNamespace.Eip155) {
          if (!map.eip155) map.eip155 = {};
          map.eip155[toHex(reference)] = true;
        } else {
          if (!map[namespace]) map[namespace] = {};
          map[namespace][caipChainId] = true;
        }
      }
      return map;
    },
  );

export const selectBalanceForAllWallets = (popularChainIds?: CaipChainId[]) =>
  createSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      selectAssetsControllerStateForBalances,
      selectAccountTreeStateForBalances,
      selectAccountsStateForBalances,
      selectTokenBalancesStateForBalances,
      selectTokenRatesStateForBalances,
      selectMultichainAssetsRatesStateForBalances,
      selectMultichainBalancesStateForBalances,
      selectMultichainAssetsControllerStateForBalances,
      selectTokensStateForBalances,
      selectCurrencyRateStateForBalances,
      selectNetworksMapForBalances(popularChainIds),
      selectNetworkConfigurations,
    ],
    (
      isAssetsUnifyStateEnabled: boolean,
      assetsControllerState: AssetsControllerState,
      accountTreeState: AccountTreeControllerState,
      accountsState: AccountsControllerState,
      tokenBalancesState: TokenBalancesControllerState,
      tokenRatesState: TokenRatesControllerState,
      multichainRatesState: MultichainAssetsRatesControllerState,
      multichainBalancesState: MultichainBalancesControllerState,
      multichainAssetsControllerState: MultichainAssetsControllerState,
      tokensState: TokensControllerState,
      currencyRateState: CurrencyRateState,
      enabledNetworkMap: Record<string, Record<string, boolean>> | undefined,
      networkConfigurationsByChainId: Record<string, NetworkConfig>,
    ) => {
      if (isAssetsUnifyStateEnabled) {
        return calculateBalanceForAllWalletsFromUnified(
          stripAssetsInfoForAggregation(
            augmentAssetControllersState(assetsControllerState),
          ),
          accountTreeState,
          enabledNetworkMap,
        );
      }
      return calculateBalanceForAllWallets(
        accountTreeState,
        accountsState,
        tokenBalancesState,
        tokenRatesState,
        multichainRatesState,
        multichainBalancesState,
        multichainAssetsControllerState,
        tokensState,
        currencyRateState,
        enabledNetworkMap,
        networkConfigurationsByChainId,
      );
    },
  );

export const selectBalanceForAllWalletsAndChains = createSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    selectAssetsControllerStateForBalances,
    selectAccountTreeStateForBalances,
    selectAccountsStateForBalances,
    selectTokenBalancesStateForBalances,
    selectTokenRatesStateForBalances,
    selectMultichainAssetsRatesStateForBalances,
    selectMultichainBalancesStateForBalances,
    selectMultichainAssetsControllerStateForBalances,
    selectTokensStateForBalances,
    selectCurrencyRateStateForBalances,
  ],
  (
    isAssetsUnifyStateEnabled,
    assetsControllerState,
    accountTreeState,
    accountsState,
    tokenBalancesState,
    tokenRatesState,
    multichainRatesState,
    multichainBalancesState,
    multichainAssetsControllerState,
    tokensState,
    currencyRateState,
  ) => {
    if (isAssetsUnifyStateEnabled) {
      return calculateBalanceForAllWalletsFromUnified(
        stripAssetsInfoForAggregation(
          augmentAssetControllersState(assetsControllerState),
        ),
        accountTreeState,
        undefined,
      );
    }
    return calculateBalanceForAllWallets(
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      multichainAssetsControllerState,
      tokensState,
      currencyRateState,
      undefined,
    );
  },
);

export const selectBalanceByAccountGroup = (groupId: string) =>
  createSelector([selectBalanceForAllWalletsAndChains], (allBalances) => {
    const walletId = groupId.split('/')[0];
    const wallet = allBalances.wallets[walletId] ?? null;
    const { userCurrency } = allBalances;
    if (!wallet?.groups[groupId]) {
      return {
        walletId,
        groupId,
        totalBalanceInUserCurrency: 0,
        userCurrency,
      };
    }
    return wallet.groups[groupId];
  });

export const selectBalanceByWallet = (walletId: string) =>
  createSelector([selectBalanceForAllWallets()], (allBalances) => {
    const wallet = allBalances.wallets[walletId] ?? null;
    const { userCurrency } = allBalances;

    if (!wallet) {
      return {
        walletId,
        totalBalanceInUserCurrency: 0,
        userCurrency,
        groups: {},
      };
    }

    return {
      walletId,
      totalBalanceInUserCurrency: wallet.totalBalanceInUserCurrency,
      userCurrency,
      groups: wallet.groups,
    };
  });

export const selectBalanceBySelectedAccountGroup = (
  popularChainIds?: CaipChainId[],
) =>
  createSelector(
    [selectSelectedAccountGroupId, selectBalanceForAllWallets(popularChainIds)],
    (selectedGroupId, allBalances) => {
      if (!selectedGroupId) {
        return null;
      }
      const walletId = selectedGroupId.split('/')[0];
      const wallet = allBalances.wallets[walletId] ?? null;
      const { userCurrency } = allBalances;
      if (!wallet?.groups[selectedGroupId]) {
        return {
          walletId,
          groupId: selectedGroupId,
          totalBalanceInUserCurrency: 0,
          userCurrency,
        };
      }
      return wallet.groups[selectedGroupId];
    },
  );

/**
 * Aggregated fiat balance for the selected account group from unified
 * AssetsController state. Callers should only consume this when
 * assets-unify-state is enabled.
 *
 * @param popularChainIds - Optional popular CAIP chain ids for network filtering.
 */
export const selectUnifiedBalanceBySelectedAccountGroup = (
  popularChainIds?: CaipChainId[],
) =>
  createSelector(
    [
      selectAssetsControllerStateForBalances,
      selectAccountTreeStateForBalances,
      selectSelectedAccountGroupId,
      selectNetworksMapForBalances(popularChainIds),
    ],
    (
      assetsControllerState,
      accountTreeState,
      selectedGroupId,
      enabledNetworkMap,
    ) => {
      if (!selectedGroupId) {
        return null;
      }

      return getUnifiedBalanceForAccountGroup(
        augmentAssetControllersState(assetsControllerState),
        accountTreeState,
        selectedGroupId,
        enabledNetworkMap,
      );
    },
  );

/**
 * Returns the selected account group's balance
 * across mainnet networks for balance empty state display
 */
export const selectAccountGroupBalanceForEmptyState = createSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    selectAssetsControllerStateForBalances,
    selectSelectedAccountGroupId,
    selectNetworkConfigurationsByCaipChainId,
    selectAccountTreeStateForBalances,
    selectAccountsStateForBalances,
    selectTokenBalancesStateForBalances,
    selectTokenRatesStateForBalances,
    selectMultichainAssetsRatesStateForBalances,
    selectMultichainBalancesStateForBalances,
    selectMultichainAssetsControllerStateForBalances,
    selectTokensStateForBalances,
    selectCurrencyRateStateForBalances,
  ],
  (
    isAssetsUnifyStateEnabled,
    assetsControllerState,
    selectedGroupId,
    networkConfigurationsByChainId,
    accountTreeState,
    accountsState,
    tokenBalancesState,
    tokenRatesState,
    multichainRatesState,
    multichainBalancesState,
    multichainAssetsControllerState,
    tokensState,
    currencyRateState,
  ) => {
    if (!selectedGroupId) {
      return null;
    }

    // Extract mainnet chainIds from network configurations and filter out testnets
    // Using proper CAIP utilities instead of manual string parsing
    const mainnetCaipChainIds = Object.keys(
      networkConfigurationsByChainId,
    ).filter((caipChainId) => {
      const { namespace, reference } = parseCaipChainId(
        caipChainId as CaipChainId,
      );

      // For EVM networks, check against TEST_NETWORK_IDS using proper utilities
      if (namespace === KnownCaipNamespace.Eip155) {
        const chainIdHex = toHex(reference);
        return !TEST_NETWORK_IDS.includes(chainIdHex);
      }

      // For non-EVM networks, exclude testnets using existing constant
      return !NON_EVM_TESTNET_IDS.includes(caipChainId as CaipChainId);
    });

    // Build enabledNetworkMap for mainnet networks only
    // Using proper CAIP utilities instead of manual string manipulation
    const enabledNetworkMap: Record<string, Record<string, boolean>> = {};

    mainnetCaipChainIds.forEach((caipChainId) => {
      const { namespace, reference } = parseCaipChainId(
        caipChainId as CaipChainId,
      );

      if (namespace === KnownCaipNamespace.Eip155) {
        // EVM networks: convert decimal reference to hex format using proper utility
        const chainIdHex = toHex(reference);

        if (!enabledNetworkMap.eip155) {
          enabledNetworkMap.eip155 = {};
        }
        enabledNetworkMap.eip155[chainIdHex] = true;
      } else {
        // Non-EVM networks: use full CAIP format
        if (!enabledNetworkMap[namespace]) {
          enabledNetworkMap[namespace] = {};
        }
        enabledNetworkMap[namespace][caipChainId] = true;
      }
    });

    // Calculate balance using the mainnet-only network map
    const allBalances = isAssetsUnifyStateEnabled
      ? calculateBalanceForAllWalletsFromUnified(
          stripAssetsInfoForAggregation(
            augmentAssetControllersState(assetsControllerState),
          ),
          accountTreeState,
          enabledNetworkMap,
        )
      : calculateBalanceForAllWallets(
          accountTreeState,
          accountsState,
          tokenBalancesState,
          tokenRatesState,
          multichainRatesState,
          multichainBalancesState,
          multichainAssetsControllerState,
          tokensState,
          currencyRateState,
          enabledNetworkMap,
        );

    // Extract account group balance across mainnet networks
    const walletId = selectedGroupId.split('/')[0];
    const wallet = allBalances.wallets[walletId] ?? null;
    const { userCurrency } = allBalances;

    if (!wallet?.groups[selectedGroupId]) {
      return {
        walletId,
        groupId: selectedGroupId,
        totalBalanceInUserCurrency: 0,
        userCurrency,
      };
    }

    // Return the selected account group balance across mainnet networks
    const accountGroupBalance = wallet.groups[selectedGroupId];

    return {
      walletId,
      groupId: selectedGroupId,
      totalBalanceInUserCurrency:
        accountGroupBalance.totalBalanceInUserCurrency,
      userCurrency,
    };
  },
);

// Balance change selectors (period: '1d' | '7d' | '30d')
export const selectBalanceChangeForAllWallets = (
  period: BalanceChangePeriod,
  popularChainIds?: CaipChainId[],
) =>
  createSelector(
    [
      selectAccountTreeStateForBalances,
      selectAccountsStateForBalances,
      selectTokenBalancesStateForBalances,
      selectTokenRatesStateForBalances,
      selectMultichainAssetsRatesStateForBalances,
      selectMultichainBalancesStateForBalances,
      selectMultichainAssetsControllerStateForBalances,
      selectTokensStateForBalances,
      selectCurrencyRateStateForBalances,
      selectNetworksMapForBalances(popularChainIds),
    ],
    (
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      multichainAssetsControllerState,
      tokensState,
      currencyRateState,
      enabledNetworkMap,
    ): BalanceChangeResult =>
      calculateBalanceChangeForAllWallets(
        accountTreeState,
        accountsState,
        tokenBalancesState,
        tokenRatesState,
        multichainRatesState,
        multichainBalancesState,
        multichainAssetsControllerState,
        tokensState,
        currencyRateState,
        enabledNetworkMap,
        period,
      ),
  );

// Per-account-group balance change selectors
export const selectBalanceChangeByAccountGroup = (
  groupId: string,
  period: BalanceChangePeriod,
  popularChainIds?: CaipChainId[],
) =>
  createSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      selectAssetsControllerStateForBalances,
      selectAccountTreeStateForBalances,
      selectAccountsStateForBalances,
      selectTokenBalancesStateForBalances,
      selectTokenRatesStateForBalances,
      selectMultichainAssetsRatesStateForBalances,
      selectMultichainBalancesStateForBalances,
      selectMultichainAssetsControllerStateForBalances,
      selectTokensStateForBalances,
      selectCurrencyRateStateForBalances,
      selectNetworksMapForBalances(popularChainIds),
    ],
    (
      isAssetsUnifyStateEnabled,
      assetsControllerState,
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      multichainAssetsControllerState,
      tokensState,
      currencyRateState,
      enabledNetworkMap,
    ): BalanceChangeResult => {
      if (isAssetsUnifyStateEnabled) {
        return calculateBalanceChangeForAccountGroupFromUnified(
          stripAssetsInfoForAggregation(
            augmentAssetControllersState(assetsControllerState),
          ),
          accountTreeState,
          groupId,
          period,
          enabledNetworkMap,
        );
      }
      return calculateBalanceChangeForAccountGroup(
        accountTreeState,
        accountsState,
        tokenBalancesState,
        tokenRatesState,
        multichainRatesState,
        multichainBalancesState,
        multichainAssetsControllerState,
        tokensState,
        currencyRateState,
        enabledNetworkMap,
        groupId,
        period,
      );
    },
  );

export const selectBalancePercentChangeByAccountGroup = (
  groupId: string,
  period: BalanceChangePeriod,
) =>
  createSelector(
    [selectBalanceChangeByAccountGroup(groupId, period)],
    (change) => change.percentChange,
  );

// Selected-account-group balance change (period: '1d' | '7d' | '30d')
export const selectBalanceChangeBySelectedAccountGroup = (
  period: BalanceChangePeriod,
  popularChainIds?: CaipChainId[],
) =>
  createSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      selectAssetsControllerStateForBalances,
      selectSelectedAccountGroupId,
      selectAccountTreeStateForBalances,
      selectAccountsStateForBalances,
      selectTokenBalancesStateForBalances,
      selectTokenRatesStateForBalances,
      selectMultichainAssetsRatesStateForBalances,
      selectMultichainBalancesStateForBalances,
      selectMultichainAssetsControllerStateForBalances,
      selectTokensStateForBalances,
      selectCurrencyRateStateForBalances,
      selectNetworksMapForBalances(popularChainIds),
    ],
    (
      isAssetsUnifyStateEnabled,
      assetsControllerState,
      selectedGroupId,
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      multichainAssetsControllerState,
      tokensState,
      currencyRateState,
      enabledNetworkMap,
    ): BalanceChangeResult | null => {
      if (!selectedGroupId) {
        return null;
      }
      if (isAssetsUnifyStateEnabled) {
        return calculateBalanceChangeForAccountGroupFromUnified(
          stripAssetsInfoForAggregation(
            augmentAssetControllersState(assetsControllerState),
          ),
          accountTreeState,
          selectedGroupId,
          period,
          enabledNetworkMap,
        );
      }
      return calculateBalanceChangeForAccountGroup(
        accountTreeState,
        accountsState,
        tokenBalancesState,
        tokenRatesState,
        multichainRatesState,
        multichainBalancesState,
        multichainAssetsControllerState,
        tokensState,
        currencyRateState,
        enabledNetworkMap,
        selectedGroupId,
        period,
      );
    },
  );
