import Engine from '../../../../core/Engine';

const detectGeoCountry = async (): Promise<string> => {
  const { KycService } = Engine.context;
  if (!KycService) {
    throw new Error('KYC service is unavailable');
  }
  return KycService.getGeoCountry();
};

/** Stored KYC country if set, otherwise the detected one. */
export const resolveGeoCountry = async (): Promise<string> =>
  Engine.context.KycController?.state?.geoCountry ?? detectGeoCountry();
