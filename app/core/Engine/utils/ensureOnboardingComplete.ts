import { take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';
import { runSaga, store } from '../../../store';
import { selectCompletedOnboarding } from '../../../selectors/onboarding';
import {
  SET_COMPLETED_ONBOARDING,
  type SetCompletedOnboardingAction,
} from '../../../actions/onboarding';

let onboardingPromise: Promise<void> | null = null;

function* waitForOnboardingCompleteSaga(): SagaIterator {
  while (true) {
    const result = (yield take([
      SET_COMPLETED_ONBOARDING,
    ])) as SetCompletedOnboardingAction;

    if (result.completedOnboarding) {
      return;
    }
  }
}

/**
 * Get whether onboarding is complete.
 *
 * @returns Whether onboarding is complete.
 */
export function isOnboardingComplete() {
  return selectCompletedOnboarding(store.getState());
}

/**
 * Resolves when onboarding is complete. Resolves immediately when onboarding
 * is already done; otherwise waits for the `SET_COMPLETED_ONBOARDING` action
 * with `completedOnboarding: true`.
 *
 * The pending promise is shared across concurrent callers so a single saga
 * task drives the wait.
 */
export async function ensureOnboardingComplete(): Promise<void> {
  if (isOnboardingComplete()) {
    return;
  }

  if (!onboardingPromise) {
    onboardingPromise = runSaga(waitForOnboardingCompleteSaga).toPromise();
  }

  try {
    await onboardingPromise;
  } finally {
    onboardingPromise = null;
  }
}
