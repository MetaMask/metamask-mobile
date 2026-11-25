import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { PerpsActiveProviderMode } from '@metamask/perps-controller';
import BigNumber from 'bignumber.js';
import { usePerpsLiveAccount } from '../../../../../UI/Perps/hooks';
import { usePerpsConnection } from '../../../../../UI/Perps/hooks/usePerpsConnection';
import { selectPerpsEnabledFlag } from '../../../../../UI/Perps/selectors/featureFlags';
import {
  selectPerpsBalances,
  selectPerpsProvider,
} from '../../../../../UI/Perps/selectors/perpsController';
import type { BalanceSlice, FiatConverter } from '../../types';
import { PERPS_HOMEPAGE_THROTTLE_MS } from '../../constants';

export function usePerpsSlice(toUserCurrency: FiatConverter): BalanceSlice {
  const isEnabled = useSelector(selectPerpsEnabledFlag);
  const perpsBalances = useSelector(selectPerpsBalances);
  const activeProvider = useSelector(selectPerpsProvider) as
    | PerpsActiveProviderMode
    | undefined;
  const { account, isInitialLoading } = usePerpsLiveAccount({
    enabled: isEnabled,
    throttleMs: PERPS_HOMEPAGE_THROTTLE_MS,
  });
  const { error: connectionError } = usePerpsConnection();

  // Trading eligibility must not hide funds because geo-blocked users can
  // still view and withdraw their Perps balance.
  const isIneligible = !isEnabled;

  const totalBalanceUsd = parseFloat(account?.totalBalance ?? '0') || 0;
  const convertedValue = toUserCurrency(totalBalanceUsd);
  const totalBalance1dAgoFiat = useMemo(() => {
    const rows =
      activeProvider === 'aggregated' || activeProvider === undefined
        ? Object.values(perpsBalances)
        : [perpsBalances[activeProvider]];
    // A provider without a 1d-ago observation makes the baseline unavailable:
    // a partial sum or a zero would misstate the 24h change.
    let totalUsd = 0;
    for (const row of rows) {
      if (!row || typeof row !== 'object') {
        continue;
      }
      const value1dAgo =
        row.accountValue1dAgo === undefined
          ? undefined
          : new BigNumber(row.accountValue1dAgo);
      if (!value1dAgo?.isFinite()) {
        return undefined;
      }
      totalUsd += value1dAgo.toNumber();
    }
    return toUserCurrency(totalUsd);
  }, [activeProvider, perpsBalances, toUserCurrency]);

  const status = useMemo(() => {
    if (isIneligible) return 'ineligible' as const;
    if (!account && connectionError) return 'error' as const;
    if (isInitialLoading) return 'loading' as const;
    if (!account) return 'loading' as const;
    if (convertedValue === undefined) return 'error' as const;
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
      isVisible: isEnabled,
      valueFiat: status === 'ready' ? (convertedValue ?? 0) : 0,
      status,
      value1dAgoFiat: status === 'ready' ? totalBalance1dAgoFiat : undefined,
    }),
    [convertedValue, isEnabled, status, totalBalance1dAgoFiat],
  );
}
