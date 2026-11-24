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
  const { account, aggregate, isInitialLoading } = usePerpsLiveAccount({
    enabled: isEnabled,
    throttleMs: PERPS_HOMEPAGE_THROTTLE_MS,
  });
  const { error: connectionError } = usePerpsConnection();

  // Trading eligibility must not hide funds because geo-blocked users can
  // still view and withdraw their Perps balance.
  const isIneligible = !isEnabled;

  const totalBalanceUsd = parseFloat(account?.totalBalance ?? '0') || 0;
  const convertedValue = toUserCurrency(totalBalanceUsd);
  const isPartial = aggregate?.status === 'partial';
  const totalBalance1dAgoFiat = useMemo(() => {
    // Match the baseline to every venue represented in the live total. A
    // missing or non-finite observation makes the change figure unavailable.
    const venueIds: string[] = account?.providerStates
      ? Object.keys(account.providerStates)
      : account
        ? [account.providerId ?? activeProvider ?? 'hyperliquid']
        : [];
    if (venueIds.length === 0) {
      return undefined;
    }
    let totalUsd = 0;
    for (const providerId of venueIds) {
      const row = perpsBalances[providerId];
      const value1dAgo =
        row?.accountValue1dAgo === undefined
          ? undefined
          : new BigNumber(row.accountValue1dAgo);
      if (!value1dAgo?.isFinite()) {
        return undefined;
      }
      totalUsd += value1dAgo.toNumber();
    }
    return toUserCurrency(totalUsd);
  }, [account, perpsBalances, activeProvider, toUserCurrency]);

  const status = useMemo(() => {
    if (isIneligible) return 'ineligible' as const;
    if (!account && connectionError) return 'error' as const;
    if (isInitialLoading) return 'loading' as const;
    if (!account) return 'loading' as const;
    if (convertedValue === undefined) return 'error' as const;
    // TAT-4407: a partial total (a venue failed to report) is degraded, not
    // the complete portfolio value — surface it through the slice's status so
    // the homepage does not present a subtotal as the full balance.
    if (isPartial) return 'partial' as const;
    return 'ready' as const;
  }, [
    account,
    connectionError,
    convertedValue,
    isIneligible,
    isInitialLoading,
    isPartial,
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
