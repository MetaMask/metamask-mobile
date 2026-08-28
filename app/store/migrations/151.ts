import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 151: Remove the PhishingController scan caches
 *
 * This migration removes the urlScanCache, tokenScanCache, and
 * addressScanCache properties from PhishingController state. Scan results are
 * now cached (and persisted) by the PhishingDataService query cache instead
 * of controller state.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 151;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state.engine.backgroundState, 'PhishingController') ||
      !isObject(state.engine.backgroundState.PhishingController)
    ) {
      // The controller state may legitimately be missing; there is nothing to
      // clean up in that case.
      return state;
    }

    delete state.engine.backgroundState.PhishingController.urlScanCache;
    delete state.engine.backgroundState.PhishingController.tokenScanCache;
    delete state.engine.backgroundState.PhishingController.addressScanCache;

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 151: cleaning PhishingController state failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
