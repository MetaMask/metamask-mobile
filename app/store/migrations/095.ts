import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';

/**
 * Migration 095: Convert PerpsController isFirstTimeUser from boolean to object
 *
 * This migration handles the breaking change where isFirstTimeUser was changed from
 * a boolean to a per-network object format. This prevents runtime errors when
 * accessing properties on the old boolean value.
 *
 * Changes:
 * - Convert boolean isFirstTimeUser to { testnet: boolean, mainnet: boolean }
 * - If user had completed tutorial (false), both networks are marked as completed
 * - If user was first-time (true), both networks are marked as first-time
 */
export default function migrate(state: unknown): unknown {
  const migrationVersion = 95;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    // Check if PerpsController exists in the background state
    if (
      hasProperty(state.engine, 'backgroundState') &&
      isObject(state.engine.backgroundState) &&
      hasProperty(state.engine.backgroundState, 'PerpsController') &&
      isObject(state.engine.backgroundState.PerpsController) &&
      hasProperty(
        state.engine.backgroundState.PerpsController,
        'isFirstTimeUser',
      )
    ) {
      const perpsController = state.engine.backgroundState.PerpsController;
      const isFirstTimeUser = perpsController.isFirstTimeUser;

      // Only migrate if isFirstTimeUser is a boolean (old format)
      if (typeof isFirstTimeUser === 'boolean') {
        // Convert boolean to object format
        // If user had completed tutorial (false), mark both networks as completed
        // If user was first-time (true), mark both networks as first-time
        perpsController.isFirstTimeUser = {
          testnet: isFirstTimeUser,
          mainnet: isFirstTimeUser,
        };
      }
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to convert PerpsController isFirstTimeUser: ${String(
          error,
        )}`,
      ),
    );
    // Return the original state if migration fails to avoid breaking the app
    return state;
  }
}
