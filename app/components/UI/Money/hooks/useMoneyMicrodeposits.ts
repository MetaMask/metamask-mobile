import { useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { RootState } from '../../../../reducers';
import { selectKycSessionStatus } from '../../../../selectors/kycController';
import { selectRampsControllerState } from '../../../../selectors/rampsController';
import { useNetworkTierState } from '../../../../hooks/useNetworkTier';
import { hasVbaWalletEvidence } from '../../Ramp/Views/VirtualBankAccount/vbaWalletEvidence';
import type { MicrodepositActivity } from '../types/moneyActivity';
import { mapMicrodeposits } from '../utils/microdeposits';
import { MONEY_SLOW_POLL_INTERVAL_MS } from '../constants/polling';

const EMPTY_MICRODEPOSITS: MicrodepositActivity[] = [];

const microdepositsQueryKey = (address: string) =>
  ['money', 'microdeposits', address] as const;

/**
 * Polls the neobank-proxy microdeposit list for the active Money Account.
 *
 * Microdeposits are cumulative, settle nothing on-chain, and appear at most a
 * few times during onboarding, so this is one small fetch per minute. It only
 * runs for profiles that can actually receive one: an approved KYC decision,
 * or a Money wallet that already registered with the provider or holds an
 * autoramp. Users who have not onboarded (and users whose KYC state did not
 * survive a reinstall) would otherwise pay for a request that can only return
 * an empty list.
 *
 * 404 (no MoonPay customer yet) already resolves to an empty list in
 * `NeoBankService.getMicrodeposits`.
 *
 * @param address - Primary Money Account address, already checksummed by
 * `useMoneyAccountTransactions`. The query is disabled without one.
 */
export function useMoneyMicrodeposits(address?: string): {
  microdeposits: MicrodepositActivity[];
  isLoading: boolean;
  refetch: () => void;
} {
  const normalizedAddress = address?.toLowerCase() ?? '';
  // Read the lock state defensively: some view tests render Money with a
  // minimal background state.
  const isUnlocked = useSelector(
    (state: RootState) =>
      state.engine?.backgroundState?.KeyringController?.isUnlocked ?? false,
  );
  const sessionStatus = useSelector(selectKycSessionStatus);
  const kycApproved =
    sessionStatus?.finalStatus === 'approved' ||
    sessionStatus?.kycStatus === 'approved';
  // Registration or an autoramp is durable evidence that onboarding happened,
  // even when the persisted KYC session is gone.
  const hasVbaEvidence = useSelector((state: RootState) => {
    if (!normalizedAddress) {
      return false;
    }
    const ramps = selectRampsControllerState(state);
    return hasVbaWalletEvidence(
      normalizedAddress,
      ramps?.autoramps ?? [],
      ramps?.moneyAccountWalletRegistrations ?? [],
    );
  });
  const canReceiveMicrodeposits = kycApproved || hasVbaEvidence;
  const isFocused = useIsFocused();
  const { tier: networkTier, isResolved: networkIsResolved } =
    useNetworkTierState();
  const knownOffline = networkIsResolved && networkTier === 'NONE';
  const queryEnabled =
    Boolean(normalizedAddress) &&
    canReceiveMicrodeposits &&
    isUnlocked &&
    !knownOffline;

  // ReactQueryService maps AppState onto TanStack's focus manager, so the
  // interval pauses in the background on its own.
  const shouldPoll = isFocused && !knownOffline;

  const query = useQuery({
    queryKey: microdepositsQueryKey(normalizedAddress),
    queryFn: async (): Promise<MicrodepositActivity[]> => {
      try {
        return mapMicrodeposits(
          await Engine.context.NeoBankService.getMicrodeposits(),
        );
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
    refetchInterval: shouldPoll ? MONEY_SLOW_POLL_INTERVAL_MS : false,
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
