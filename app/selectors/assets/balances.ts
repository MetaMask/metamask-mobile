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
} from '@metamask/assets-controllers';
import type { AccountTreeControllerState } from '@metamask/account-tree-controller';
import type { AccountsControllerState } from '@metamask/accounts-controller';
import { NON_EVM_TESTNET_IDS } from '@metamask/multichain-network-controller';
import { parseCaipChainId, Hex, CaipChainId } from '@metamask/utils';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../constants/popular-networks';

// RootState used by reselect inputs for existing selectors
import { selectEnabledNetworksByNamespace } from '../networkEnablementController';
import { selectNetworkConfigurationsByCaipChainId } from '../networkController';
import {
  selectAccountTreeControllerState,
  selectSelectedAccountGroupId,
} from '../multichainAccounts/accountTreeController';
import {
  selectMultichainBalances,
  selectMultichainAssetsRates,
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

// Narrow controller-state shapes using existing selectors
const selectAccountTreeStateForBalances = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeControllerState): AccountTreeControllerState =>
    ({
      accountTree: accountTreeControllerState.accountTree,
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

const selectTokenBalancesStateForBalances = createSelector(
  [selectAllTokenBalances],
  (tokenBalances): TokenBalancesControllerState =>
    ({ tokenBalances }) as TokenBalancesControllerState,
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

export const selectBalanceForAllWallets = createSelector(
  [
    selectAccountTreeStateForBalances,
    selectAccountsStateForBalances,
    selectTokenBalancesStateForBalances,
    selectTokenRatesStateForBalances,
    selectMultichainAssetsRatesStateForBalances,
    selectMultichainBalancesStateForBalances,
    selectTokensStateForBalances,
    selectCurrencyRateStateForBalances,
    selectEnabledNetworksByNamespace,
  ],
  (
    accountTreeState: AccountTreeControllerState,
    accountsState: AccountsControllerState,
    tokenBalancesState: TokenBalancesControllerState,
    tokenRatesState: TokenRatesControllerState,
    multichainRatesState: MultichainAssetsRatesControllerState,
    multichainBalancesState: MultichainBalancesControllerState,
    tokensState: TokensControllerState,
    currencyRateState: CurrencyRateState,
    enabledNetworkMap: Record<string, Record<string, boolean>> | undefined,
  ) =>
    calculateBalanceForAllWallets(
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      tokensState,
      currencyRateState,
      enabledNetworkMap,
    ),
);

export const selectBalanceForAllWalletsAndChains = createSelector(
  [
    selectAccountTreeStateForBalances,
    selectAccountsStateForBalances,
    selectTokenBalancesStateForBalances,
    selectTokenRatesStateForBalances,
    selectMultichainAssetsRatesStateForBalances,
    selectMultichainBalancesStateForBalances,
    selectTokensStateForBalances,
    selectCurrencyRateStateForBalances,
  ],
  (
    accountTreeState,
    accountsState,
    tokenBalancesState,
    tokenRatesState,
    multichainRatesState,
    multichainBalancesState,
    tokensState,
    currencyRateState,
  ) =>
    calculateBalanceForAllWallets(
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      tokensState,
      currencyRateState,
      undefined,
    ),
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
  createSelector([selectBalanceForAllWallets], (allBalances) => {
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

export const selectBalanceBySelectedAccountGroup = createSelector(
  [selectSelectedAccountGroupId, selectBalanceForAllWallets],
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
 * Selector that returns the selected account group's balance across mainnet networks only (excluding testnets).
 * This aggregates balance for the current account group across all mainnet networks
 * regardless of enabled/disabled status, used for empty state logic.
 * Different from selectBalanceBySelectedAccountGroup which respects enabled network filtering.
 */
export const selectWalletBalanceForEmptyState = createSelector(
  [
    selectSelectedAccountGroupId,
    selectNetworkConfigurationsByCaipChainId,
    selectAccountTreeStateForBalances,
    selectAccountsStateForBalances,
    selectTokenBalancesStateForBalances,
    selectTokenRatesStateForBalances,
    selectMultichainAssetsRatesStateForBalances,
    selectMultichainBalancesStateForBalances,
    selectTokensStateForBalances,
    selectCurrencyRateStateForBalances,
  ],
  (
    selectedGroupId,
    networkConfigurationsByChainId,
    accountTreeState,
    accountsState,
    tokenBalancesState,
    tokenRatesState,
    multichainRatesState,
    multichainBalancesState,
    tokensState,
    currencyRateState,
  ) => {
    if (!selectedGroupId) {
      return null;
    }

    // Filter to mainnet networks only (exclude testnets)
    const mainnetCaipChainIds = Object.keys(
      networkConfigurationsByChainId,
    ).filter((caipChainId) => {
      const networkConfig =
        networkConfigurationsByChainId[caipChainId as CaipChainId];

      // For EVM networks, check if they're in popular networks (mainnet)
      if (caipChainId.startsWith('eip155:')) {
        return POPULAR_NETWORK_CHAIN_IDS.has(networkConfig.chainId as Hex);
      }

      // For non-EVM networks, exclude testnets
      return !NON_EVM_TESTNET_IDS.includes(caipChainId as CaipChainId);
    });

    // Build custom enabledNetworkMap from mainnet CAIP chainIds
    const enabledNetworkMap: Record<string, Record<string, boolean>> = {};

    mainnetCaipChainIds.forEach((caipChainId) => {
      if (caipChainId.startsWith('eip155:')) {
        // EVM networks: convert CAIP to hex format
        const chainIdDecimal = caipChainId.split(':')[1];
        const chainIdHex = `0x${parseInt(chainIdDecimal, 10).toString(16)}`;

        if (!enabledNetworkMap.eip155) {
          enabledNetworkMap.eip155 = {};
        }
        enabledNetworkMap.eip155[chainIdHex] = true;
      } else {
        // Non-EVM networks: use full CAIP format
        const { namespace } = parseCaipChainId(caipChainId as CaipChainId);
        if (!enabledNetworkMap[namespace]) {
          enabledNetworkMap[namespace] = {};
        }
        enabledNetworkMap[namespace][caipChainId] = true;
      }
    });

    // Calculate balance using custom mainnet network map
    const allBalances = calculateBalanceForAllWallets(
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      tokensState,
      currencyRateState,
      enabledNetworkMap,
    );

    // Extract ACCOUNT GROUP-level balance across mainnet networks (not wallet-level)
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
export const selectBalanceChangeForAllWallets = (period: BalanceChangePeriod) =>
  createSelector(
    [
      selectAccountTreeStateForBalances,
      selectAccountsStateForBalances,
      selectTokenBalancesStateForBalances,
      selectTokenRatesStateForBalances,
      selectMultichainAssetsRatesStateForBalances,
      selectMultichainBalancesStateForBalances,
      selectTokensStateForBalances,
      selectCurrencyRateStateForBalances,
      selectEnabledNetworksByNamespace,
    ],
    (
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
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
) =>
  createSelector(
    [
      selectAccountTreeStateForBalances,
      selectAccountsStateForBalances,
      selectTokenBalancesStateForBalances,
      selectTokenRatesStateForBalances,
      selectMultichainAssetsRatesStateForBalances,
      selectMultichainBalancesStateForBalances,
      selectTokensStateForBalances,
      selectCurrencyRateStateForBalances,
      selectEnabledNetworksByNamespace,
    ],
    (
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      tokensState,
      currencyRateState,
      enabledNetworkMap,
    ): BalanceChangeResult =>
      calculateBalanceChangeForAccountGroup(
        accountTreeState,
        accountsState,
        tokenBalancesState,
        tokenRatesState,
        multichainRatesState,
        multichainBalancesState,
        tokensState,
        currencyRateState,
        enabledNetworkMap,
        groupId,
        period,
      ),
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
) =>
  createSelector(
    [
      selectSelectedAccountGroupId,
      selectAccountTreeStateForBalances,
      selectAccountsStateForBalances,
      selectTokenBalancesStateForBalances,
      selectTokenRatesStateForBalances,
      selectMultichainAssetsRatesStateForBalances,
      selectMultichainBalancesStateForBalances,
      selectTokensStateForBalances,
      selectCurrencyRateStateForBalances,
      selectEnabledNetworksByNamespace,
    ],
    (
      selectedGroupId,
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      tokensState,
      currencyRateState,
      enabledNetworkMap,
    ): BalanceChangeResult | null => {
      if (!selectedGroupId) {
        return null;
      }
      return calculateBalanceChangeForAccountGroup(
        accountTreeState,
        accountsState,
        tokenBalancesState,
        tokenRatesState,
        multichainRatesState,
        multichainBalancesState,
        tokensState,
        currencyRateState,
        enabledNetworkMap,
        selectedGroupId,
        period,
      );
    },
  );
