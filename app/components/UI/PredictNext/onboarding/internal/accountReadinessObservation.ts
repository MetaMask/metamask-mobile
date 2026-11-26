import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../util/deviceCapability/types';
import type {
  AccountReadinessAdapter,
  AccountReadinessSnapshot,
} from '../accountReadiness.types';

export const ACCOUNT_READINESS_REVIEW_BUDGET_MS = 120_000;
export const ACCOUNT_READINESS_POLL_MS = 15_000;
export const ACCOUNT_READINESS_SLOW_CELLULAR_POLL_MS = 60_000;
export const ACCOUNT_READINESS_MAX_POLLS = 8;
export const ACCOUNT_READINESS_LOW_HARDWARE_MAX_POLLS = 4;
export const ACCOUNT_READINESS_MIN_READ_GAP_MS = 5_000;
export const ACCOUNT_READINESS_READ_TIMEOUT_MS = 15_000;

export interface AccountReadinessObservationContext {
  scope: string | null;
  isFocused: boolean;
  appState: string;
  isEligible: boolean;
  isSetupOpen: boolean;
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
  latency: 'UNKNOWN' | 'OK' | 'SLOW';
}

export interface AccountReadinessObservationClock {
  now(): number;
  setTimeout(
    callback: () => void,
    delay: number,
  ): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}

export interface AccountReadinessObservationMetadata {
  isRefreshing: boolean;
  readError: 'none' | 'unavailable';
  latency: 'unknown' | 'ok' | 'slow';
}

export interface AccountReadinessObservationOptions {
  adapter: AccountReadinessAdapter;
  context: AccountReadinessObservationContext;
  publish(snapshot: AccountReadinessSnapshot): void;
  onMetadata?(metadata: AccountReadinessObservationMetadata): void;
  clock?: AccountReadinessObservationClock;
  subscribeAppState?(listener: (state: string) => void): () => void;
}

export interface AccountReadinessObservation {
  update(context: AccountReadinessObservationContext): void;
  refreshStatus(): void;
  dispose(): void;
}

