import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';

export const migrationVersion = 115;

interface RemoteFeatureFlagControllerState {
  cacheTimestamp?: number;
  remoteFeatureFlags?: Record<string, unknown>;
  rawRemoteFeatureFlags?: Record<string, unknown>;
  localOverrides?: Record<string, unknown>;
}

/**
 * This migration resets the RemoteFeatureFlagController's cacheTimestamp to 0
 * to force a fresh fetch of feature flags on app upgrade.
 *
 * Background:
 * When upgrading from older versions (7.62.2/7.63.0) to newer versions (7.64.0),
 * the persisted RemoteFeatureFlagController state may have stale feature flags.
 * The controller checks cacheTimestamp to determine if it should fetch new flags.
 * If the cache is still valid (within fetchInterval), it won't fetch new flags.
 * This causes new features (like the Explore tab) to not appear after upgrade.
 *
 * The fix:
 * Reset cacheTimestamp to 0 to force the controller to fetch fresh flags.
 * This ensures users get the latest feature flags after upgrading.
 *
 * @param state - MetaMask mobile state
 * @returns Updated MetaMask mobile state with reset cacheTimestamp
 */
export default async function migrate(stateAsync: unknown): Promise<unknown> {
  const state = cloneDeep(await stateAsync);

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state.engine.backgroundState, 'RemoteFeatureFlagController')
    ) {
      // RemoteFeatureFlagController doesn't exist in persisted state
      // This is expected for very old versions - nothing to migrate
      return state;
    }

    const remoteFeatureFlagControllerState = state.engine.backgroundState
      .RemoteFeatureFlagController as
      | RemoteFeatureFlagControllerState
      | undefined;

    if (!isObject(remoteFeatureFlagControllerState)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid RemoteFeatureFlagController state: '${typeof remoteFeatureFlagControllerState}'`,
        ),
      );
      return state;
    }

    // Reset cacheTimestamp to 0 to force a fresh fetch of feature flags
    // This ensures the controller will fetch new flags on next initialization
    remoteFeatureFlagControllerState.cacheTimestamp = 0;

    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion}: ${String(error)}`),
    );
    // Return state unchanged on error - the feature flags will eventually refresh
    return state;
  }
}
