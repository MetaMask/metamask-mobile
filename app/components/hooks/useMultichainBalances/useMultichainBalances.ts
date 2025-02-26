/* eslint-disable arrow-body-style */
import { useSelector } from 'react-redux';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { renderFiat } from '../../../util/number';
import {
  UseMultichainBalancesHook,
  MultichainBalancesData,
} from './useMultichainBalances.types';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  selectAllAccountsIsEvm,
  selectAllAccountsDefaultTokens,
  selectAllAccountsShouldShowFiat,
  selectAllAccountsConversionRates,
  selectAllAccountsBalances,
} from '../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF

/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useMultichainBalances = (): UseMultichainBalancesHook => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const currentCurrency = useSelector(selectCurrentCurrency);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const accountsIsEvm = useSelector(selectAllAccountsIsEvm);
  const accountsDefaultTokens = useSelector(selectAllAccountsDefaultTokens);
  const accountsShouldShowFiat = useSelector(selectAllAccountsShouldShowFiat);
  const accountsConversionRates = useSelector(selectAllAccountsConversionRates);
  const accountsBalances = useSelector(selectAllAccountsBalances);

  const accountBalances = internalAccounts.reduce<
    Record<string, MultichainBalancesData>
  >((acc, account) => {
    const balance = accountsBalances[account.id];
    const conversionRate = accountsConversionRates[account.id];
    const shouldShowFiat = accountsShouldShowFiat[account.id];
    const { symbol } = accountsDefaultTokens[account.id];

    let displayBalance;
    if (!shouldShowFiat) {
      displayBalance = `${balance} ${symbol}`;
    } else if (balance && conversionRate) {
      const fiatBalance = Number(balance) * conversionRate;
      displayBalance = `${renderFiat(
        fiatBalance,
        currentCurrency,
      )}\n${balance} ${symbol}`;
    } else {
      displayBalance = `0 ${symbol}`;
    }

    acc[account.id] = {
      displayBalance,
      tokenFiatBalancesCrossChains: [],
      totalFiatBalance: 0,
      totalTokenFiat: 0,
      shouldShowAggregatedPercentage: !accountsIsEvm[account.id],
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    };
    return acc;
  }, {});

  return {
    multichainBalances: accountBalances,
  };
  ///: END:ONLY_INCLUDE_IF

  // If keyring-snaps is not enabled, return empty object
  return {
    multichainBalances: {},
  };
};

export default useMultichainBalances;