/** Owns one passive observation episode. Lifecycle inputs never start setup. */
export function createAccountReadinessObservation(
  options: AccountReadinessObservationOptions,
): AccountReadinessObservation {
  const { adapter } = options;
  const clock: AccountReadinessObservationClock = options.clock ?? {
    now: Date.now,
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
  };
  let context = options.context;
  let disposed = false;
  let generation = 0;
  let deadline: number | undefined;
  let polls = 0;
  let failures = 0;
  let stopped = false;
  let lastCompleted: number | undefined;
  let snapshot: AccountReadinessSnapshot | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let flight:
    | { controller: AbortController; promise: Promise<void> }
    | undefined;
  let readError: AccountReadinessObservationMetadata['readError'] = 'none';

  const canRead = (): boolean =>
    !disposed &&
    context.scope !== null &&
    context.isFocused &&
    context.appState === 'active' &&
    context.isEligible &&
    !context.isSetupOpen &&
    context.networkTier !== 'NONE';

  const metadata = (): void =>
    options.onMetadata?.({
      isRefreshing: flight !== undefined,
      readError,
      latency:
        context.latency === 'SLOW'
          ? 'slow'
          : context.latency === 'OK'
            ? 'ok'
            : 'unknown',
    });

  const clearTimer = (): void => {
    if (timer !== undefined) {
      clock.clearTimeout(timer);
      timer = undefined;
    }
  };

  const cancel = (): void => {
    generation += 1;
    clearTimer();
    if (timeout !== undefined) {
      clock.clearTimeout(timeout);
      timeout = undefined;
    }
    flight?.controller.abort();
    flight = undefined;
  };

  const resetEpisode = (): void => {
    deadline = undefined;
    polls = 0;
    failures = 0;
    stopped = false;
  };

  const schedule = (): void => {
    clearTimer();
    if (!canRead() || stopped || snapshot?.readiness !== 'verifying') {
      return;
    }
    deadline ??= clock.now() + ACCOUNT_READINESS_REVIEW_BUDGET_MS;
    const cap =
      context.hardwareTier === 'LOW'
        ? ACCOUNT_READINESS_LOW_HARDWARE_MAX_POLLS
        : ACCOUNT_READINESS_MAX_POLLS;
    const delay =
      context.networkTier === 'SLOW_CELLULAR'
        ? ACCOUNT_READINESS_SLOW_CELLULAR_POLL_MS
        : ACCOUNT_READINESS_POLL_MS;
    if (polls >= cap || clock.now() + delay > deadline) {
      stopped = true;
      return;
    }
    timer = clock.setTimeout(() => {
      timer = undefined;
      if (canRead() && deadline !== undefined && clock.now() <= deadline) {
        polls += 1;
        read(false).catch(() => undefined);
      }
    }, delay);
  };

  const accept = (value: AccountReadinessSnapshot): void => {
    snapshot = value;
    options.publish(value);
    if (value.readiness !== 'verifying') {
      clearTimer();
    } else if (!flight) {
      schedule();
    }
  };

  async function read(explicit: boolean): Promise<void> {
    if (!canRead()) {
      return;
    }
    if (flight) {
      return flight.promise;
    }
    if (
      !explicit &&
      lastCompleted !== undefined &&
      clock.now() - lastCompleted < ACCOUNT_READINESS_MIN_READ_GAP_MS
    ) {
      schedule();
      return;
    }
    clearTimer();
    const captured = generation;
    const controller = new AbortController();
    let rejectTimeout: (error: Error) => void = () => undefined;
    const timedOut = new Promise<never>((_resolve, reject) => {
      rejectTimeout = reject;
    });
    timeout = clock.setTimeout(() => {
      controller.abort();
      rejectTimeout(new Error('Account readiness read timed out'));
    }, ACCOUNT_READINESS_READ_TIMEOUT_MS);
    // Defer invocation until flight exists, including for synchronous subscribers.
    const promise = Promise.resolve()
      .then((): Promise<AccountReadinessSnapshot> | undefined => {
        if (captured !== generation || !canRead()) {
          return undefined;
        }
        return Promise.race([
          adapter.readStatus({ signal: controller.signal }),
          timedOut,
        ]);
      })
      .then((value) => {
        if (captured !== generation || !canRead() || !value) {
          return;
        }
        failures = 0;
        readError = 'none';
        accept(value);
      })
      .catch(() => {
        if (captured === generation && canRead()) {
          failures += 1;
          readError = 'unavailable';
          stopped = failures >= 2;
        }
      })
      .finally(() => {
        if (captured !== generation) {
          return;
        }
        if (timeout !== undefined) {
          clock.clearTimeout(timeout);
          timeout = undefined;
        }
        flight = undefined;
        lastCompleted = clock.now();
        metadata();
        schedule();
      });
    flight = { controller, promise };
    metadata();
    return promise;
  }

  const unsubscribe = adapter.subscribe((value) => {
    if (canRead()) {
      accept(value);
    }
  });

  const update = (next: AccountReadinessObservationContext): void => {
    if (disposed) {
      return;
    }
    const wasReadable = canRead();
    const identityChanged = context.scope !== next.scope;
    const tiersChanged =
      context.hardwareTier !== next.hardwareTier ||
      context.networkTier !== next.networkTier;
    context = next;
    if (identityChanged) {
      cancel();
      snapshot = undefined;
      lastCompleted = undefined;
      readError = 'none';
      resetEpisode();
    }
    if (!canRead()) {
      cancel();
    } else if (!wasReadable || identityChanged) {
      resetEpisode();
      read(false).catch(() => undefined);
    } else if (!flight && tiersChanged) {
      schedule();
    }
    metadata();
  };
  const removeAppState = options.subscribeAppState?.((appState) =>
    update({ ...context, appState }),
  );
  read(false).catch(() => undefined);

  return {
    update,
    refreshStatus(): void {
      if (canRead()) {
        resetEpisode();
        read(true).catch(() => undefined);
      }
    },
    dispose(): void {
      if (!disposed) {
        disposed = true;
        cancel();
        unsubscribe();
        removeAppState?.();
      }
    },
  };
}
