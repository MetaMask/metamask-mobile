import { Platform } from 'react-native';
import { ControllerInitFunction } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';

export function getRampsEnvironment(): RampsEnvironment {
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
 * Gets the base URL override for local development.
 * When RAMPS_LOCAL_API_URL is set in .js.env, it overrides the default API URLs.
 *
 * @returns The base URL override, or undefined if not configured.
 */
export function getRampsBaseUrlOverride(): string | undefined {
  const localApiUrl = process.env.RAMPS_LOCAL_API_URL;
  if (localApiUrl && localApiUrl.trim().length > 0) {
    return localApiUrl.trim();
  }
  return undefined;
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
  const baseUrlOverride = getRampsBaseUrlOverride();

  if (baseUrlOverride) {
    console.log(`[RampsService] Using local API URL: ${baseUrlOverride}`);
  }

  const service = new RampsService({
    messenger: controllerMessenger,
    environment: getRampsEnvironment(),
    context: getRampsContext(),
    fetch,
    baseUrlOverride,
  });

  return {
    controller: service,
  };
};
