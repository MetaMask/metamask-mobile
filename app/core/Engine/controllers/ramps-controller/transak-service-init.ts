import { Platform } from 'react-native';
import { MessengerClientInitFunction } from '../../types';
import {
  RampsEnvironment,
  TransakService,
  TransakServiceMessenger,
  TransakEnvironment,
} from '@metamask/ramps-controller';
import { getRampsEnvironment } from './ramps-service-init';

// Derive the Transak environment from the single ramps-environment source of
// truth (`getRampsEnvironment`) so the TransakService, the ramps API, and the
// native provider fallback can never target different environments. They
// previously read different env vars (`BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY`
// + `RAMPS_ENVIRONMENT` here vs. `RAMPS_ENVIRONMENT` -> `METAMASK_ENVIRONMENT`
// there) and could disagree, e.g. staging Transak against a production ramps API.
export function getTransakEnvironment(): TransakEnvironment {
  return getRampsEnvironment() === RampsEnvironment.Production
    ? TransakEnvironment.Production
    : TransakEnvironment.Staging;
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
