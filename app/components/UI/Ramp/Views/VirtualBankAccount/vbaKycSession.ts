import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { VBA_KYC_VENDOR } from './constants';

const GEO_COUNTRY_MISMATCH_MESSAGE =
  'already initialized with a different geoCountry';

const EMAIL_CLAIM = ['email'] as ['email'];

type StartSessionParams = Parameters<
  typeof Engine.context.KycController.startSession
>[0];

/**
 * True when `KycController.startSession` rejected because the persisted
 * session was started under a different geoCountry than the current one.
 */
export const isGeoCountryMismatch = (error: unknown): boolean => {
  const message = (error as { message?: unknown } | null)?.message;
  return (
    typeof message === 'string' &&
    message.includes(GEO_COUNTRY_MISMATCH_MESSAGE)
  );
};

/**
 * Partner-identity minting returns HTTP 422 when the profile has no verified
 * email. `startSession` then keeps `state.email` for an existing session.
 */
const isEmailRequiredError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  (error as { status?: unknown }).status === 422;

const decodePartnerTokenPayload = (token: string): unknown => {
  const [, payloadSegment] = token.split('.');
  if (!payloadSegment) {
    return null;
  }
  const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
};

/**
 * True when the partner identity token carries a verified email claim.
 * A malformed token is treated as having none, so reset is skipped.
 */
const tokenHasVerifiedEmail = (token: string): boolean => {
  try {
    const payload = decodePartnerTokenPayload(token);
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const ext = (payload as { ext?: unknown }).ext;
    if (typeof ext !== 'object' || ext === null) {
      return false;
    }
    const { email, email_verified: emailVerified } = ext as {
      email?: unknown;
      email_verified?: unknown;
    };
    return (
      typeof email === 'string' && email.length > 0 && emailVerified === true
    );
  } catch {
    return false;
  }
};

/**
 * `reset()` deletes `state.email`. That value is the only email `startSession`
 * can use when partner-identity minting returns 422. Wiping it makes the
 * geoCountry failure permanent, including after the user returns to the
 * original country.
 *
 * When `state.email` is still null, the email that passed the guard came from
 * the token `startSession` just minted, so the retry can mint it again.
 */
const canResetWithoutLosingEmail = async (): Promise<boolean> => {
  if (Engine.context.KycController.state.email === null) {
    return true;
  }

  try {
    const token = await Engine.controllerMessenger.call(
      'AuthenticationController:getPartnerIdentityToken',
      EMAIL_CLAIM,
      VBA_KYC_VENDOR,
    );
    return tokenHasVerifiedEmail(token);
  } catch (error) {
    if (!isEmailRequiredError(error)) {
      Logger.log(
        '[vba-kyc-session] skipped KYC reset; partner email could not be confirmed',
      );
    }
    return false;
  }
};

const startWithGeoCountryReset = async (
  params: StartSessionParams,
): Promise<void> => {
  const kycController = Engine.context.KycController;
  try {
    await kycController.startSession(params);
    return;
  } catch (error) {
    if (!isGeoCountryMismatch(error)) {
      throw error;
    }
    if (!(await canResetWithoutLosingEmail())) {
      Logger.log(
        '[vba-kyc-session] geoCountry mismatch left in place to keep the stored email',
      );
      throw error;
    }
  }

  Logger.log('[vba-kyc-session] geoCountry mismatch, resetting KYC session');
  await kycController.reset();
  await kycController.startSession(params);
};

// Same vendor and same AAL2 token share one reset and one retry, so a second
// reset cannot wipe the session the first retry just created. A different
// token is a different attempt. The entry stays until the attempt settles, so
// a startSession that never returns keeps later calls with that same key
// waiting with it.
const inFlightByAttempt = new Map<string, Promise<void>>();

const attemptKey = (params: StartSessionParams): string =>
  `${params.vendor}:${params.aal2Token ?? ''}`;

/**
 * Starts the VBA KYC session. On a geoCountry mismatch, resets the
 * controller and calls `startSession` once more, unless that reset would
 * delete the only stored email. Every other error is thrown unchanged,
 * including email and vendor mismatches.
 *
 * @param params - Arguments for `KycController.startSession`.
 */
export const startVbaKycSession = (
  params: StartSessionParams,
): Promise<void> => {
  const key = attemptKey(params);
  const existing = inFlightByAttempt.get(key);
  if (existing) {
    return existing;
  }

  const attempt = startWithGeoCountryReset(params).finally(() => {
    inFlightByAttempt.delete(key);
  });
  inFlightByAttempt.set(key, attempt);
  return attempt;
};
