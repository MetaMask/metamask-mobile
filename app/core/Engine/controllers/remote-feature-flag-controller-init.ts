import { ControllerInitFunction } from '../types';
import {
  ClientConfigApiService,
  ClientType,
  DistributionType,
  EnvironmentType,
  RemoteFeatureFlagController,
} from '@metamask/remote-feature-flag-controller';
import { RemoteFeatureFlagControllerMessenger } from '../messengers/remote-feature-flag-controller-messenger';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';

/**
 * Get the correct environment for the remote feature flag service based on the
 * `METAMASK_ENVIRONMENT` variable.
 *
 * @returns The environment type.
 */
export const getFeatureFlagAppEnvironment = () => {
  const env = process.env.METAMASK_ENVIRONMENT;

  switch (env) {
    case 'production':
      return EnvironmentType.Production;
    case 'beta':
      return EnvironmentType.Beta;
    // TODO: Remove pre-release case once verified that pre-release is no longer
    //  used.
    case 'pre-release':
    case 'rc':
      return EnvironmentType.ReleaseCandidate;
    // TODO: Create LD environment for e2e and mirror test values.
    case 'e2e':
    case 'test':
      return EnvironmentType.Test;
    case 'exp':
      return EnvironmentType.Exp;
    case 'dev':
      return EnvironmentType.Development;
    default:
      return EnvironmentType.Development;
  }
};

/**
 * Get the correct distribution for the remote feature flag service based on the
 * `METAMASK_BUILD_TYPE` variable.
 *
 * @returns The distribution type.
 */
export const getFeatureFlagAppDistribution = () => {
  const dist = process.env.METAMASK_BUILD_TYPE;

  switch (dist) {
    case 'main':
      return DistributionType.Main;
    case 'flask':
      return DistributionType.Flask;
    default:
      return DistributionType.Main;
  }
};

const isRemoteFeatureFlagOverrideActivated =
  process.env.OVERRIDE_REMOTE_FEATURE_FLAGS === 'true';

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
> = ({ controllerMessenger, persistedState, getState, metaMetricsId }) => {
  const disabled = !selectBasicFunctionalityEnabled(getState());

  const controller = new RemoteFeatureFlagController({
    messenger: controllerMessenger,
    state: persistedState.RemoteFeatureFlagController,
    disabled,
    getMetaMetricsId: () => metaMetricsId ?? '',
    clientConfigApiService: new ClientConfigApiService({
      fetch,
      config: {
        client: ClientType.Mobile,
        environment: getFeatureFlagAppEnvironment(),
        distribution: getFeatureFlagAppDistribution(),
      },
    }),
    fetchInterval: AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
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
      .catch((error) => Logger.log(error));
  }

  return {
    controller,
  };
};
