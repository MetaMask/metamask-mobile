import Engine from '../Engine';
import Logger from '../../util/Logger';

/**
 * Whether this session has attempted `getBenefits()`.
 *
 * The controller persists `state.benefits` but has no loading flag, and
 * lifecycle refreshes swallow errors. This store tracks the in-flight attempt
 * so the overview can distinguish first load, retry, and stale cache.
 */
export type BenefitsResolutionStatus =
  | 'idle'
  | 'loading'
  | 'resolved'
  | 'error';

interface BenefitsResolutionStore {
  status: BenefitsResolutionStatus;
  listeners: Set<() => void>;
  inFlight: Promise<void> | undefined;
  generation: number;
}

const store: BenefitsResolutionStore = {
  status: 'idle',
  listeners: new Set(),
  inFlight: undefined,
  generation: 0,
};

const emit = () => {
  store.listeners.forEach((listener) => listener());
};

const setStatus = (status: BenefitsResolutionStatus) => {
  if (store.status === status) {
    return;
  }
  store.status = status;
  emit();
};

const fetchBenefits = async (): Promise<void> => {
  const generation = store.generation;
  setStatus('loading');

  try {
    await Engine.context.SubscriptionController.getBenefits();
    if (generation === store.generation) {
      setStatus('resolved');
    }
  } catch (error) {
    Logger.error(
      error as Error,
      '[benefitsResolution] Failed to resolve subscription benefits',
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
 * Resolves benefits once per session. Repeat calls while a request is in
 * flight share it, and calls after a successful resolution are a no-op.
 *
 * @returns A promise that settles when benefits have been resolved.
 */
export const ensureResolved = async (): Promise<void> => {
  if (store.status === 'resolved') {
    return;
  }

  if (store.inFlight) {
    return await store.inFlight;
  }

  store.inFlight = fetchBenefits();
  return await store.inFlight;
};

/**
 * Re-fetches benefits after subscribe, cancel, account change, or a manual
 * retry. Joins an in-flight request instead of issuing a second one.
 *
 * @returns A promise that settles when benefits have been re-resolved.
 */
export const refresh = async (): Promise<void> => {
  if (store.inFlight) {
    return await store.inFlight;
  }

  store.inFlight = fetchBenefits();
  return await store.inFlight;
};

/**
 * Clears resolution so the next subscriber re-fetches. Call this on sign-out
 * and lock so a new session never inherits the previous user's status.
 */
export const reset = () => {
  store.generation += 1;
  store.inFlight = undefined;
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
export const getSnapshot = (): BenefitsResolutionStatus => store.status;

/** Test-only: clears status, listeners, and any in-flight request. */
export const __resetForTest = () => {
  store.status = 'idle';
  store.inFlight = undefined;
  store.listeners.clear();
  store.generation = 0;
};
