import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import useMultichainBalancesForAllAccounts from '../../../../hooks/useMultichainBalances/useMultichainBalancesForAllAccounts';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { UseWalletBalancesHook } from './useWalletBalances.types';

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  }).format(value);

export const useWalletBalances = (
  accounts: InternalAccount[],
): UseWalletBalancesHook => {
  const { multichainBalancesForAllAccounts } =
    useMultichainBalancesForAllAccounts();
  const currentCurrency = useSelector(selectCurrentCurrency);

  const isLoading = useMemo(
    () =>
      accounts.some(
        (account) =>
          !multichainBalancesForAllAccounts[account.id] ||
          multichainBalancesForAllAccounts[account.id].isLoadingAccount,
      ),
    [accounts, multichainBalancesForAllAccounts],
  );

  const walletTotalBalance = useMemo(() => {
    let total = 0;
    for (const account of accounts) {
      const balanceData = multichainBalancesForAllAccounts[account.id];
      if (balanceData && typeof balanceData.totalFiatBalance === 'number') {
        total += balanceData.totalFiatBalance;
      }
    }
    return total;
  }, [accounts, multichainBalancesForAllAccounts]);

  const formattedWalletTotalBalance = useMemo(() => {
    if (isLoading) {
      return undefined;
    }
    return formatCurrency(walletTotalBalance, currentCurrency);
  }, [isLoading, walletTotalBalance, currentCurrency]);

  return {
    formattedWalletTotalBalance,
    multichainBalancesForAllAccounts,
  };
};
