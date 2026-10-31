import Engine from '../../../../../core/Engine';
import packageJSON from '../../../../../../package.json';
import { KalshiOnboardingClient } from '../../adapters/remote/KalshiOnboardingClient';
import { KALSHI_DEMO_AUTHORITY } from '../../auth/kalshiAuthority';

export const createKalshiOnboardingClient = (): KalshiOnboardingClient =>
  new KalshiOnboardingClient({
    baseUrl: process.env.MM_PREDICT_API_URL,
    clientVersion: packageJSON.version,
    getBearerToken: () =>
      Engine.context.AuthenticationController.getBearerToken(),
    authority: KALSHI_DEMO_AUTHORITY,
    signRequests: (requests) =>
      Engine.controllerMessenger.call(
        'PredictDeviceAuthService:signOnboardingRequests',
        requests,
      ),
    invalidateSigningSession: () =>
      Engine.controllerMessenger.call('PredictDeviceAuthService:clear'),
  });
