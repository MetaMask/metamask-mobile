import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';

const GEO_COUNTRY_MISMATCH_MESSAGE =
  'already initialized with a different geoCountry';

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
  }

  Logger.log('[vba-kyc-session] geoCountry mismatch, resetting KYC session');
  await kycController.reset();
  await kycController.startSession(params);
};

// Overlapping calls with the same shape share one reset and one retry, so a
// second reset cannot wipe the session the first retry just created. Calls
// with and without an AAL2 token are kept apart, because they run different
// startSession paths.
const inFlightByShape = new Map<string, Promise<void>>();

/**
 * Starts the VBA KYC session. On a geoCountry mismatch, resets the
 * controller and calls `startSession` once more. Every other error is thrown
 * unchanged, including email and vendor mismatches.
 *
 * @param params - Arguments for `KycController.startSession`.
 */
export const startVbaKycSession = (
  params: StartSessionParams,
): Promise<void> => {
  const shape = params.aal2Token ? 'aal2' : 'resume';
  const existing = inFlightByShape.get(shape);
  if (existing) {
    return existing;
  }

  const attempt = startWithGeoCountryReset(params).finally(() => {
    inFlightByShape.delete(shape);
  });
  inFlightByShape.set(shape, attempt);
  return attempt;
};
