import { type KycVendorRequestSigner } from '@metamask/kyc-controller';
import { v4 as uuidv4 } from 'uuid';
// Engine init injects this signer, so it imports the signing modules
// directly. The PredictNext entry point loads the Predict UI.
import {
  buildOnboardingVenueAuthorization,
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
 * The Kalshi request the phone signs, and the values the relay matches.
 *
 * The signed body is the Kalshi request. `values` is what the existing
 * onboarding client put in the envelope beside that signature.
 *
 * @param request - The call core asked to sign.
 * @param idempotencyKey - A new key for this call.
 * @returns The upstream request and the envelope values.
 */
const toSignedCall = (
  request: { operation: string; email?: string; code?: string },
  idempotencyKey: string,
): { upstream: OnboardingSignedRequest; values: Record<string, string> } => {
  switch (request.operation) {
    case 'enrollment/intents':
      return {
        upstream: {
          method: 'POST',
          path: INTENT_PATH,
          query: '',
          body: '',
          idempotencyKey,
        },
        values: { idempotencyKey },
      };
    case 'users/link': {
      const email = request.email?.trim();
      if (!email) {
        throw new Error('Kalshi request signer: users/link needs an email.');
      }
      return {
        upstream: {
          method: 'POST',
          path: LINK_PATH,
          query: '',
          body: JSON.stringify({ email }),
          idempotencyKey,
        },
        values: { email, idempotencyKey },
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
        upstream: {
          method: 'POST',
          path: VERIFY_PATH,
          query: '',
          body: JSON.stringify({ code }),
          idempotencyKey,
        },
        values: { code, idempotencyKey },
      };
    }
    default:
      throw new Error(
        `Kalshi request signer: unsupported operation ${request.operation}.`,
      );
  }
};

/**
 * Kalshi refused the A2T inside the signed envelope.
 *
 * The same code the onboarding client used before it dropped the token and
 * signed the call again.
 */
const REJECTED_A2T = 'venue_authorization_invalid';

/**
 * Whether Kalshi rejected the A2T on this attempt.
 *
 * kyc-api puts the relay's code on the error message or `code`.
 *
 * @param error - The failure from the signed controller call.
 * @returns Whether this was a rejected A2T.
 */
const isRejectedA2t = (error: unknown): boolean => {
  if (typeof error === 'string') {
    return error.includes(REJECTED_A2T);
  }
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { message, code } = error as { message?: unknown; code?: unknown };
  return [message, code].some(
    (value) => typeof value === 'string' && value.includes(REJECTED_A2T),
  );
};

/**
 * Runs a signed Kalshi step, and signs it once more after a rejected A2T.
 *
 * The first attempt uses the cached token. `venue_authorization_invalid`
 * drops that token the way the account-link client did, and the next call
 * signs with a new one. A second rejection is returned as it is.
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
    if (!isRejectedA2t(error)) {
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
 * forwards the `Venue-Authorization` value to the relay, which checks it and
 * sends the call to Kalshi. This signer does not make a request.
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
        const { upstream, values } = toSignedCall(request, uuidv4());
        const signature = await signOnboardingRequest(upstream, context, {
          sign,
          requestId: () => uuidv4(),
          now: () => Math.floor(Date.now() / 1000),
        });
        return {
          operation: request.operation,
          venueAuthorization: buildOnboardingVenueAuthorization({
            step: 'default',
            context,
            values,
            signatures: [signature],
          }),
        };
      }),
    );
  };
