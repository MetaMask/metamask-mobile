import { Platform } from 'react-native';
import { ControllerInitFunction } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';

/**
 * On Android emulator, localhost points to the emulator's loopback, not the host.
 * Use 10.0.2.2 to reach the host machine's localhost from the emulator.
 */
function getLocalApiBaseUrl(): string | undefined {
  const baseUrl = process.env.RAMPS_API_BASE_URL;
  if (!baseUrl) return undefined;
  if (Platform.OS === 'android' && baseUrl.includes('localhost')) {
    return baseUrl.replace(/localhost/g, '10.0.2.2');
  }
  return baseUrl;
}

/**
 * When BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY (and not E2E), uses RAMPS_ENVIRONMENT (set by builds.yml).
 * When not (Bitrise / .js.env / E2E), uses METAMASK_ENVIRONMENT switch.
 */
export function getRampsEnvironment(): RampsEnvironment {
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
    baseUrlOverride: getLocalApiBaseUrl(),
  });

  return {
    controller: service,
  };
};
