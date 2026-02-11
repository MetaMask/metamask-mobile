import { Platform } from 'react-native';
import { ControllerInitFunction } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';

/**
 * TEMPORARY: When GITHUB_ACTIONS, uses RAMPS_ENVIRONMENT (set by builds.yml).
 * When not (Bitrise / .js.env), uses METAMASK_ENVIRONMENT switch. Remove condition once Bitrise is deprecated.
 */
export function getRampsEnvironment(): RampsEnvironment {
  if (process.env.GITHUB_ACTIONS === 'true') {
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
 * @returns The initialized service.
 */
export const rampsServiceInit: ControllerInitFunction<
  RampsService,
  RampsServiceMessenger
> = ({ controllerMessenger }) => {
  const service = new RampsService({
    messenger: controllerMessenger,
    environment: getRampsEnvironment(),
    context: getRampsContext(),
    fetch,
  });

  return {
    controller: service,
  };
};
