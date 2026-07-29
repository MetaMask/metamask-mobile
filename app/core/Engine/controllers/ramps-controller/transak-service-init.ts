import { Platform } from 'react-native';
import { getBundleId } from 'react-native-device-info';
import { MessengerClientInitFunction } from '../../types';
import {
  TransakService,
  TransakServiceMessenger,
  TransakEnvironment,
} from '@metamask/ramps-controller';

/**
 * When RAMPS_ENVIRONMENT is set (set by builds.yml), uses it directly.
 * Otherwise (e.g. Jest, environments without builds.yml), uses METAMASK_ENVIRONMENT switch.
 *
 * Mobile `dev` builds map to Transak Development so they stay aligned with
 * `getRampsEnvironment()`, which routes dev builds to the RAM Dev API.
 */
export function getTransakEnvironment(): TransakEnvironment {
  if (process.env.RAMPS_ENVIRONMENT) {
    switch (process.env.RAMPS_ENVIRONMENT) {
      case 'production':
        return TransakEnvironment.Production;
      case 'development':
        return TransakEnvironment.Development;
      default:
        return TransakEnvironment.Staging;
    }
  }

  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return TransakEnvironment.Production;

    case 'dev':
      return TransakEnvironment.Development;

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

export const transakServiceInit: MessengerClientInitFunction<
  TransakService,
  TransakServiceMessenger
> = ({ controllerMessenger }) => {
  const service = new TransakService({
    messenger: controllerMessenger,
    environment: getTransakEnvironment(),
    context: getTransakContext(),
    fetch,
    referrerDomain: getBundleId(),
  });

  return {
    controller: service,
  };
};
