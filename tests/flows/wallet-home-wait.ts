export interface WalletHomeWaitDeps {
  isReady(): Promise<boolean>;
  /** Called after each failed readiness pass (e.g. Android system overlays). */
  onNotReady(): Promise<void>;
  /** Dismisses a sheet covering wallet home. True when one was dismissed. */
  dismissInterruption(): Promise<boolean>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

export interface WalletHomeWaitOptions {
  timeoutMs: number;
  pollIntervalMs?: number;
  /**
   * Readiness time guaranteed after a dismissal. A readiness pass with a sheet
   * up can take ~16s on cloud devices and the dismiss tap ~15s more, so the
   * sheet is often closed after the original deadline.
   */
  postDismissGraceMs?: number;
  /** Bounds deadline extensions when a sheet keeps reappearing. */
  maxDismissals?: number;
}

export const WALLET_HOME_POST_DISMISS_GRACE_MS = 15_000;
const DEFAULT_POLL_INTERVAL_MS = 250;
const DEFAULT_MAX_DISMISSALS = 3;

/**
 * Polls wallet-home readiness. After every failed pass it checks for an
 * interrupting sheet; when one is dismissed, the deadline is extended so
 * readiness is re-checked instead of timing out right after the dismissal.
 *
 * @returns true when wallet home became ready, false on timeout
 */
export async function waitForWalletHomeReady(
  deps: WalletHomeWaitDeps,
  options: WalletHomeWaitOptions,
): Promise<boolean> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const graceMs =
    options.postDismissGraceMs ?? WALLET_HOME_POST_DISMISS_GRACE_MS;
  const maxDismissals = options.maxDismissals ?? DEFAULT_MAX_DISMISSALS;
  let deadline = deps.now() + options.timeoutMs;
  let dismissals = 0;

  while (deps.now() < deadline) {
    if (await deps.isReady()) {
      return true;
    }
    await deps.onNotReady();
    if (dismissals < maxDismissals && (await deps.dismissInterruption())) {
      dismissals++;
      deadline = Math.max(deadline, deps.now() + graceMs);
      continue;
    }
    await deps.sleep(pollIntervalMs);
  }
  return false;
}
