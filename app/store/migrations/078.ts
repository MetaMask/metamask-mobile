import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 78: Reset PhishingController phishingLists
 *
 * This migration resets only the phishingLists array in the PhishingController state
 * while preserving all other state properties. This allows the app to rebuild the lists
 * while maintaining user preferences and configuration.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 78;

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
          `Migration 078: Invalid PhishingController state: '${JSON.stringify(
            state.engine.backgroundState.PhishingController,
          )}'`,
        ),
      );
      return state;
    }

    // Only reset the phishingLists field to an empty array
    // while preserving all other fields
    state.engine.backgroundState.PhishingController.phishingLists = [];
    state.engine.backgroundState.PhishingController.stalelistLastFetched = 0;

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 078: cleaning PhishingController state failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
