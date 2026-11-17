import { Platform } from 'react-native';
import { getBundleId } from 'react-native-device-info';
import { MessengerClientInitFunction } from '../../types';
import {
  TransakService,
  TransakServiceMessenger,
  TransakEnvironment,
} from '@metamask/ramps-controller';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { ApiEnv, getApiEnv } from '../../../apiEnv';
import type { DepositConfig } from '../../../../selectors/featureFlagController/deposit';
import type { TransakServiceInitMessenger } from '../../messengers/transak-service-messenger/transak-service-messenger';
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

/** The Transak partner key from the `depositConfig` remote flag. */
export function getTransakApiKey(
  remoteFeatureFlags: RemoteFeatureFlagControllerState['remoteFeatureFlags'],
): string | undefined {
  const depositConfig = remoteFeatureFlags?.depositConfig as
    | DepositConfig
    | undefined;
  return depositConfig?.providerApiKey || undefined;
}

export const transakServiceInit: MessengerClientInitFunction<
  TransakService,
  TransakServiceMessenger,
  TransakServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const service = new TransakService({
    messenger: controllerMessenger,
    environment: getTransakEnvironment(),
    context: getTransakContext(),
    fetch,
    referrerDomain: getBundleId(),
    apiKey: getTransakApiKey(
      initMessenger.call('RemoteFeatureFlagController:getState')
        .remoteFeatureFlags,
    ),
    ...getRampsClientIdentity(),
  });

  // Without the key, the native Transak quote lookup throws and the fee
  // estimate falls back to the aggregator fee. On a fresh install the flags
  // arrive after startup, so set the key when they do. A key that is later
  // removed from the flags is not cleared, because the service has no way to
  // unset it.
  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    ({ remoteFeatureFlags }) => {
      const nextApiKey = getTransakApiKey(remoteFeatureFlags);
      if (nextApiKey && nextApiKey !== service.getApiKey()) {
        service.setApiKey(nextApiKey);
      }
    },
  );

  return {
    controller: service,
  };
};
