import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 151: delete persisted `rawRemoteFeatureFlags`.
 *
 * `@metamask/remote-feature-flag-controller` 6.0.0 stops redacting IDs from
 * `rawRemoteFeatureFlags`. Existing persisted (redacted) values must not be
 * used to recompute flags.
 */
export const migrationVersion = 151;

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;
    if (
      !hasProperty(backgroundState, 'RemoteFeatureFlagController') ||
      !isObject(backgroundState.RemoteFeatureFlagController)
    ) {
      return state;
    }

    if (
      !hasProperty(
        backgroundState.RemoteFeatureFlagController,
        'rawRemoteFeatureFlags',
      )
    ) {
      return state;
    }

    const controllerState = {
      ...backgroundState.RemoteFeatureFlagController,
    };
    delete controllerState.rawRemoteFeatureFlags;

    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: controllerState,
        },
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to strip RemoteFeatureFlagController rawRemoteFeatureFlags: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
