import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { AutorampAccount } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { RootState } from '../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../selectors/rampsController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTierState } from '../../../../hooks/useNetworkTier';
import type { NeobankBankTransferActivity } from '../types/moneyActivity';
import { mapAutorampTransactionToNeobankActivity } from '../utils/neobankActivity';
import { selectMoneyVbaPendingActivityEnabled } from '../selectors/featureFlags';

const POLL_INTERVAL_MS = 10_000;
const LOW_SLOW_POLL_INTERVAL_MS = 60_000;

const EMPTY_AUTORAMPS: AutorampAccount[] = [];
const EMPTY_ACTIVITY: NeobankBankTransferActivity[] = [];

const neobankActivityQueryKey = (walletKey: string, autorampId: string) =>
  ['money', 'neobankAutorampActivity', walletKey, autorampId] as const;

interface PollRegistration {
  subscribers: number;
  timer: ReturnType<typeof setInterval> | null;
  poll: () => Promise<unknown>;
  intervalMs: number;
  inFlight: boolean;
}

const sharedPolls = new Map<string, PollRegistration>();

function subscribeToSharedPoll(
  key: string,
  poll: () => Promise<unknown>,
  intervalMs: number,
): () => void {
  const existing = sharedPolls.get(key);
  if (existing) {
    existing.subscribers += 1;
    existing.poll = poll;
    if (intervalMs > existing.intervalMs) {
      existing.intervalMs = intervalMs;
      if (existing.timer) clearInterval(existing.timer);
      existing.timer = setInterval(() => {
        if (existing.inFlight) return;
        existing.inFlight = true;
        void existing
          .poll()
          .catch(() => undefined)
          .finally(() => {
            existing.inFlight = false;
          });
      }, existing.intervalMs);
    }
    return () => {
      existing.subscribers -= 1;
      if (existing.subscribers === 0) {
        if (existing.timer) clearInterval(existing.timer);
        sharedPolls.delete(key);
      }
    };
  }

  const registration: PollRegistration = {
    subscribers: 1,
    timer: null,
    poll,
    intervalMs,
    inFlight: false,
  };
  sharedPolls.set(key, registration);
  const tick = () => {
    if (registration.inFlight) return;
    registration.inFlight = true;
    void registration
      .poll()
      .catch(() => undefined)
      .finally(() => {
        registration.inFlight = false;
      });
  };
  tick();
  registration.timer = setInterval(tick, intervalMs);
  return () => {
    registration.subscribers -= 1;
    if (registration.subscribers === 0) {
      if (registration.timer) clearInterval(registration.timer);
      sharedPolls.delete(key);
    }
  };
}

interface AutorampActivityTransaction {
  id: string;
  autorampId: string;
  status: string;
  sourceAmount?: string;
  destinationAmount?: string;
  createdAt?: string;
  transactionHash?: string;
}

type ListAutorampTransactions = (
  autorampId: string,
) => Promise<AutorampActivityTransaction[]>;

function isUsableAutoramp(autoramp: AutorampAccount): boolean {
  return autoramp.status !== 'Rejected' && autoramp.status !== 'Cancelled';
}

/**
 * Prefer an autoramp whose destination matches the Money Account or the VBA
 * onboarding wallet. Never fall back to an unmatched autoramp — after a wallet
 * reset, stale RampsController cursors can still list a previous customer's
 * Pending deposits and leak into Money Activity before KYC.
 */
export function findUsableAutorampForActivity(
  autoramps: readonly AutorampAccount[],
  walletAddresses: (string | null | undefined)[],
): AutorampAccount | undefined {
  const normalized = new Set(
    walletAddresses
      .filter((address): address is string => Boolean(address?.trim()))
      .map((address) => address.trim().toLowerCase()),
  );

  if (normalized.size === 0) {
    return undefined;
  }

  return autoramps
    .filter(isUsableAutoramp)
    .find((autoramp) =>
      normalized.has(autoramp.walletAddress.trim().toLowerCase()),
    );
}

function readLiveAutoramps(): AutorampAccount[] {
  const ramps = Engine.context.RampsController as
    | { state?: { autoramps?: AutorampAccount[] } }
    | undefined;
  return ramps?.state?.autoramps ?? EMPTY_AUTORAMPS;
}

/**
 * Polls NeoBank autoramp transactions for the Money Account's VBA and exposes
 * them as Money Activity rows (Pending → Completed/Failed).
 *
 * VbaDetails keeps the same poll in screen-local state; this hook keeps the
 * feed alive after the user leaves the PIX screen.
 */
