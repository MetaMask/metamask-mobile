import Engine from '../../../../../core/Engine';
import packageJSON from '../../../../../../package.json';
import { KalshiOnboardingClient } from '../../adapters/remote/KalshiOnboardingClient';

export const createKalshiOnboardingClient = (): KalshiOnboardingClient =>
  new KalshiOnboardingClient({
    baseUrl: process.env.MM_PREDICT_API_URL,
    clientVersion: packageJSON.version,
    getBearerToken: () =>
      Engine.context.AuthenticationController.getBearerToken(),
    signRequests: (intent, required) =>
      Engine.controllerMessenger.call(
        'PredictDeviceAuthService:signVenueRequests',
        intent,
        required,
      ),
    invalidateSigningSession: () =>
      Engine.controllerMessenger.call('PredictDeviceAuthService:clear'),
  });
