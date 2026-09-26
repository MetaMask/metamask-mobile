import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyVaultApy from '../../../../../UI/Money/hooks/useMoneyVaultApy';
import useMoneyAccountInfo from '../../../../../UI/Money/hooks/useMoneyAccountInfo';
import { selectIsMoneyAccountVisible } from '../../../../../UI/Money/selectors/visibility';
import type { BalanceSlice, FiatConverter, SliceStatus } from '../../types';

export function getMoneySliceStatus({
  isMoneyAccountVisible,
  hasMoneyAccount,
  isBalanceLoading,
  isBalanceFetchError,
  hasTokenTotal,
}: {
  isMoneyAccountVisible: boolean;
  hasMoneyAccount: boolean;
  isBalanceLoading: boolean;
  isBalanceFetchError: boolean;
  hasTokenTotal: boolean;
}): SliceStatus {
  if (!isMoneyAccountVisible || !hasMoneyAccount) {
    return 'ineligible';
  }
  if (isBalanceFetchError) return 'error';
  if (isBalanceLoading || !hasTokenTotal) return 'loading';
  return 'ready';
}

export function useMoneySlice(toUserCurrency: FiatConverter): BalanceSlice {
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const { hasMoneyAccount } = useMoneyAccountInfo();
  const { tokenTotal, isBalanceLoading, isBalanceFetchError } =
    useMoneyAccountBalance({ enabled: isMoneyAccountVisible });
  const { apyPercent, vaultApyQuery } = useMoneyVaultApy({
    enabled: isMoneyAccountVisible,
  });
  const moneyStatus = getMoneySliceStatus({
    isMoneyAccountVisible,
    hasMoneyAccount,
    isBalanceLoading,
    isBalanceFetchError,
    hasTokenTotal: tokenTotal !== undefined,
  });

  const convertedValue =
    moneyStatus === 'ready'
      ? toUserCurrency(tokenTotal?.toNumber() ?? 0)
      : undefined;
  const status =
    moneyStatus === 'ready' && convertedValue === undefined
      ? 'error'
      : moneyStatus;
  const valueFiat = status === 'ready' ? (convertedValue ?? 0) : 0;
  const apyLoading = isMoneyAccountVisible && vaultApyQuery.isLoading;
  const visibleApyPercent =
    isMoneyAccountVisible && !apyLoading && apyPercent !== undefined
      ? apyPercent
      : undefined;

  return useMemo(
    () => ({
      key: 'money',
      isVisible: isMoneyAccountVisible,
      valueFiat,
      status,
      apyPercent: visibleApyPercent,
      apyLoading,
    }),
    [apyLoading, isMoneyAccountVisible, status, valueFiat, visibleApyPercent],
  );
}
