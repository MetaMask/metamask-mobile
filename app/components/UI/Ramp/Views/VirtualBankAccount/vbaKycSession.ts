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
 * stored on the device, so its email, provider-flow status, and vendor terms
 * stay with the country it was created in. With no stored session there is
 * nothing to keep, so the controller is reset and `startSession` runs once
 * more. Every other error is thrown unchanged.
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
    if (kycController.readSessionStatus()) {
      Logger.log(
        '[vba-kyc-session] geoCountry changed, keeping stored session',
      );
      return;
    }
    Logger.log(
      '[vba-kyc-session] geoCountry changed, resetting empty KYC state',
    );
    await kycController.reset();
    await kycController.startSession(params);
  }
};