export function useNeobankAutorampActivity(
  moneyAddress: string | undefined,
  enabled = true,
): {
  activity: NeobankBankTransferActivity[];
  refetch: () => void;
} {
  const pendingActivityEnabled = useSelector(
    selectMoneyVbaPendingActivityEnabled,
  );
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
  const vbaWalletAddress = useSelector(selectSelectedVbaWalletAddress);
  const autorampsFromRedux = useSelector((state: RootState) => {
    const ramps = state.engine?.backgroundState?.RampsController as
      | { autoramps?: AutorampAccount[] }
      | undefined;
    return ramps?.autoramps ?? EMPTY_AUTORAMPS;
  });

  // Prefer Redux (reactive). Fall back to live controller state when Redux has
  // not caught up yet — same source VbaDetails uses for PIX polling.
  const autoramps = useMemo(() => {
    if (autorampsFromRedux.length > 0) {
      return autorampsFromRedux;
    }
    return readLiveAutoramps();
  }, [autorampsFromRedux]);

  const autoramp = useMemo(
    () =>
      findUsableAutorampForActivity(autoramps, [
        moneyAddress,
        vbaWalletAddress,
      ]),
    [autoramps, moneyAddress, vbaWalletAddress],
  );

  const walletKey = useMemo(
    () =>
      [moneyAddress, vbaWalletAddress]
        .filter((address): address is string => Boolean(address))
        .map((address) => address.toLowerCase())
        .sort((left, right) => left.localeCompare(right))
        .join('|'),
    [moneyAddress, vbaWalletAddress],
  );
  const isPollingEligible = Boolean(
    pendingActivityEnabled &&
      autoramp &&
      walletKey &&
      isFocused &&
      appIsActive &&
      !knownOffline,
  );
  const pollScopeRef = useRef({
    walletKey,
    autorampId: autoramp?.id ?? '',
  });
  pollScopeRef.current = { walletKey, autorampId: autoramp?.id ?? '' };
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: neobankActivityQueryKey(walletKey, autoramp?.id ?? ''),
    queryFn: async () => {
      const neoBank = (
        Engine.context as unknown as {
          NeoBankService?: {
            listAutorampTransactions?: ListAutorampTransactions;
          };
        }
      ).NeoBankService;
      if (!neoBank?.listAutorampTransactions || !autoramp) {
        return EMPTY_ACTIVITY;
      }
      const keyAtStart = `${walletKey}:${autoramp.id}`;
      try {
        const transactions = await neoBank.listAutorampTransactions(
          autoramp.id,
        );
        const latestScope = pollScopeRef.current;
        if (
          keyAtStart !== `${latestScope.walletKey}:${latestScope.autorampId}` ||
          latestScope.autorampId !== autoramp.id
        ) {
          return EMPTY_ACTIVITY;
        }
        return transactions
          .map(mapAutorampTransactionToNeobankActivity)
          .sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
      } catch (error) {
        Logger.error(error as Error, {
          message:
            'useNeobankAutorampActivity: failed to list autoramp transactions',
        });
        throw error;
      }
    },
    enabled: false,
    retry: false,
    gcTime: 0,
  });

  const intervalMs = lowSlowNetwork
    ? LOW_SLOW_POLL_INTERVAL_MS
    : POLL_INTERVAL_MS;
  const pollKey = `${walletKey}:${autoramp?.id ?? ''}`;

  useEffect(() => {
    if (!isPollingEligible || !autoramp) {
      return undefined;
    }
    return subscribeToSharedPoll(
      pollKey,
      async () => {
        const scopeAtStart = pollScopeRef.current;
        if (
          scopeAtStart.walletKey !== walletKey ||
          scopeAtStart.autorampId !== autoramp.id
        ) {
          return;
        }
        const result = await query.refetch();
        if (
          result.data &&
          pollScopeRef.current.walletKey === scopeAtStart.walletKey &&
          pollScopeRef.current.autorampId === scopeAtStart.autorampId
        ) {
          queryClient.setQueryData(
            neobankActivityQueryKey(scopeAtStart.walletKey, autoramp.id),
            result.data,
          );
        }
      },
      intervalMs,
    );
  }, [
    query,
    isPollingEligible,
    autoramp,
    pollKey,
    query.refetch,
    intervalMs,
    autorampsFromRedux,
    moneyAddress,
    vbaWalletAddress,
    queryClient,
    walletKey,
    pollScopeRef,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppIsActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  const fetchTransactions = useCallback(() => {
    if (!isPollingEligible) {
      return Promise.resolve();
    }
    const sharedPoll = sharedPolls.get(pollKey);
    if (sharedPoll) {
      return sharedPoll.poll().then(() => undefined);
    }
    const currentAutoramps =
      autorampsFromRedux.length > 0 ? autorampsFromRedux : readLiveAutoramps();
    const stillMatching = findUsableAutorampForActivity(currentAutoramps, [
      moneyAddress,
      vbaWalletAddress,
    ]);
    if (stillMatching?.id !== autoramp?.id) {
      return Promise.resolve();
    }
    return query.refetch().then(() => undefined);
  }, [
    query,
    isPollingEligible,
    pollKey,
    autorampsFromRedux,
    moneyAddress,
    vbaWalletAddress,
    autoramp,
  ]);

  const activity = useMemo(
    () =>
      pendingActivityEnabled && autoramp
        ? (query.data ?? EMPTY_ACTIVITY).filter(
            (item) => item.autorampId === autoramp.id,
          )
        : EMPTY_ACTIVITY,
    [pendingActivityEnabled, autoramp, query.data],
  );

  useEffect(() => {
    if (
      !pendingActivityEnabled ||
      !enabled ||
      !autoramp ||
      !isFocused ||
      !appIsActive
    ) {
      return;
    }
    if (knownOffline) {
      return;
    }
    const sharedPoll = sharedPolls.get(pollKey);
    if (!sharedPoll && isPollingEligible) {
      const currentAutoramps =
        autorampsFromRedux.length > 0
          ? autorampsFromRedux
          : readLiveAutoramps();
      const stillMatching = findUsableAutorampForActivity(currentAutoramps, [
        moneyAddress,
        vbaWalletAddress,
      ]);
      if (stillMatching?.id === autoramp.id) {
        void query.refetch();
      }
    }
  }, [
    query,
    pendingActivityEnabled,
    enabled,
    autoramp,
    isFocused,
    appIsActive,
    knownOffline,
    pollKey,
    isPollingEligible,
    query.refetch,
    queryClient,
    autorampsFromRedux,
    moneyAddress,
    vbaWalletAddress,
  ]);

  return {
    activity,
    refetch: fetchTransactions,
  };
}
