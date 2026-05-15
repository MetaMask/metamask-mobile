import { MessengerClientInitFunction } from '../types';
import {
  ClientConfigApiService,
  ClientType,
  RemoteFeatureFlagController,
  type RemoteFeatureFlagControllerMessenger,
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
import {
  getE2ERemoteFeatureFlagDiagnostics,
  isE2E,
  postE2EDiagnostics,
} from '../../../util/test/utils';

const getDiagnosticErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const postRemoteFeatureFlagDiagnostics = (
  controller: RemoteFeatureFlagController,
  phase: string,
  error?: unknown,
) => {
  if (!isE2E) {
    return;
  }

  postE2EDiagnostics(
    getE2ERemoteFeatureFlagDiagnostics(controller.state, {
      phase,
      ...(error === undefined
        ? {}
        : { error: getDiagnosticErrorMessage(error) }),
    }),
  );
};

/**
 * Initialize the remote feature flag controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const remoteFeatureFlagControllerInit: MessengerClientInitFunction<
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerMessenger
> = ({ controllerMessenger, persistedState, getState, analyticsId }) => {
  const disabled = !selectBasicFunctionalityEnabled(getState());
  const prevClientVersion =
    persistedState?.AppMetadataController?.currentAppVersion;

  const controller = new RemoteFeatureFlagController({
    messenger: controllerMessenger,
    state: persistedState.RemoteFeatureFlagController,
    disabled,
    getMetaMetricsId: () => analyticsId,
    clientVersion: getBaseSemVerVersion(),
    prevClientVersion,
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
    postRemoteFeatureFlagDiagnostics(controller, 'disabled');
  } else if (isRemoteFeatureFlagOverrideActivated) {
    Logger.log('Remote feature flags override activated.');
    postRemoteFeatureFlagDiagnostics(controller, 'override-activated');
  } else {
    controller
      .updateRemoteFeatureFlags()
      .then(() => {
        Logger.log('Feature flags updated');
        postRemoteFeatureFlagDiagnostics(controller, 'update-success');
      })
      .catch((error) => {
        Logger.log('Feature flags update failed: ', error);
        postRemoteFeatureFlagDiagnostics(controller, 'update-failed', error);
      });
  }

  return {
    controller,
  };
};
