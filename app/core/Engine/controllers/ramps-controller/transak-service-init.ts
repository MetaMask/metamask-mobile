import { Platform } from 'react-native';
import { getBundleId } from 'react-native-device-info';
import { MessengerClientInitFunction } from '../../types';
import {
  TransakService,
  TransakServiceMessenger,
  TransakEnvironment,
} from '@metamask/ramps-controller';
import { ApiEnv, getApiEnv } from '../../../apiEnv';
import { getRampsClientIdentity } from './ramps-service-init';

const TRANSAK_ENVIRONMENT_BY_API_ENV: Record<ApiEnv, TransakEnvironment> = {
  [ApiEnv.Dev]: TransakEnvironment.Development,
  [ApiEnv.Uat]: TransakEnvironment.Staging,
  [ApiEnv.Prod]: TransakEnvironment.Production,
};

/** Same cluster as `getRampsEnvironment()`, in Transak's enum. */
export function getTransakEnvironment(): TransakEnvironment {
  return TRANSAK_ENVIRONMENT_BY_API_ENV[getApiEnv()];
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
    ...getRampsClientIdentity(),
  });

  return {
    controller: service,
  };
};
