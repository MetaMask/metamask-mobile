import Engine from '../../../../../core/Engine';
import packageJSON from '../../../../../../package.json';
import { KalshiOnboardingClient } from '../../adapters/remote/KalshiOnboardingClient';
import { createP256DeviceKey } from '../../auth/p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from '../../auth/venueAuthProfiles';

export const createKalshiOnboardingClient = (): KalshiOnboardingClient =>
  new KalshiOnboardingClient({
    baseUrl: process.env.MM_PREDICT_API_URL,
    clientVersion: packageJSON.version,
    getBearerToken: () =>
      Engine.context.AuthenticationController.getBearerToken(),
    getA2t: () =>
      Engine.controllerMessenger.call('PredictDeviceAuthService:getA2t'),
    getDeviceKey: () =>
      Engine.controllerMessenger.call(
        'PredictDeviceAuthService:ensureDeviceKey',
      ),
    signDeviceProof: (message: Uint8Array) =>
      createP256DeviceKey(KALSHI_AUTHENTICATION_PROFILE.deviceKey).sign(
        message,
      ),
    invalidateA2t: () => {
      Engine.controllerMessenger.call('PredictDeviceAuthService:clear');
    },
  });
