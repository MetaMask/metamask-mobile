import { Platform } from 'react-native';
import { ControllerInitFunction } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { getForceRampsStaging } from './getForceRampsStaging';

/**
 * When the `force-ramps-staging-environment` feature flag is enabled,
 * always returns Staging regardless of the build environment.
 *
 * Otherwise:
 * - When BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY (and not E2E), uses RAMPS_ENVIRONMENT (set by builds.yml).
 * - When not (Bitrise / .js.env / E2E), uses METAMASK_ENVIRONMENT switch.
 *
 * @param featureFlagState - The current RemoteFeatureFlagController state.
 * @returns The resolved RampsEnvironment.
 */
export function getRampsEnvironment(
  featureFlagState?: RemoteFeatureFlagControllerState,
): RampsEnvironment {
  if (getForceRampsStaging(featureFlagState)) {
    return RampsEnvironment.Staging;
  }

  if (process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY === 'true') {
    const rampsEnv = process.env.RAMPS_ENVIRONMENT;
    return rampsEnv === 'production'
      ? RampsEnvironment.Production
      : RampsEnvironment.Staging;
  }
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return RampsEnvironment.Production;
    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return RampsEnvironment.Staging;
  }
}

/**
 * Gets the context for the ramps service based on the platform.
 *
 * @returns The context string (e.g., 'mobile-ios', 'mobile-android').
 */
export function getRampsContext(): string {
  return Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android';
}

/**
 * Initialize the on-ramp service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.getController - Function to retrieve already-initialized controllers.
 * @returns The initialized service.
 */
export const rampsServiceInit: ControllerInitFunction<
  RampsService,
  RampsServiceMessenger
> = ({ controllerMessenger, getController }) => {
  const featureFlagState = getController('RemoteFeatureFlagController')
    .state as RemoteFeatureFlagControllerState;

  const service = new RampsService({
    messenger: controllerMessenger,
    environment: getRampsEnvironment(featureFlagState),
    context: getRampsContext(),
    fetch,
  });

  return {
    controller: service,
  };
};
