import { createSelector } from 'reselect';
import {
  calculateBalanceForAllWallets,
  calculateAggregatedChangeForAllWallets,
  calculateAggregatedChangeForGroup,
  type TokenBalancesControllerState,
  type TokenRatesControllerState,
  type MultichainBalancesControllerState,
  type MultichainAssetsRatesControllerState,
  type TokensControllerState,
  type CurrencyRateState,
  type PortfolioChangePeriod,
  type AggregatedChangeForAllWallets,
} from '@metamask/assets-controllers';
import type { AccountTreeControllerState } from '@metamask/account-tree-controller';
import type { AccountsControllerState } from '@metamask/accounts-controller';

// RootState used by reselect inputs for existing selectors
import { selectEnabledNetworksByNamespace } from '../networkEnablementController';
import { selectAccountTreeControllerState } from '../multichainAccounts/accountTreeController';
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
    } as AccountTreeControllerState),
);

const selectAccountsStateForBalances = createSelector(
  [selectInternalAccountsById, selectSelectedInternalAccountId],
  (accountsById, selectedAccountId): AccountsControllerState =>
    ({
      internalAccounts: {
        accounts: accountsById,
        selectedAccount: selectedAccountId ?? '',
      },
    } as AccountsControllerState),
);

const selectTokenBalancesStateForBalances = createSelector(
  [selectAllTokenBalances],
  (tokenBalances): TokenBalancesControllerState =>
    ({ tokenBalances } as TokenBalancesControllerState),
);

const selectTokenRatesStateForBalances = createSelector(
  [selectTokenMarketData],
  (marketData): TokenRatesControllerState =>
    ({ marketData } as TokenRatesControllerState),
);

const selectMultichainBalancesStateForBalances = createSelector(
  [selectMultichainBalances],
  (balances): MultichainBalancesControllerState =>
    ({ balances } as MultichainBalancesControllerState),
);

const selectMultichainAssetsRatesStateForBalances = createSelector(
  [selectMultichainAssetsRates],
  (conversionRates): MultichainAssetsRatesControllerState =>
    ({ conversionRates } as MultichainAssetsRatesControllerState),
);

const selectTokensStateForBalances = createSelector(
  [selectAllTokens],
  (allTokens): TokensControllerState =>
    ({
      allTokens: allTokens ?? {},
      allIgnoredTokens: {},
      allDetectedTokens: {},
    } as TokensControllerState),
);

const selectCurrencyRateStateForBalances = createSelector(
  [selectCurrentCurrency, selectCurrencyRates],
  (currentCurrency, currencyRates): CurrencyRateState =>
    ({
      currentCurrency: currentCurrency ?? 'usd',
      currencyRates: currencyRates ?? {},
    } as CurrencyRateState),
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

export const selectSelectedGroupAggregatedBalance = createSelector(
  [selectAccountTreeControllerState, selectBalanceForAllWallets],
  (accountTreeState, allBalances) => {
    const selectedGroupId = accountTreeState?.accountTree?.selectedAccountGroup;
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

export const selectAggregatedBalanceByAccountGroup = (groupId: string) =>
  createSelector([selectBalanceForAllWallets], (allBalances) => {
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

// Portfolio change selectors (period: '1d' | '7d' | '30d')
export const selectPortfolioChangeForAllWallets = (
  period: PortfolioChangePeriod,
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
    ): AggregatedChangeForAllWallets =>
      calculateAggregatedChangeForAllWallets(
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

export const selectPortfolioPercentChange = (period: PortfolioChangePeriod) =>
  createSelector(
    [selectPortfolioChangeForAllWallets(period)],
    (change) => change.percentChange,
  );

// Per-account-group portfolio change selectors (mirror extension)
export const selectPortfolioChangeByAccountGroup = (
  groupId: string,
  period: PortfolioChangePeriod,
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
    ): AggregatedChangeForAllWallets =>
      calculateAggregatedChangeForGroup(
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

export const selectPortfolioPercentChangeByAccountGroup = (
  groupId: string,
  period: PortfolioChangePeriod,
) =>
  createSelector(
    [selectPortfolioChangeByAccountGroup(groupId, period)],
    (change) => change.percentChange,
  );
