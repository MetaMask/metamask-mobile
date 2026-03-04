import { ControllerInitFunction } from '../types';
import {
  ClientConfigApiService,
  ClientType,
  RemoteFeatureFlagController,
  type RemoteFeatureFlagControllerMessenger,
  type RemoteFeatureFlagControllerState,
} from '@metamask/remote-feature-flag-controller';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
  isRemoteFeatureFlagOverrideActivated,
} from './remote-feature-flag-controller';
import { getBaseSemVerVersion } from '../../../util/version';
import { buildTimeDefaultsConfig } from './remote-feature-flag-build-time-defaults-config';

/**
 * Get build-time feature flag defaults from environment variable.
 * Set by apply-build-config.js from builds.yml (e.g. in GitHub Actions "Apply build config" step).
 *
 * @returns Parsed defaults object or empty object if unset/invalid.
 */
function getBuildTimeFeatureFlagDefaults(): Record<string, unknown> {
  try {
    const defaults = process.env.REMOTE_FEATURE_FLAG_DEFAULTS;
    if (defaults) {
      return JSON.parse(defaults);
    }
  } catch (error) {
    Logger.log('Failed to parse REMOTE_FEATURE_FLAG_DEFAULTS:', error);
  }
  return {};
}

/**
 * Merge build-time defaults with persisted state.
 * Build-time defaults (from builds.yml) are used as initial values; persisted state takes precedence.
 * Only applied when running in GitHub Actions (non-E2E); Bitrise/local unchanged.
 *
 * @param persistedState - Persisted RemoteFeatureFlagController state, if any.
 * @param buildTimeDefaultsJsonOverride - Optional JSON string (e.g. for tests) to use instead of REMOTE_FEATURE_FLAG_DEFAULTS env.
 * @returns State to pass to the controller (merged when GH Actions, else persisted as-is).
 */
function getInitialState(
  persistedState: RemoteFeatureFlagControllerState | undefined,
  buildTimeDefaultsJsonOverride?: string,
): RemoteFeatureFlagControllerState | undefined {
  if (!buildTimeDefaultsConfig.shouldApply()) {
    return persistedState;
  }

  let buildTimeDefaults: Record<string, unknown>;
  if (buildTimeDefaultsJsonOverride !== undefined) {
    try {
      buildTimeDefaults = JSON.parse(buildTimeDefaultsJsonOverride);
    } catch {
      buildTimeDefaults = {};
    }
  } else {
    buildTimeDefaults = getBuildTimeFeatureFlagDefaults();
  }
  if (Object.keys(buildTimeDefaults).length === 0) {
    return persistedState;
  }

  const mergedRemoteFeatureFlags = {
    ...buildTimeDefaults,
    ...(persistedState?.remoteFeatureFlags ?? {}),
  };

  return {
    ...persistedState,
    remoteFeatureFlags: mergedRemoteFeatureFlags,
  } as RemoteFeatureFlagControllerState;
}

/**
 * Initialize the remote feature flag controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const remoteFeatureFlagControllerInit: ControllerInitFunction<
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState, getState, analyticsId } =
    request;
  const disabled = !selectBasicFunctionalityEnabled(getState());

  // Test-only: inject build-time defaults JSON so tests need not rely on process.env
  const testDefaultsJson = (request as Record<string, unknown>)
    .__testRemoteFeatureFlagDefaultsJson as string | undefined;
  const initialState = getInitialState(
    persistedState.RemoteFeatureFlagController as
      | RemoteFeatureFlagControllerState
      | undefined,
    testDefaultsJson,
  );

  const controller = new RemoteFeatureFlagController({
    messenger: controllerMessenger,
    state: initialState,
    disabled,
    getMetaMetricsId: () => analyticsId,
    clientVersion: getBaseSemVerVersion(),
    clientConfigApiService: new ClientConfigApiService({
      fetch,
      config: {
        client: ClientType.Mobile,
        environment: getFeatureFlagAppEnvironment(),
        distribution: getFeatureFlagAppDistribution(),
      },
    }),
    fetchInterval: __DEV__
      ? 1000
      : AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
  });

  if (disabled) {
    Logger.log('Feature flag controller disabled.');
  } else if (isRemoteFeatureFlagOverrideActivated) {
    Logger.log('Remote feature flags override activated.');
  } else {
    controller
      .updateRemoteFeatureFlags()
      .then(() => {
        Logger.log('Feature flags updated');
      })
      .catch((error) => Logger.log('Feature flags update failed: ', error));
  }

  return {
    controller,
  };
};
