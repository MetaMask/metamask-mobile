import type { KycVendorAccountAdapter } from '@metamask/kyc-controller';
import { v4 as uuidv4 } from 'uuid';
import packageJSON from '../../../../../package.json';
// POC: reuses Predict internals until Kalshi onboarding moves to KYC.
// eslint-disable-next-line import-x/no-restricted-paths
import { KalshiOnboardingClient } from '../../PredictNext/adapters/remote/KalshiOnboardingClient';
// POC: reuses Predict internals until Kalshi onboarding moves to KYC.
// eslint-disable-next-line import-x/no-restricted-paths
import { createP256DeviceKey } from '../../PredictNext/auth/p256DeviceKey';
// POC: reuses Predict internals until Kalshi onboarding moves to KYC.
// eslint-disable-next-line import-x/no-restricted-paths
import { KALSHI_AUTHENTICATION_PROFILE } from '../../PredictNext/auth/venueAuthProfiles';

/** kyc-api serves predict-api's onboarding routes under this prefix. */
const KYC_API_KALSHI_SEGMENTS = ['vendors', 'kalshi', 'enrollment'] as const;

const DEFAULT_KYC_API_BASE_URL = 'https://kyc-api.uat-api.cx.metamask.io';

/**
 * Engine imports this module through the KycController init, so it is
 * resolved when a call runs, not when the module loads.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const getEngine = () => require('../../../../core/Engine').default;

/**
 * POC: the Kalshi vendor-account adapter for `KycController`. It reuses
 * Predict's device key, A2T and request signer, and sends the signed calls
 * to kyc-api, which forwards them to Kalshi. Every call gets a new
 * idempotency key.
 *
 * @returns The adapter.
 */
export const createKalshiAccountAdapter = (): KycVendorAccountAdapter => {
  let client: KalshiOnboardingClient | undefined;
  const getClient = () => {
    client ??= new KalshiOnboardingClient({
      baseUrl: process.env.KYC_API_URL || DEFAULT_KYC_API_BASE_URL,
      segments: KYC_API_KALSHI_SEGMENTS,
      clientVersion: packageJSON.version,
      getBearerToken: () =>
        getEngine().context.AuthenticationController.getBearerToken(),
      getA2t: () =>
        getEngine().controllerMessenger.call('PredictDeviceAuthService:getA2t'),
      getDeviceKey: () =>
        getEngine().controllerMessenger.call(
          'PredictDeviceAuthService:ensureDeviceKey',
        ),
      signDeviceProof: (message: Uint8Array) =>
        createP256DeviceKey(KALSHI_AUTHENTICATION_PROFILE.deviceKey).sign(
          message,
        ),
      invalidateA2t: () => {
        getEngine().controllerMessenger.call('PredictDeviceAuthService:clear');
      },
    });
    return client;
  };

  return {
    async getStatus() {
      const status = await getClient().getStatus();
      return {
        state: status.state,
        ...(status.intentStatus ? { intentStatus: status.intentStatus } : {}),
      };
    },
    async createIntent() {
      const intent = await getClient().createIntent(uuidv4());
      return { intentStatus: intent.intentStatus };
    },
    async submitEmail(email: string) {
      await getClient().submitEmail(email.trim(), uuidv4());
    },
    async verifyCode(code: string) {
      return getClient().verifyCode(code.trim(), uuidv4());
    },
    async activate({ walletAddress, network }) {
      const result = await getClient().activate(
        walletAddress,
        network,
        uuidv4(),
      );
      return { intentStatus: result.intentStatus };
    },
  };
};
