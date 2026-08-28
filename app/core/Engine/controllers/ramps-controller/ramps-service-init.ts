import { Platform } from 'react-native';
import { MessengerClientInitFunction } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';
import { getBaseSemVerVersion } from '../../../../util/version';
import { getFeatureFlagAppEnvironment } from '../remote-feature-flag-controller/utils';

/**
 * When RAMPS_ENVIRONMENT is set (set by builds.yml), uses it directly.
 * Otherwise (e.g. Jest, environments without builds.yml), uses METAMASK_ENVIRONMENT switch.
 *
 * Mobile `dev` builds map to RAM Development (`on-ramp.dev-api`) so UNIFIED_BUY_2
 * hits the RAM Dev API instead of Staging/UAT.
 */
export function getRampsEnvironment(): RampsEnvironment {
  if (process.env.RAMPS_ENVIRONMENT) {
    switch (process.env.RAMPS_ENVIRONMENT) {
      case 'production':
        return RampsEnvironment.Production;
      case 'development':
        return RampsEnvironment.Development;
      default:
        return RampsEnvironment.Staging;
    }
  }
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return RampsEnvironment.Production;
    case 'dev':
      return RampsEnvironment.Development;
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
 * MetaMask client identity sent on every UB2 on-ramp request.
 * `clientEnvironment` matches Remote Feature Flag Client Config (`prod`/`rc`/…).
 * It does not select the API host — that remains `getRampsEnvironment()`.
 */
export function getRampsClientIdentity(): {
  clientProduct: 'metamask-mobile';
  clientVersion: string;
  clientEnvironment: string;
} {
  return {
    clientProduct: 'metamask-mobile',
    clientVersion: getBaseSemVerVersion(),
    clientEnvironment: getFeatureFlagAppEnvironment(),
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
