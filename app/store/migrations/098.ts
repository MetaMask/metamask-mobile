import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../util/device';
// Note: Do NOT rely on a static controller list. Iterate discovered
// controllers from the legacy engine.backgroundState to avoid missing any.

/**
 * Migration to transition from old redux-persist engine data to new individual controller storage system.
 *
 * This migration:
 * 1. Checks if old engine data exists in redux-persist
 * 2. Splits the engine data into individual controller files
 * 3. Saves each controller to its own file using the new storage system
 * 4. Clears the old engine data from redux-persist
 *
 * @param state - The current MetaMask extension state.
 * @returns The updated state with engine data cleared from redux-persist.
 */
export default async function migrate(state: unknown) {
  if (!ensureValidState(state, 98)) {
    return state;
  }

  try {
    const { engine } = state;

    if (
      hasProperty(engine, 'backgroundState') &&
      isObject(engine.backgroundState) &&
      Object.keys(engine.backgroundState).length > 0
    ) {
      const controllers = engine.backgroundState;
      let failedControllers = 0;
      const failedControllerStates: Record<string, unknown> = {};

      // Migrate every controller present in the legacy backgroundState
      for (const controllerName of Object.keys(controllers)) {
        try {
          if (
            hasProperty(controllers, controllerName) &&
            isObject(controllers[controllerName])
          ) {
            const controllerState = controllers[controllerName];

            const key = `persist:${controllerName}`;
            const value = JSON.stringify(controllerState);

            await FilesystemStorage.setItem(key, value, Device.isIos());
          }
        } catch (error) {
          failedControllers++;
          captureException(
            new Error(
              `Migration 98: Failed to migrate ${controllerName} to individual storage: ${String(
                error,
              )}`,
            ),
          );

          // Preserve failed controller state to prevent data loss
          if (hasProperty(controllers, controllerName)) {
            failedControllerStates[controllerName] =
              controllers[controllerName];
          }
        }
      }

      // Only clear successfully migrated controllers, preserve failed ones to prevent data loss
      // Create new state object to maintain immutability
      const newState = { ...state };
      newState.engine = {
        ...engine,
        backgroundState: failedControllers > 0 ? failedControllerStates : {},
      };

      if (failedControllers > 0) {
        captureException(
          new Error(
            `Migration 98: ${failedControllers} controllers failed to migrate, preserving their state in redux-persist`,
          ),
        );
      }

      return newState;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 98: Failed to migrate from redux-persist to individual controller storage: ${String(
          error,
        )}`,
      ),
    );

    return state;
  }
}
