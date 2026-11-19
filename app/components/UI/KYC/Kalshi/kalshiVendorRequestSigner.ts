import {
  getKycKalshiErrorCode,
  type KycKalshiErrorCode,
  type KycVendorRequestSigner,
} from '@metamask/kyc-controller';
import { v4 as uuidv4 } from 'uuid';
// Engine init injects this signer, so it imports the signing modules
// directly. The PredictNext entry point loads the Predict UI.
import {
  buildOnboardingRelayRequest,
  signOnboardingRequest,
  type OnboardingSignedRequest,
} from '../../PredictNext/adapters/remote/kalshiOnboardingSigner';
import { createP256DeviceKey } from '../../PredictNext/auth/p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from '../../PredictNext/auth/venueAuthProfiles';

/**
 * Engine imports this module through the VendorOnboardingController init, so
 * Engine is resolved when a call runs, not when the module loads.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const getEngine = () => require('../../../../core/Engine').default;

const INTENT_PATH = '/trade-api/v2/isv/enrollment/intents';
const LINK_PATH = '/trade-api/v2/isv/users/link';
const VERIFY_PATH = '/trade-api/v2/isv/users/link/verify';

/**
 * The Kalshi request the phone signs. The relay refuses any body other than
 * `""` for the intent, `{"email":...}` for the link and `{"code":...}` for
 * the verify, so each is built here and passed on as it is.
 *
 * @param request - The call core asked to sign.
 * @param idempotencyKey - A new key for this call.
 * @returns The upstream request.
 */
const toUpstreamRequest = (
  request: { operation: string; email?: string; code?: string },
  idempotencyKey: string,
): OnboardingSignedRequest & { idempotencyKey: string } => {
  switch (request.operation) {
    case 'enrollment/intents':
      return {
        method: 'POST',
        path: INTENT_PATH,
        query: '',
        body: '',
        idempotencyKey,
      };
    case 'users/link': {
      const email = request.email?.trim();
      if (!email) {
        throw new Error('Kalshi request signer: users/link needs an email.');
      }
      return {
        method: 'POST',
        path: LINK_PATH,
        query: '',
        body: JSON.stringify({ email }),
        idempotencyKey,
      };
    }
    case 'users/link/verify': {
      const code = request.code?.trim();
      if (!code) {
        throw new Error(
          'Kalshi request signer: users/link/verify needs a code.',
        );
      }
      return {
        method: 'POST',
        path: VERIFY_PATH,
        query: '',
        body: JSON.stringify({ code }),
        idempotencyKey,
      };
    }
    default:
      throw new Error(
        `Kalshi request signer: unsupported operation ${request.operation}.`,
      );
  }
};

/**
 * Relay codes that a new A2T can fix: Kalshi refused the token or the
 * signature, the token could not be read, or it belongs to another user.
 */
const STALE_A2T_CODES: readonly KycKalshiErrorCode[] = [
  'kalshi_signed_request_rejected',
  'kalshi_signed_request_a2t_invalid',
  'kalshi_signed_request_sub_mismatch',
];

/**
 * Whether the relay said the A2T on this attempt was stale or refused.
 *
 * kyc-api keeps the relay's code, which core reads off the failure.
 *
 * @param error - The failure from the signed controller call.
 * @returns Whether a new A2T could fix it.
 */
const isStaleA2t = (error: unknown): boolean => {
  const code = getKycKalshiErrorCode(error);
  return code !== undefined && STALE_A2T_CODES.includes(code);
};

/**
 * Runs a signed Kalshi step, and signs it once more after a stale A2T.
 *
 * The first attempt uses the cached token. A relay code that says Kalshi
 * refused the token or the signature (`kalshi_signed_request_rejected`)
 * drops that token, and the next call signs with a new token and a new
 * signature. A second failure is returned as it is.
 *
 * @param action - The controller call that signs and sends.
 * @returns Whatever the call returned.
 */
export const runKalshiSignedAction = async <Result>(
  action: () => Promise<Result>,
): Promise<Result> => {
  try {
    return await action();
  } catch (error) {
    if (!isStaleA2t(error)) {
      throw error;
    }
    try {
      getEngine().controllerMessenger.call('PredictDeviceAuthService:clear');
    } catch {
      // The next attempt still signs. A failed clear leaves the stale token,
      // and that attempt fails the same way the old client did.
    }
    return action();
  }
};

/**
 * Signs Kalshi calls for `VendorOnboardingController`.
 *
 * Core decides which calls to sign and sends them to kyc-api. kyc-api
 * forwards each signed request (`{ path, headers, body }`) to the relay,
 * which checks the signature and sends the call to Kalshi. This signer does
 * not make a request. A signature lasts 60 seconds, so core calls it right
 * before each send.
 *
 * @returns The signer.
 */
export const createKalshiVendorRequestSigner =
  (): KycVendorRequestSigner =>
  async ({ requests }) => {
    const engine = getEngine();
    const [a2t, key] = await Promise.all([
      engine.controllerMessenger.call('PredictDeviceAuthService:getA2t'),
      engine.controllerMessenger.call(
        'PredictDeviceAuthService:ensureDeviceKey',
      ),
    ]);
    if (typeof a2t !== 'string' || a2t.trim().length === 0 || !key) {
      throw new Error('Kalshi request signer: device signing is unavailable.');
    }
    const context = { a2t, deviceKey: key.publicKey, salt: key.salt };
    const sign = (message: Uint8Array) =>
      createP256DeviceKey(KALSHI_AUTHENTICATION_PROFILE.deviceKey).sign(
        message,
      );

    return Promise.all(
      requests.map(async (request) => {
        const upstream = toUpstreamRequest(request, uuidv4());
        const signature = await signOnboardingRequest(upstream, context, {
          sign,
          requestId: () => uuidv4(),
          now: () => Math.floor(Date.now() / 1000),
        });
        return buildOnboardingRelayRequest({
          request: upstream,
          context,
          signature,
        });
      }),
    );
  };
