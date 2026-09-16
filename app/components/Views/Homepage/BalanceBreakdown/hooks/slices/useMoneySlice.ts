import { useMemo } from 'react';
import useMoneyAccountBalance from '../../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyVaultApy from '../../../../../UI/Money/hooks/useMoneyVaultApy';
import useMoneyAccountInfo from '../../../../../UI/Money/hooks/useMoneyAccountInfo';
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
  const { tokenTotal, isBalanceLoading, isBalanceFetchError } =
    useMoneyAccountBalance({ enabled: isMoneyAccountFeatureEnabled });
  const { apyPercent, vaultApyQuery } = useMoneyVaultApy({
    enabled: isMoneyAccountFeatureEnabled,
  });
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
      ? 'error'
      : moneyStatus;
  const valueFiat = status === 'ready' ? (convertedValue ?? 0) : 0;
  const apyLoading = isMoneyAccountFeatureEnabled && vaultApyQuery.isLoading;
  const visibleApyPercent =
    isMoneyAccountFeatureEnabled && !apyLoading && apyPercent !== undefined
      ? apyPercent
      : undefined;

  return useMemo(
    () => ({
      key: 'money',
      isVisible: isMoneyAccountFeatureEnabled,
      valueFiat,
      status,
      apyPercent: visibleApyPercent,
      apyLoading,
    }),
    [
      apyLoading,
      isMoneyAccountFeatureEnabled,
      status,
      valueFiat,
      visibleApyPercent,
    ],
  );
}
