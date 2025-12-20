import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 110: Remove SwapsController state
 *
 * This migration removes the entire SwapsController from backgroundState
 * as it's no longer used (functionality moved to BridgeController/unified swaps).
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 110;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const backgroundState = state?.engine?.backgroundState;

    if (!backgroundState) {
      return state;
    }

    if (
      hasProperty(backgroundState, 'SwapsController') &&
      isObject(backgroundState.SwapsController)
    ) {
      delete backgroundState.SwapsController;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${error}`),
    );
    return state;
  }
};

export default migration;
