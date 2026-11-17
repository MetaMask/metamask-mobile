import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import Logger from '../../../../util/Logger';
import type { NetworkTier } from '../../../../util/deviceCapability/types';
import type { PredictFundingService } from '../services/PredictFundingService';
import type {
  PredictVenueId,
  PredictWithdrawReceipt,
  PredictWithdrawReceiptStatus,
} from '../types';
import { withdrawReadDelayMs } from './withdrawObservation';

/** Consecutive failed reads before a surface stops asking. A credential fault
 * never resolves by retrying, and an unreachable API is better retried when
 * the person reopens the sheet than forever in the background. */
export const MAX_WITHDRAW_READ_FAILURES = 5;

/** Receipt statuses the backend is still working through; a surface keeps
 * reading until the status leaves this set or the backend asks for manual
 * review. */
const IN_PROGRESS_WITHDRAW_STATUSES: readonly PredictWithdrawReceiptStatus[] = [
  'pending',
  'processing',
];

const isInProgressWithdraw = (receipt: PredictWithdrawReceipt): boolean =>
  IN_PROGRESS_WITHDRAW_STATUSES.includes(receipt.status);

export interface UseWithdrawReceiptOptions {
  service: Pick<PredictFundingService, 'observeWithdraw'>;
  venueId: PredictVenueId;
  /** The latest receipt the surface holds, or `null` while the Commit is in
   * flight. Polling starts once a receipt reports an in-progress status. */
  receipt: PredictWithdrawReceipt | null;
  /** Read at scheduling time, so a tier change never restarts the loop. */
  networkTier: NetworkTier | null;
  onReceipt: (receipt: PredictWithdrawReceipt) => void;
}

/**
 * Observes one Withdrawal while the calling surface is mounted. The loop
 * backs off through {@link WITHDRAW_OBSERVATION_DELAYS_MS}, pauses while the
 * app is not active or the connection is known to be gone, and stops when the
 * receipt leaves an in-progress status, the backend asks for manual review,
 * or the surface unmounts. Nothing is persisted.
 */
export const useWithdrawReceipt = ({
  service,
  venueId,
  receipt,
  networkTier,
  onReceipt,
}: UseWithdrawReceiptOptions): void => {
  const onReceiptRef = useRef(onReceipt);
  onReceiptRef.current = onReceipt;
  const networkTierRef = useRef(networkTier);
  networkTierRef.current = networkTier;

  const previewId = receipt?.previewId;
  const shouldPoll =
    receipt !== null &&
    isInProgressWithdraw(receipt) &&
    !receipt.needsManualReview;

  useEffect(() => {
    if (!previewId || !shouldPoll) {
      return undefined;
    }

    const targetPreviewId = previewId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let attempt = 0;
    let failures = 0;

    function schedule(): void {
      if (cancelled || timer !== undefined) {
        return;
      }
      if (AppState.currentState !== 'active') {
        return;
      }
      const delay = withdrawReadDelayMs(attempt, networkTierRef.current);
      timer = setTimeout(() => {
        timer = undefined;
        poll().catch(() => undefined);
      }, delay);
    }

    async function poll(): Promise<void> {
      if (cancelled) {
        return;
      }
      // A connection that is known to be gone never carries a read; the timer
      // re-arms at the same step so a restored connection picks it up.
      if (
        AppState.currentState !== 'active' ||
        networkTierRef.current === 'NONE'
      ) {
        schedule();
        return;
      }
      controller = new AbortController();
      try {
        const next = await service.observeWithdraw(venueId, targetPreviewId, {
          signal: controller.signal,
        });
        if (cancelled) {
          return;
        }
        failures = 0;
        attempt += 1;
        onReceiptRef.current(next);
        if (isInProgressWithdraw(next) && !next.needsManualReview) {
          schedule();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        // A failed read says nothing about the money: keep the last receipt
        // on screen and try again on the next step, within a bounded number
        // of consecutive failures.
        failures += 1;
        attempt += 1;
        Logger.log('PredictNext: the Withdrawal receipt read failed', error);
        if (failures < MAX_WITHDRAW_READ_FAILURES) {
          schedule();
        }
      } finally {
        controller = undefined;
      }
    }

    function onAppStateChange(state: AppStateStatus): void {
      if (state === 'active') {
        schedule();
        return;
      }
      clearTimeout(timer);
      timer = undefined;
    }
    const subscription = AppState.addEventListener('change', onAppStateChange);

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
      subscription.remove();
    };
  }, [previewId, service, shouldPoll, venueId]);
};
