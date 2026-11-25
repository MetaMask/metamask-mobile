import type {
  KalshiOnboardingState,
  KalshiOnboardingStatus,
} from '../../contracts/v1/onboarding';
import type {
  AccountReadinessAdapter,
  AccountReadinessSnapshot,
  AccountSetupIntent,
} from '../accountReadiness.types';
import { mapKalshiAccountReadiness } from './kalshiAccountReadiness';
import type { OnboardingFailure } from './kalshiDemoOnboardingMachine';
import type { KalshiOnboardingApi } from './useKalshiDemoOnboarding';

type ReadinessFailure = Pick<OnboardingFailure, 'message' | 'next'>;

export interface KalshiAccountReadinessAdapter extends AccountReadinessAdapter {
  publishStatus(state: KalshiOnboardingState): void;
  publishFailure(failure: OnboardingFailure): void;
  resetSetup(): void;
  dispose(): void;
}

export interface CreateKalshiAccountReadinessAdapterOptions {
  client: KalshiOnboardingApi;
  openSetup(this: void, intent: AccountSetupIntent): void;
  isCurrent(this: void): boolean;
}

const cancelledRead = (): Error => {
  const error = new Error('Account readiness read cancelled');
  error.name = 'AbortError';
  return error;
};

/** Owns one identity-scoped status projection; it never starts the setup flow on read. */
export function createKalshiAccountReadinessAdapter({
  client,
  openSetup,
  isCurrent,
}: CreateKalshiAccountReadinessAdapterOptions): KalshiAccountReadinessAdapter {
  const listeners = new Set<(snapshot: AccountReadinessSnapshot) => void>();
  const pending: AccountReadinessSnapshot[] = [];
  let state: KalshiOnboardingState | undefined;
  let failure: ReadinessFailure | undefined;
  let sequence = 0;
  let disposed = false;
  let setupOpen = false;
  let notifying = false;

  const current = (): boolean => !disposed && isCurrent();

  const notify = (snapshot: AccountReadinessSnapshot): void => {
    pending.push(snapshot);
    if (notifying) return;
    notifying = true;
    try {
      while (pending.length && current()) {
        const next = pending.shift();
        if (!next) break;
        for (const listener of listeners) {
          if (!current()) break;
          listener(next);
        }
      }
    } finally {
      pending.length = 0;
      notifying = false;
    }
  };

  const updateStatus = (
    next: KalshiOnboardingState,
  ): AccountReadinessSnapshot => {
    state = next;
    if (next === 'active' || next === 'approved' || next === 'kyc_review') {
      failure = undefined;
    }
    const snapshot = mapKalshiAccountReadiness(state, failure);
    notify(snapshot);
    return snapshot;
  };

  return {
    async readStatus({ signal }) {
      if (!current() || signal.aborted) throw cancelledRead();
      const request = ++sequence;
      let result: KalshiOnboardingStatus;
      try {
        result = await client.getStatus({ signal });
      } catch (error) {
        if (!current() || signal.aborted || request !== sequence) {
          throw cancelledRead();
        }
        throw error;
      }
      if (!current() || signal.aborted || request !== sequence) {
        throw cancelledRead();
      }
      const snapshot = updateStatus(result.state);
      if (!current() || signal.aborted || request !== sequence) {
        throw cancelledRead();
      }
      return snapshot;
    },
    subscribe(listener) {
      if (!current()) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    openSetup(intent) {
      if (!current() || setupOpen) return;
      setupOpen = true;
      sequence += 1;
      try {
        openSetup(intent);
      } catch (error) {
        setupOpen = false;
        throw error;
      }
    },
    publishStatus(next) {
      if (!current()) return;
      sequence += 1;
      updateStatus(next);
    },
    publishFailure(next) {
      if (!current()) return;
      sequence += 1;
      const projection = mapKalshiAccountReadiness(undefined, next);
      if (projection.card.kind !== 'action_required') return;
      failure = { message: next.message, next: next.next };
      notify(mapKalshiAccountReadiness(state, failure));
    },
    resetSetup() {
      if (current()) setupOpen = false;
    },
    dispose() {
      disposed = true;
      sequence += 1;
      listeners.clear();
      pending.length = 0;
    },
  };
}
