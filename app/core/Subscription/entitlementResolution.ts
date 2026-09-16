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
  /** Shared so concurrent callers issue one request instead of one each. */
  inFlight: Promise<void> | undefined;
  /**
   * Bumped by `reset` to invalidate requests already in flight. Without it, a
   * fetch started before a lock could report `resolved` afterwards and let the
   * next user skip resolution entirely.
   */
  generation: number;
  /**
   * Account whose entitlements last resolved successfully. Kept on the
   * singleton so a remount after an account switch still refetches instead of
   * treating the previous account's status as current.
   */
  resolvedAccountId: string | undefined;
}

const store: EntitlementResolutionStore = {
  status: 'idle',
  listeners: new Set(),
  inFlight: undefined,
  generation: 0,
  resolvedAccountId: undefined,
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

const fetchEntitlements = async (accountId?: string): Promise<void> => {
  const generation = store.generation;
  setStatus('loading');

  try {
    await Engine.context.SubscriptionController.getSubscriptions();
    if (generation === store.generation) {
      if (accountId !== undefined) {
        store.resolvedAccountId = accountId;
      }
      setStatus('resolved');
    }
  } catch (error) {
    Logger.error(
      error as Error,
      '[entitlementResolution] Failed to resolve subscription entitlements',
    );
    if (generation === store.generation) {
      setStatus('error');
    }
  } finally {
    if (generation === store.generation) {
      store.inFlight = undefined;
    }
  }
};

/**
 * Resolves entitlements once per session and account. Repeat calls while a
 * request is in flight share it. Calls after a successful resolution are a
 * no-op unless `accountId` differs from the last resolved account.
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
    return await store.inFlight;
  }

  store.inFlight = fetchEntitlements(accountId);
  return await store.inFlight;
};

/**
 * Re-resolves entitlements after an event that can change them, such as
 * subscribing, cancelling, or switching accounts.
 *
 * Always issues a new fetch. Joining an in-flight `ensureResolved` would
 * return the pre-mutation snapshot and could bounce a new subscriber out of
 * the hub.
 *
 * @param accountId - Selected internal account id to record on success. Omit
 * when the account has not changed (subscribe / cancel).
 * @returns A promise that settles when entitlements have been re-resolved.
 */
export const refresh = async (accountId?: string): Promise<void> => {
  store.generation += 1;
  store.inFlight = fetchEntitlements(accountId);
  return await store.inFlight;
};

/**
 * Clears resolution so the next consumer re-resolves. Call this on sign-out
 * and lock so a new session never inherits the previous user's status.
 */
export const reset = () => {
  store.generation += 1;
  store.inFlight = undefined;
  store.resolvedAccountId = undefined;
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
};
