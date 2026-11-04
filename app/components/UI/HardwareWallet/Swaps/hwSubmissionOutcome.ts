import type { TransactionMeta } from '@metamask/transaction-controller';

export type HwSubmissionOutcome =
  | { status: 'submitted'; transaction: TransactionMeta }
  | { status: 'failed' };

type HwSubmissionOutcomeListener = (outcome: HwSubmissionOutcome) => void;

const listeners = new Map<string, HwSubmissionOutcomeListener>();
let nextListenerId = 0;

/**
 * Registers a one-shot listener for the outcome of a bridge-flow HW signing
 * session. Pass the returned id as `SubmissionParams.outcomeListenerId`; route
 * params must stay serializable, so the callback itself never travels with them.
 */
export function registerHwSubmissionOutcomeListener(
  listener: HwSubmissionOutcomeListener,
): string {
  nextListenerId += 1;
  const id = `hw-submission-${nextListenerId}`;
  listeners.set(id, listener);
  return id;
}

/** Resolves and removes the listener; later calls for the same id are no-ops. */
export function notifyHwSubmissionOutcome(
  id: string | undefined,
  outcome: HwSubmissionOutcome,
): void {
  if (!id) {
    return;
  }
  const listener = listeners.get(id);
  listeners.delete(id);
  listener?.(outcome);
}
