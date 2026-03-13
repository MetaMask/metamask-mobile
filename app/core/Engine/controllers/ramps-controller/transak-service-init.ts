import { Platform } from 'react-native';
import { ControllerInitFunction } from '../../types';
import {
  TransakService,
  TransakServiceMessenger,
  TransakEnvironment,
} from '@metamask/ramps-controller';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { getForceRampsStaging } from './getForceRampsStaging';

/**
 * When the `force-ramps-staging-environment` feature flag is enabled,
 * always returns Staging regardless of the build environment.
 *
 * Otherwise uses METAMASK_ENVIRONMENT to determine the environment.
 *
 * @param featureFlagState - The current RemoteFeatureFlagController state.
 * @returns The resolved TransakEnvironment.
 */
export function getTransakEnvironment(
  featureFlagState?: RemoteFeatureFlagControllerState,
): TransakEnvironment {
  if (getForceRampsStaging(featureFlagState)) {
    return TransakEnvironment.Staging;
  }

  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return TransakEnvironment.Production;

    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return TransakEnvironment.Staging;
  }
}

function getTransakContext(): string {
  return Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android';
}

/**
 * Initialize the Transak service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.getController - Function to retrieve already-initialized controllers.
 * @returns The initialized service.
 */
export const transakServiceInit: ControllerInitFunction<
  TransakService,
  TransakServiceMessenger
> = ({ controllerMessenger, getController }) => {
  const featureFlagState = getController('RemoteFeatureFlagController')
    .state as RemoteFeatureFlagControllerState;

  const service = new TransakService({
    messenger: controllerMessenger,
    environment: getTransakEnvironment(featureFlagState),
    context: getTransakContext(),
    fetch,
  });

  return {
    controller: service,
  };
};
