import { Platform } from 'react-native';
import { getBundleId } from 'react-native-device-info';
import { MessengerClientInitFunction } from '../../types';
import {
  TransakService,
  TransakServiceMessenger,
  TransakEnvironment,
} from '@metamask/ramps-controller';
import { devApiEnv, type DevApiEnv } from '../../../devApiEnv';
import { getRampsClientIdentity } from './ramps-service-init';

const TRANSAK_ENVIRONMENT_BY_API_ENV: Record<DevApiEnv, TransakEnvironment> = {
  dev: TransakEnvironment.Development,
  uat: TransakEnvironment.Staging,
  prod: TransakEnvironment.Production,
};

/** Same cluster as `getRampsEnvironment()`, in Transak's enum. */
export function getTransakEnvironment(): TransakEnvironment {
  return TRANSAK_ENVIRONMENT_BY_API_ENV[devApiEnv()];
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
