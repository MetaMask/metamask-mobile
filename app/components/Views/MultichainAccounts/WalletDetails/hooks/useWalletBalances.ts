import { useMemo } from 'react';
import useMultichainBalancesForAllAccounts from '../../../../hooks/useMultichainBalances/useMultichainBalancesForAllAccounts';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { UseWalletBalancesHook } from './useWalletBalances.types';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n from '../../../../../../locales/i18n';

const formatCurrency = (value: number, currency: string) =>
  formatWithThreshold(value, 0, I18n.locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

export const useWalletBalances = (
  accounts: InternalAccount[],
): UseWalletBalancesHook => {
  const { multichainBalancesForAllAccounts } =
    useMultichainBalancesForAllAccounts();

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

    // Get displayCurrency from the first account (all accounts should have the same currency)
    const firstAccountId = accounts[0]?.id;
    const displayCurrency = firstAccountId
      ? multichainBalancesForAllAccounts[firstAccountId]?.displayCurrency
      : 'USD';

    return formatCurrency(walletTotalBalance, displayCurrency);
  }, [
    isLoading,
    walletTotalBalance,
    accounts,
    multichainBalancesForAllAccounts,
  ]);

  return {
    formattedWalletTotalBalance,
    multichainBalancesForAllAccounts,
  };
};
