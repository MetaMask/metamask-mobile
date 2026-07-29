import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { PerpsActiveProviderMode } from '@metamask/perps-controller';
import BigNumber from 'bignumber.js';
import { usePerpsLiveAccount } from '../../../../UI/Perps/hooks';
import { usePerpsConnection } from '../../../../UI/Perps/hooks/usePerpsConnection';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import {
  selectPerpsBalances,
  selectPerpsEligibility,
  selectPerpsProvider,
} from '../../../../UI/Perps/selectors/perpsController';
import type { BalanceSlice, FiatConverter } from '../../types';
import { PERPS_HOMEPAGE_THROTTLE_MS } from '../../constants';

export function usePerpsSlice(toUserCurrency: FiatConverter): BalanceSlice {
  const isEnabled = useSelector(selectPerpsEnabledFlag);
  const isEligible = useSelector(selectPerpsEligibility);
  const perpsBalances = useSelector(selectPerpsBalances);
  const activeProvider = useSelector(selectPerpsProvider) as
    | PerpsActiveProviderMode
    | undefined;
  const { account, isInitialLoading } = usePerpsLiveAccount({
    throttleMs: PERPS_HOMEPAGE_THROTTLE_MS,
  });
  const { error: connectionError } = usePerpsConnection();

  // Perps is ineligible when the feature flag is off
  const isIneligible = !isEnabled || !isEligible;

  const totalBalanceUsd = parseFloat(account?.totalBalance ?? '0') || 0;
  const convertedValue = toUserCurrency(totalBalanceUsd);
  const totalBalance1dAgoFiat = useMemo(() => {
    const rows =
      activeProvider === 'aggregated' || activeProvider === undefined
        ? Object.values(perpsBalances)
        : [perpsBalances[activeProvider]];
    const totalUsd = rows.reduce((sum, row) => {
      if (!row || typeof row !== 'object' || !('accountValue1dAgo' in row)) {
        return sum;
      }
      return sum + new BigNumber(row.accountValue1dAgo || '0').toNumber();
    }, 0);
    return toUserCurrency(totalUsd);
  }, [activeProvider, perpsBalances, toUserCurrency]);

  const status = useMemo(() => {
    if (isIneligible) return 'ineligible' as const;
    if (!account && connectionError) return 'error' as const;
    if (isInitialLoading) return 'loading' as const;
    if (!account) return 'loading' as const;
    if (convertedValue === undefined) return 'loading' as const;
    return 'ready' as const;
  }, [
    account,
    connectionError,
    convertedValue,
    isIneligible,
    isInitialLoading,
  ]);

  return useMemo<BalanceSlice>(
    () => ({
      key: 'perps',
      valueFiat: status === 'ready' ? (convertedValue ?? 0) : 0,
      status,
      value1dAgoFiat: status === 'ready' ? totalBalance1dAgoFiat : undefined,
    }),
    [convertedValue, status, totalBalance1dAgoFiat],
  );
}
