import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';

export const migrationVersion = 131;

/**
 * Migration 131: Mark social login users with marketing consent for a one-time
 * post-rehydrate analytics backfill.
 *
 * This migration stays pure and only writes a persisted marker. The actual
 * analytics side effect is handled after rehydration when the live store and
 * analytics runtime are ready.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(
        state.engine.backgroundState,
        'SeedlessOnboardingController',
      ) ||
      !isObject(state.engine.backgroundState.SeedlessOnboardingController)
    ) {
      return state;
    }

    const seedlessController =
      state.engine.backgroundState.SeedlessOnboardingController;

    const authConnection =
      hasProperty(seedlessController, 'authConnection') &&
      typeof seedlessController.authConnection === 'string' &&
      seedlessController.authConnection !== ''
        ? seedlessController.authConnection
        : null;

    if (!authConnection) {
      return state;
    }

    if (!hasProperty(state, 'onboarding') || !isObject(state.onboarding)) {
      return state;
    }

    state.onboarding.pendingSocialLoginMarketingConsentBackfill =
      authConnection;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to mark pending social login marketing consent backfill: ${String(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
