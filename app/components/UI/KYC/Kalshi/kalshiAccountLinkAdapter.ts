import type { KycAccountLinkAdapter } from '@metamask/kyc-controller';
import { v4 as uuidv4 } from 'uuid';
import packageJSON from '../../../../../package.json';
// Reuses Predict's Kalshi signing until Kalshi onboarding moves out of Predict.
// eslint-disable-next-line import-x/no-restricted-paths
import { KalshiOnboardingClient } from '../../PredictNext/adapters/remote/KalshiOnboardingClient';
// eslint-disable-next-line import-x/no-restricted-paths
import { createP256DeviceKey } from '../../PredictNext/auth/p256DeviceKey';
// eslint-disable-next-line import-x/no-restricted-paths
import { KALSHI_AUTHENTICATION_PROFILE } from '../../PredictNext/auth/venueAuthProfiles';

/** kyc-api serves predict-api's onboarding routes under this prefix. */
const KYC_API_KALSHI_SEGMENTS = ['vendors', 'kalshi', 'enrollment'] as const;

const DEFAULT_KYC_API_BASE_URL = 'https://kyc-api.uat-api.cx.metamask.io';

/**
 * Engine imports this module through the VendorOnboardingController init, so Engine is
 * resolved when a call runs, not when the module loads.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const getEngine = () => require('../../../../core/Engine').default;

/**
 * The Kalshi account link calls for `VendorOnboardingController`. They reuse
 * Predict's device key, A2T and request signer, and send the signed calls to
 * kyc-api, which checks the signature, forwards them to Kalshi and records
 * the result. Every call gets a new idempotency key.
 *
 * @returns The adapter.
 */
export const createKalshiAccountLinkAdapter = (): KycAccountLinkAdapter => {
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
    async startLink({ email }) {
      // Kalshi wants an enrollment intent before it will link an email.
      await getClient().createIntent(uuidv4());
      await getClient().submitEmail(email.trim(), uuidv4());
    },
    async verifyLink({ code }) {
      const result = await getClient().verifyCode(code.trim(), uuidv4());
      return result.mfa ? { mfaMethod: result.mfa.method } : {};
    },
  };
};
