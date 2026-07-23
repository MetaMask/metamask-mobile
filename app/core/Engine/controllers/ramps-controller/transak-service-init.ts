import { Platform } from 'react-native';
import { MessengerClientInitFunction } from '../../types';
import {
  TransakService,
  TransakServiceMessenger,
  TransakEnvironment,
} from '@metamask/ramps-controller';

/**
 * When BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY is true and RAMPS_ENVIRONMENT
 * is set (set by builds.yml), uses RAMPS_ENVIRONMENT directly.
 * Otherwise falls back to METAMASK_ENVIRONMENT — including the builds path
 * when RAMPS_ENVIRONMENT is unset, so Transak stays aligned with
 * getRampsEnvironment().
 */
export function getTransakEnvironment(): TransakEnvironment {
  if (process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY === 'true') {
    const rampsEnv = process.env.RAMPS_ENVIRONMENT;
    if (rampsEnv) {
      return rampsEnv === 'production'
        ? TransakEnvironment.Production
        : TransakEnvironment.Staging;
    }
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

export const transakServiceInit: MessengerClientInitFunction<
  TransakService,
  TransakServiceMessenger
> = ({ controllerMessenger }) => {
  const service = new TransakService({
    messenger: controllerMessenger,
    environment: getTransakEnvironment(),
    context: getTransakContext(),
    fetch,
  });

  return {
    controller: service,
  };
};
