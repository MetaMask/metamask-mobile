import { useMemo } from 'react';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectBalanceByWallet } from '../../../../../selectors/assets/balances';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { UseWalletBalancesHook } from './useWalletBalances.types';

export const useWalletBalances = (walletId: string): UseWalletBalancesHook => {
  const walletBalance = useSelector(selectBalanceByWallet(walletId));
  const displayCurrency = useSelector(selectCurrentCurrency);

  const isLoading = useMemo(
    () => walletBalance.totalBalanceInUserCurrency === undefined,
    [walletBalance.totalBalanceInUserCurrency],
  );

  const formattedWalletTotalBalance = useMemo(() => {
    if (isLoading) {
      return undefined;
    }

    return formatWithThreshold(
      walletBalance.totalBalanceInUserCurrency,
      0.01,
      I18n.locale,
      {
        style: 'currency',
        currency: displayCurrency.toUpperCase(),
      },
    );
  }, [isLoading, walletBalance.totalBalanceInUserCurrency, displayCurrency]);

  const multichainBalancesForAllAccounts = useMemo(
    () =>
      Object.values(walletBalance.groups).reduce((acc, group) => {
        acc[group.groupId] = formatWithThreshold(
          group.totalBalanceInUserCurrency ?? 0,
          0.01,
          I18n.locale,
          {
            style: 'currency',
            currency: displayCurrency.toUpperCase(),
          },
        );
        return acc;
      }, {} as Record<string, string>),
    [walletBalance.groups, displayCurrency],
  );

  return {
    formattedWalletTotalBalance,
    multichainBalancesForAllAccounts,
  };
};
