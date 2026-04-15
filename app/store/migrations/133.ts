import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';
import { WALLET_HOME_ONBOARDING_STEPS_INITIAL } from '../../constants/walletHomeOnboardingSteps';

export const migrationVersion = 133;

/**
 * Migration 133: Initialize wallet home post-onboarding steps persisted fields.
 *
 * - `walletHomeOnboardingStepsEligible`: existing installs stay false until a first-time
 * onboarding success flow sets it true.
 * - `walletHomeOnboardingSteps`: step/suppression state for the empty-balance steps tile.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state, 'onboarding') || !isObject(state.onboarding)) {
      return state;
    }

    const prev = state.onboarding as Record<string, unknown>;
    const onboarding = { ...prev };
    let changed = false;

    if (
      !hasProperty(onboarding, 'walletHomeOnboardingStepsEligible') ||
      typeof onboarding.walletHomeOnboardingStepsEligible !== 'boolean'
    ) {
      onboarding.walletHomeOnboardingStepsEligible = false;
      changed = true;
    }

    if (
      !hasProperty(onboarding, 'walletHomeOnboardingSteps') ||
      !isObject(onboarding.walletHomeOnboardingSteps)
    ) {
      onboarding.walletHomeOnboardingSteps = {
        ...WALLET_HOME_ONBOARDING_STEPS_INITIAL,
      };
      changed = true;
    }

    if (!changed) {
      return state;
    }

    return {
      ...state,
      onboarding,
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to initialize wallet home onboarding steps: ${String(
          error,
        )}`,
      ),
    );
    return state;
  }
};

export default migration;
