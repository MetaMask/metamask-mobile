/**
 * Coordinates in-flight mUSD rescue submissions across screens.
 *
 * The rescue review screen navigates to Money Home as soon as submission
 * *starts*, so duplicate protection cannot live in component state: the
 * submission promise outlives the screen, and reopening the flow must not
 * create a second send while the first is still resolving (e.g. a sponsored
 * relay publish in progress).
 *
 * The registry also bridges "submission setup failed after the user was
 * already sent Home" to the global Money transaction monitor, which owns the
 * pending/success/failure toasts — no transaction metadata exists in that
 * failure case, so no transaction-status event will fire.
 */

/** Terminal outcome of a rescue submission attempt. */
export type MusdRescueSubmissionReason = 'submitted' | 'failed';

interface MusdRescueSubmissionEntry {
  completion: Promise<MusdRescueSubmissionReason>;
}

type MusdRescueSetupFailureListener = (batchId: string) => void;

const inFlightSubmissions = new Map<string, MusdRescueSubmissionEntry>();
const setupFailureListeners = new Set<MusdRescueSetupFailureListener>();

/**
 * Registers a rescue submission that has been handed to the transaction
 * controller. The entry is dropped as soon as the attempt reaches a terminal
 * outcome; until then any new rescue attempt is rejected.
 *
 * @param params.batchId - Batch id allocated for the submission.
 * @param params.completion - Promise resolving when the attempt settles.
 */
export function registerMusdRescueSendSubmission({
  batchId,
  completion,
}: {
  batchId: string;
  completion: Promise<MusdRescueSubmissionReason>;
}): void {
  inFlightSubmissions.set(batchId, { completion });
  const dropEntry = () => {
    inFlightSubmissions.delete(batchId);
  };
  completion.then(dropEntry, dropEntry);
}

/** True while any rescue submission is still resolving. */
export function isMusdRescueSendInFlight(): boolean {
  return inFlightSubmissions.size > 0;
}

/**
 * Marks a submission as failed before any transaction metadata exists (setup
 * failed after the user was sent Home). Notifies the transaction monitor so
 * the pending toast is replaced with the failure toast.
 *
 * @param batchId - Batch id allocated for the failed submission.
 */
export function markMusdRescueSendSetupFailed(batchId: string): void {
  setupFailureListeners.forEach((listener) => listener(batchId));
}

/**
 * Subscribes to rescue setup failures. The global Money transaction monitor
 * uses this to show the failure toast; everything else should prefer the
 * transaction-status events that a successfully created transaction emits.
 *
 * @param listener - Called with the batch id of the failed submission.
 * @returns Unsubscribe function.
 */
export function subscribeMusdRescueSetupFailures(
  listener: MusdRescueSetupFailureListener,
): () => void {
  setupFailureListeners.add(listener);
  return () => {
    setupFailureListeners.delete(listener);
  };
}

/**
 * Test-only drain of the module-level registry.
 *
 * @returns Resolves when every tracked submission has settled.
 */
export async function flushMusdRescueInFlightForTests(): Promise<void> {
  await Promise.race([
    Promise.allSettled(
      Array.from(inFlightSubmissions.values(), (entry) => entry.completion),
    ),
    // A pending relay submission may never settle in tests.
    new Promise<void>((resolve) => setTimeout(resolve, 50)),
  ]);
}

/**
 * Test-only hard reset of the module-level registry, for suites whose
 * submissions intentionally never resolve.
 */
export function clearMusdRescueInFlightForTests(): void {
  inFlightSubmissions.clear();
}
