import Engine from '../Engine';
import Logger from '../../util/Logger';

/**
 * Whether the current session has established the user's Money Account Plus
 * entitlements.
 *
 * `SubscriptionController` writes state only when a field actually changes,
 * so an absent `productEntitlements` cannot be read as "not fetched yet" — a
 * first successful fetch for a non-subscriber legitimately writes nothing.
 * This store therefore tracks resolution app-side so callers can distinguish
 * "still loading" from "resolved with no entitlement" and avoid rendering
 * subscriber-only UI against unresolved state.
 */
export type EntitlementResolutionStatus =
  | 'idle'
  | 'loading'
  | 'resolved'
  | 'error';

interface EntitlementResolutionStore {
  status: EntitlementResolutionStatus;
  listeners: Set<() => void>;
  /** Shared so concurrent callers wait on one serialized fetch loop. */
  inFlight: Promise<void> | undefined;
  /**
   * Bumped by `reset` and `refresh` to invalidate requests already in flight.
   * Without it, a fetch started before a lock could report `resolved`
   * afterwards and let the next user skip resolution entirely.
   */
  generation: number;
  /**
   * Account whose entitlements last resolved successfully. Kept on the
   * singleton so a remount after an account switch still refetches instead of
   * treating the previous account's status as current.
   */
  resolvedAccountId: string | undefined;
  /**
   * Latest account a caller asked to resolve. Compared while a fetch is in
   * flight so a switch queues a follow-up instead of joining the stale one.
   */
  requestedAccountId: string | undefined;
  /**
   * When true, the fetch loop must run `getSubscriptions` again after the
   * current call so overlapping requests never write controller state out of
   * order.
   */
  queuedRefresh: boolean;
  /**
   * Identity of the active fetch loop. `startFetch` assigns a new id; `reset`
   * bumps it so an orphaned loop cannot treat a later `queuedRefresh` as its
   * own follow-up and start a second `getSubscriptions` beside the new session.
   */
  fetchLoopId: number;
}

const store: EntitlementResolutionStore = {
  status: 'idle',
  listeners: new Set(),
  inFlight: undefined,
  generation: 0,
  resolvedAccountId: undefined,
  requestedAccountId: undefined,
  queuedRefresh: false,
  fetchLoopId: 0,
};

const emit = () => {
  store.listeners.forEach((listener) => listener());
};

const setStatus = (status: EntitlementResolutionStatus) => {
  if (store.status === status) {
    return;
  }
  store.status = status;
  emit();
};

const wasSuperseded = (generation: number): boolean =>
  generation !== store.generation || store.queuedRefresh;

/**
 * Continue only when this loop is still the active one. After `reset` the
 * orphaned loop's id no longer matches, so a later `queuedRefresh` belongs to
 * the new session's loop — not to this discarded generation.
 */
const shouldContinueLoop = (generation: number, loopId: number): boolean =>
  wasSuperseded(generation) &&
  store.queuedRefresh &&
  store.fetchLoopId === loopId;

const fetchEntitlements = async (loopId: number): Promise<void> => {
  while (true) {
    const generation = store.generation;
    const accountId = store.requestedAccountId;
    store.queuedRefresh = false;
    setStatus('loading');

    try {
      await Engine.context.SubscriptionController.getSubscriptions();
    } catch (error) {
      Logger.error(
        error as Error,
        '[entitlementResolution] Failed to resolve subscription entitlements',
      );
      if (shouldContinueLoop(generation, loopId)) {
        continue;
      }
      if (wasSuperseded(generation)) {
        return;
      }
      setStatus('error');
      return;
    }

    if (shouldContinueLoop(generation, loopId)) {
      continue;
    }
    if (wasSuperseded(generation)) {
      return;
    }

    if (accountId !== undefined) {
      store.resolvedAccountId = accountId;
    }
    setStatus('resolved');
    return;
  }
};

const startFetch = (): Promise<void> => {
  store.fetchLoopId += 1;
  const loopId = store.fetchLoopId;
  const run = fetchEntitlements(loopId).finally(() => {
    if (store.inFlight === run) {
      store.inFlight = undefined;
    }
  });
  store.inFlight = run;
  return run;
};

/**
 * Re-resolves entitlements after an event that can change them, such as
 * subscribing, cancelling, or switching accounts.
 *
 * Always results in a fetch for the latest request. If one is already in
 * flight, that call finishes first and a follow-up `getSubscriptions` runs
 * afterward so controller state is never written by overlapping responses.
 *
 * @param accountId - Selected internal account id to record on success. Omit
 * when the account has not changed (subscribe / cancel).
 * @returns A promise that settles when entitlements have been re-resolved.
 */
export const refresh = async (accountId?: string): Promise<void> => {
  store.generation += 1;
  store.requestedAccountId = accountId;
  store.queuedRefresh = true;

  if (store.inFlight) {
    return await store.inFlight;
  }

  return await startFetch();
};

/**
 * Resolves entitlements once per session and account. Repeat calls while a
 * request is in flight share it when they target the same account. Calls after
 * a successful resolution are a no-op unless `accountId` differs from the last
 * resolved account.
 *
 * @param accountId - Selected internal account id. When omitted, a resolved
 * status is treated as current regardless of account.
 * @returns A promise that settles when entitlements have been resolved.
 */
export const ensureResolved = async (accountId?: string): Promise<void> => {
  if (store.status === 'resolved') {
    if (accountId === undefined || store.resolvedAccountId === accountId) {
      return;
    }

    return await refresh(accountId);
  }

  if (store.inFlight) {
    if (accountId === undefined || accountId === store.requestedAccountId) {
      return await store.inFlight;
    }

    return await refresh(accountId);
  }

  store.requestedAccountId = accountId;
  return await startFetch();
};

/**
 * Clears resolution so the next consumer re-resolves. Call this on sign-out
 * and lock so a new session never inherits the previous user's status.
 */
export const reset = () => {
  store.generation += 1;
  store.fetchLoopId += 1;
  store.inFlight = undefined;
  store.resolvedAccountId = undefined;
  store.requestedAccountId = undefined;
  store.queuedRefresh = false;
  setStatus('idle');
};

/**
 * Subscribes to resolution status changes.
 *
 * @param listener - Called whenever the status changes.
 * @returns An unsubscribe function.
 */
export const subscribe = (listener: () => void): (() => void) => {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
};

/**
 * Reads the current resolution status.
 *
 * @returns The current status.
 */
export const getSnapshot = (): EntitlementResolutionStatus => store.status;

/** Test-only: clears status, listeners, and any in-flight request. */
export const __resetForTest = () => {
  store.status = 'idle';
  store.inFlight = undefined;
  store.listeners.clear();
  store.generation = 0;
  store.resolvedAccountId = undefined;
  store.requestedAccountId = undefined;
  store.queuedRefresh = false;
  store.fetchLoopId = 0;
};
