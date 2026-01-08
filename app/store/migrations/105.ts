import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 105: Remove RatesController state
 *
 * This migration removes the entire RatesController from backgroundState
 * as it's no longer used (functionality moved to MultichainAssetsRatesController)
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 105;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const backgroundState = state?.engine?.backgroundState;

    if (!backgroundState) {
      return state;
    }

    if (
      hasProperty(backgroundState, 'RatesController') &&
      isObject(backgroundState.RatesController)
    ) {
      delete backgroundState.RatesController;
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
