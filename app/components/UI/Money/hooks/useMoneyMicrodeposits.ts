import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTierState } from '../../../../hooks/useNetworkTier';
import type { MicrodepositActivity } from '../types/moneyActivity';
import {
  asMicrodepositService,
  mapMicrodeposits,
} from '../utils/microdeposits';

const POLL_INTERVAL_MS = 10_000;
const LOW_SLOW_POLL_INTERVAL_MS = 60_000;
const EMPTY_MICRODEPOSITS: MicrodepositActivity[] = [];

export const moneyMicrodepositsQueryKey = (address: string) =>
  ['money', 'microdeposits', address] as const;

/**
 * Polls the neobank-proxy microdeposit list for the active Money Account.
 *
 * Microdeposits are cumulative and settle nothing on-chain, so this is one
 * small extra fetch gated behind its own flag rather than a paged source.
 * 404 (no MoonPay customer yet) already resolves to an empty list in
 * `NeoBankService.getMicrodeposits`.
 */
export function useMoneyMicrodeposits(): {
  microdeposits: MicrodepositActivity[];
  isLoading: boolean;
  refetch: () => void;
} {
  const address = useSelector(selectPrimaryMoneyAccount)?.address;
  const normalizedAddress = address?.toLowerCase() ?? '';
  const isFocused = useIsFocused();
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === 'active',
  );
  const { tier: networkTier, isResolved: networkIsResolved } =
    useNetworkTierState();
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const lowSlowNetwork =
    hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR';
  const knownOffline = networkIsResolved && networkTier === 'NONE';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppIsActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  const query = useQuery({
    queryKey: moneyMicrodepositsQueryKey(normalizedAddress),
    queryFn: async (): Promise<MicrodepositActivity[]> => {
      const service = asMicrodepositService(Engine.context.NeoBankService);
      if (!service) {
        return [];
      }
      try {
        return mapMicrodeposits(await service.getMicrodeposits());
      } catch (error) {
        // A failed fetch must not hide the rest of Money Activity; the next
        // poll retries.
        Logger.error(error as Error, {
          message: 'useMoneyMicrodeposits: failed to fetch microdeposits',
        });
        return [];
      }
    },
    enabled: Boolean(normalizedAddress) && !knownOffline,
    retry: false,
    staleTime: 0,
    // The list is refreshed on every mount; keeping it cached after unmount
    // only leaves a GC timer (and stale rows) behind.
    gcTime: 0,
    refetchInterval:
      isFocused && appIsActive && !knownOffline
        ? lowSlowNetwork
          ? LOW_SLOW_POLL_INTERVAL_MS
          : POLL_INTERVAL_MS
        : false,
  });

  const refetchQuery = query.refetch;
  const refetch = useCallback(() => {
    refetchQuery().catch(() => undefined);
  }, [refetchQuery]);

  return {
    microdeposits: query.data ?? EMPTY_MICRODEPOSITS,
    isLoading: query.isLoading,
    refetch,
  };
}
