import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { RootState } from '../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectKycSessionStatus } from '../../../../selectors/kycController';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
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
 * small extra fetch. It only runs for profiles that can actually receive one:
 * an approved KYC decision, or a Money wallet that already registered with the
 * provider or holds an autoramp. Users who have not onboarded (and users whose
 * KYC state did not survive a reinstall) would otherwise pay for a request
 * that can only return an empty list.
 *
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
  const isUnlocked = useSelector(selectIsUnlocked);
  const sessionStatus = useSelector(selectKycSessionStatus);
  const kycApproved =
    sessionStatus?.finalStatus === 'approved' ||
    sessionStatus?.kycStatus === 'approved';
  // Registration or an autoramp is durable evidence that onboarding happened,
  // even when the persisted KYC session is gone.
  const hasVbaEvidence = useSelector((state: RootState) => {
    const ramps = state.engine?.backgroundState?.RampsController;
    if (!ramps || !normalizedAddress) {
      return false;
    }
    const isForMoneyWallet = (walletAddress?: string) =>
      walletAddress?.toLowerCase() === normalizedAddress;
    return (
      (ramps.moneyAccountWalletRegistrations ?? []).some((registration) =>
        isForMoneyWallet(registration.walletAddress),
      ) ||
      (ramps.autoramps ?? []).some((autoramp) =>
        isForMoneyWallet(autoramp.walletAddress),
      )
    );
  });
  const canReceiveMicrodeposits = kycApproved || hasVbaEvidence;
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
  const queryEnabled =
    Boolean(normalizedAddress) &&
    canReceiveMicrodeposits &&
    isUnlocked &&
    !knownOffline;

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
        // Keep the last good rows: React Query retains the previous success
        // when the query rejects, while a transient failure would otherwise
        // hide every microdeposit until the next poll.
        Logger.error(error as Error, {
          message: 'useMoneyMicrodeposits: failed to fetch microdeposits',
        });
        throw error;
      }
    },
    enabled: queryEnabled,
    // ReactQueryService marks TanStack focused on foreground before React
    // commits enabled:false after auto-lock, so a focus or reconnect refetch
    // could run queryFn while the wallet is locked.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    // `refetch()` ignores `enabled`, so pull-to-refresh must re-check the gate
    // itself or it bypasses it.
    if (!queryEnabled) {
      return;
    }
    refetchQuery().catch(() => undefined);
  }, [queryEnabled, refetchQuery]);

  return {
    microdeposits: query.data ?? EMPTY_MICRODEPOSITS,
    isLoading: query.isLoading,
    refetch,
  };
}
