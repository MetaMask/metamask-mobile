import Engine from '../../../../../core/Engine';
import packageJSON from '../../../../../../package.json';
import { KalshiOnboardingClient } from '../../adapters/remote/KalshiOnboardingClient';

export const createKalshiOnboardingClient = (): KalshiOnboardingClient =>
  new KalshiOnboardingClient({
    baseUrl: process.env.MM_PREDICT_API_URL,
    clientVersion: packageJSON.version,
    getBearerToken: () =>
      Engine.context.AuthenticationController.getBearerToken(),
    signOperation: (operation, input) =>
      Engine.controllerMessenger.call(
        'PredictDeviceAuthService:signOperation',
        operation,
        input,
      ),
    invalidateSigningSession: () =>
      Engine.controllerMessenger.call('PredictDeviceAuthService:invalidateA2t'),
  });
