import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 133:
 *
 * Resets `AuthenticationController.isSignedIn` to `false` so that the first
 * app launch after upgrade triggers `performSignIn`, which now includes
 * automatic SRP profile pairing (ADR 0006).
 *
 * `srpSessionData` is intentionally preserved — cached tokens are still valid
 * and will be reused. The pairing call is idempotent.
 *
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 133;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (
    !hasProperty(state.engine.backgroundState, 'AuthenticationController') ||
    !isObject(state.engine.backgroundState.AuthenticationController)
  ) {
    return state;
  }

  const authController = state.engine.backgroundState.AuthenticationController;

  if (
    !hasProperty(authController, 'isSignedIn') ||
    !authController.isSignedIn
  ) {
    return state;
  }

  authController.isSignedIn = false;

  return state;
};

export default migration;
