import { useMemo } from 'react';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../../../UI/Money/hooks/useMoneyAccountInfo';
import type { BalanceSlice, FiatConverter, SliceStatus } from '../../types';

export function getMoneySliceStatus({
  isFeatureEnabled,
  hasMoneyAccount,
  isBalanceLoading,
  isBalanceFetchError,
  hasTokenTotal,
}: {
  isFeatureEnabled: boolean;
  hasMoneyAccount: boolean;
  isBalanceLoading: boolean;
  isBalanceFetchError: boolean;
  hasTokenTotal: boolean;
}): SliceStatus {
  if (!isFeatureEnabled || !hasMoneyAccount) {
    return 'ineligible';
  }
  if (isBalanceFetchError) return 'error';
  if (isBalanceLoading || !hasTokenTotal) return 'loading';
  return 'ready';
}

export function useMoneySlice(toUserCurrency: FiatConverter): BalanceSlice {
  const { isMoneyAccountFeatureEnabled, hasMoneyAccount } =
    useMoneyAccountInfo();
  const {
    tokenTotal,
    isBalanceLoading,
    isBalanceFetchError,
    apyPercent,
    vaultApyQuery,
  } = useMoneyAccountBalance();
  const moneyStatus = getMoneySliceStatus({
    isFeatureEnabled: isMoneyAccountFeatureEnabled,
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
      ? 'loading'
      : moneyStatus;
  const valueFiat = status === 'ready' ? (convertedValue ?? 0) : 0;
  const apyLoading = vaultApyQuery.isLoading;
  const apyPercentFormatted = apyLoading ? undefined : `${apyPercent ?? 0}%`;

  return useMemo(
    () => ({
      key: 'money',
      valueFiat,
      status,
      apyPercentFormatted,
      apyLoading,
    }),
    [apyLoading, apyPercentFormatted, status, valueFiat],
  );
}
