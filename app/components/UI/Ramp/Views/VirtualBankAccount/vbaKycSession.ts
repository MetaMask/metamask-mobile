import { needsCapabilityAuthorizationRefresh } from '@metamask/kyc-controller';
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

/**
 * Starts the VBA KYC session. A geoCountry mismatch keeps a session already
 * stored on the device, so its email, provider-flow status, vendor terms, and
 * stored geoCountry stay. The mismatch skips the capability authorization
 * refresh in `startSession`, so a stored session that still needs one is not
 * kept: the controller is reset and `startSession` runs once more, which
 * reattaches the server session and refreshes it. The same reset runs when no
 * session is stored. Every other error is thrown unchanged.
 *
 * @param params - Arguments for `KycController.startSession`.
 */
export const startVbaKycSession = async (
  params: StartSessionParams,
): Promise<void> => {
  const kycController = Engine.context.KycController;
  try {
    await kycController.startSession(params);
  } catch (error) {
    if (!isGeoCountryMismatch(error)) {
      throw error;
    }
    const storedSession = kycController.readSessionStatus();
    if (storedSession && !needsCapabilityAuthorizationRefresh(storedSession)) {
      Logger.log(
        '[vba-kyc-session] geoCountry changed, keeping stored session',
      );
      return;
    }
    Logger.log('[vba-kyc-session] geoCountry changed, resetting KYC state');
    await kycController.reset();
    await kycController.startSession(params);
  }
};
