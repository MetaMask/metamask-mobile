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

/**
 * Get build-time feature flag defaults from environment variable.
 * Set by apply-build-config.js from builds.yml (e.g. in GitHub Actions "Apply build config" step).
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
 */
function getInitialState(
  persistedState: RemoteFeatureFlagControllerState | undefined,
): RemoteFeatureFlagControllerState | undefined {
  // TEMPORARY: Only apply the new built-in defaults when built via GitHub Actions.
  // Bitrise does not set REMOTE_FEATURE_FLAG_DEFAULTS; skip merge there so both CI paths work.
  // Remove this block once Bitrise is deprecated and all builds use GH Actions + builds.yml.
  if (process.env.GITHUB_ACTIONS !== 'true') {
    return persistedState;
  }

  const buildTimeDefaults = getBuildTimeFeatureFlagDefaults();

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
> = ({ controllerMessenger, persistedState, getState, analyticsId }) => {
  const disabled = !selectBasicFunctionalityEnabled(getState());

  // Merge build-time defaults with persisted state (TEMPORARY: only when GITHUB_ACTIONS; see getInitialState)
  const initialState = getInitialState(
    persistedState.RemoteFeatureFlagController as
      | RemoteFeatureFlagControllerState
      | undefined,
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
