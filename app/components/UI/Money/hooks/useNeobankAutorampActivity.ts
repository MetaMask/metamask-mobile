import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { AutorampAccount } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { RootState } from '../../../../reducers';
import { selectSelectedVbaWalletAddress } from '../../../../selectors/rampsController';
import type { NeobankBankTransferActivity } from '../types/moneyActivity';
import { mapAutorampTransactionToNeobankActivity } from '../utils/neobankActivity';

const POLL_INTERVAL_MS = 10_000;

const EMPTY_AUTORAMPS: AutorampAccount[] = [];

type ListAutorampTransactions = (autorampId: string) => Promise<
  Array<{
    id: string;
    autorampId: string;
    status: string;
    sourceAmount?: string;
    destinationAmount?: string;
    createdAt?: string;
    transactionHash?: string;
  }>
>;

function isUsableAutoramp(autoramp: AutorampAccount): boolean {
  return (
    autoramp.status !== 'Rejected' && autoramp.status !== 'Cancelled'
  );
}

/**
 * Prefer an autoramp whose destination matches the Money Account or the VBA
 * onboarding wallet. Never fall back to an unmatched autoramp — after a wallet
 * reset, stale RampsController cursors can still list a previous customer's
 * Pending deposits and leak into Money Activity before KYC.
 */
export function findUsableAutorampForActivity(
  autoramps: readonly AutorampAccount[],
  walletAddresses: Array<string | null | undefined>,
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
): {
  activity: NeobankBankTransferActivity[];
  refetch: () => void;
} {
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

  const [activity, setActivity] = useState<NeobankBankTransferActivity[]>([]);
  const inFlightRef = useRef(false);

  const fetchTransactions = useCallback(async () => {
    // Re-resolve on each poll so a late-hydrated autoramp is picked up without
    // waiting for a Redux-driven re-render of this callback.
    const liveAutoramps =
      autorampsFromRedux.length > 0 ? autorampsFromRedux : readLiveAutoramps();
    const resolved =
      findUsableAutorampForActivity(liveAutoramps, [
        moneyAddress,
        vbaWalletAddress,
      ]) ?? autoramp;

    if (!resolved) {
      setActivity([]);
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    const neoBank = (
      Engine.context as unknown as {
        NeoBankService?: { listAutorampTransactions?: ListAutorampTransactions };
      }
    ).NeoBankService;

    if (!neoBank?.listAutorampTransactions) {
      return;
    }

    inFlightRef.current = true;
    try {
      const transactions = await neoBank.listAutorampTransactions(resolved.id);
      setActivity(
        transactions.map(mapAutorampTransactionToNeobankActivity).sort(
          (a, b) => b.time - a.time || a.id.localeCompare(b.id),
        ),
      );
    } catch (error) {
      Logger.error(error as Error, {
        message: 'useNeobankAutorampActivity: failed to list autoramp transactions',
      });
    } finally {
      inFlightRef.current = false;
    }
  }, [autoramp, autorampsFromRedux, moneyAddress, vbaWalletAddress]);

  useEffect(() => {
    if (!autoramp) {
      setActivity([]);
      return;
    }

    let cancelled = false;
    const tick = async () => {
      if (cancelled) {
        return;
      }
      await fetchTransactions();
    };

    void tick();
    const timer = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [autoramp, fetchTransactions]);

  return {
    activity,
    refetch: fetchTransactions,
  };
}
