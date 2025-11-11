import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 104: Reset PhishingController urlScanCache
 *
 * This migration resets only the urlScanCache object in the PhishingController state
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 104;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state.engine.backgroundState, 'PhishingController') ||
      !isObject(state.engine.backgroundState.PhishingController)
    ) {
      captureException(
        new Error(
          `Migration 104: Invalid PhishingController state: '${JSON.stringify(
            state.engine.backgroundState.PhishingController,
          )}'`,
        ),
      );
      return state;
    }

    // Only reset the urlScanCache field to an empty object
    state.engine.backgroundState.PhishingController.urlScanCache = {};

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 104: cleaning PhishingController state failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
