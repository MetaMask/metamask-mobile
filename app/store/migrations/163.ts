import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 163: let users who watched the Rive Money onboarding see the
 * splash. The old persist transform copied `moneyOnboardingSeen` into
 * `moneySplashSeen`, so those users would otherwise skip the replacement FTUE.
 */
export const migrationVersion = 163;

export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state, 'user') || !isObject(state.user)) {
      return state;
    }

    if (state.user.moneyOnboardingSeen === true) {
      state.user.moneySplashSeen = false;
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to reset moneySplashSeen: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
}
