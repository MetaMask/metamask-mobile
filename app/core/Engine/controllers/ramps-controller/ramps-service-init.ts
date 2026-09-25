import { Platform } from 'react-native';
import { MessengerClientInitFunction } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';
import { getBaseSemVerVersion } from '../../../../util/version';
import { devApiEnv, type DevApiEnv } from '../../../devApiEnv';

const RAMPS_ENVIRONMENT_BY_API_ENV: Record<DevApiEnv, RampsEnvironment> = {
  dev: RampsEnvironment.Development,
  uat: RampsEnvironment.Staging,
  prod: RampsEnvironment.Production,
};

/**
 * Ramps keeps its Development / Staging / Production enum.
 * Mobile translates the shared `dev | uat | prod` cluster onto it.
 */
export function getRampsEnvironment(): RampsEnvironment {
  return RAMPS_ENVIRONMENT_BY_API_ENV[devApiEnv()];
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
 * MetaMask client identity sent on every on-ramp request, used by the API
 * for version-gated feature flags.
 */
export function getRampsClientIdentity(): {
  clientProduct: 'metamask-mobile';
  clientVersion: string;
} {
  return {
    clientProduct: 'metamask-mobile',
    clientVersion: getBaseSemVerVersion(),
  };
}

/**
 * Initialize the on-ramp service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const rampsServiceInit: MessengerClientInitFunction<
  RampsService,
  RampsServiceMessenger
> = ({ controllerMessenger }) => {
  const service = new RampsService({
    messenger: controllerMessenger,
    environment: getRampsEnvironment(),
    context: getRampsContext(),
    fetch,
    ...getRampsClientIdentity(),
  });

  return {
    controller: service,
  };
};
