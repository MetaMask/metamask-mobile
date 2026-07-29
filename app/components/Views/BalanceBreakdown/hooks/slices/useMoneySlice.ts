import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../../../UI/Money/hooks/useMoneyAccountInfo';
import { selectIsMoneyAccountGeoEligible } from '../../../../UI/Money/selectors/eligibility';
import type { BalanceSlice, FiatConverter, SliceStatus } from '../../types';

export function getMoneySliceStatus({
  isFeatureEnabled,
  isGeoEligible,
  hasMoneyAccount,
  isBalanceLoading,
  isBalanceFetchError,
  hasTokenTotal,
}: {
  isFeatureEnabled: boolean;
  isGeoEligible: boolean;
  hasMoneyAccount: boolean;
  isBalanceLoading: boolean;
  isBalanceFetchError: boolean;
  hasTokenTotal: boolean;
}): SliceStatus {
  if (!isFeatureEnabled || !isGeoEligible || !hasMoneyAccount) {
    return 'ineligible';
  }
  if (isBalanceFetchError) return 'error';
  if (isBalanceLoading || !hasTokenTotal) return 'loading';
  return 'ready';
}

export function useMoneySlice(toUserCurrency: FiatConverter): BalanceSlice {
  const isGeoEligible = useSelector(selectIsMoneyAccountGeoEligible);
  const { isMoneyAccountFeatureEnabled, hasMoneyAccount } =
    useMoneyAccountInfo();
  const {
    tokenTotal,
    isBalanceLoading,
    isBalanceFetchError,
    apyPercentFormatted,
  } = useMoneyAccountBalance();
  const moneyStatus = getMoneySliceStatus({
    isFeatureEnabled: isMoneyAccountFeatureEnabled,
    isGeoEligible,
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

  return useMemo(
    () => ({
      key: 'money',
      valueFiat,
      status,
      apyPercentFormatted: status === 'ready' ? apyPercentFormatted : undefined,
    }),
    [apyPercentFormatted, status, valueFiat],
  );
}
