import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import AppConstants from '../../../AppConstants';

const KYC_API_DEV_BASE_URL = 'https://kyc-api.dev-api.cx.metamask.io';
const KYC_API_UAT_BASE_URL = 'https://kyc-api.uat-api.cx.metamask.io';
const KYC_API_PRD_BASE_URL = 'https://kyc-api.api.cx.metamask.io';

/**
 * Resolves the Universal KYC API base URL.
 *
 * `KYC_API_URL` from `builds.yml` wins when present. Otherwise the host is
 * derived from `METAMASK_ENVIRONMENT` so Engine can still construct
 * `KycService` in unit tests and local runs, where Babel inlines an empty
 * `KYC_API_URL`. The constructor rejects an empty `baseUrl`.
 *
 * @returns The KYC API base URL for this environment.
 */
function getKycApiBaseUrl(): string {
  if (process.env.KYC_API_URL) {
    return process.env.KYC_API_URL;
  }
  const env = process.env.METAMASK_ENVIRONMENT;
  if (env === 'dev' || env === 'exp' || env === 'test' || env === 'e2e') {
    return KYC_API_DEV_BASE_URL;
  }
  if (env === 'production' || env === 'beta' || env === 'rc') {
    return KYC_API_PRD_BASE_URL;
  }
  return KYC_API_UAT_BASE_URL;
}

/**
 * Resolves the Fractal encryption service base URL for the current build
 * target (dev / uat / production), mirroring how other MetaMask features branch
 * on `METAMASK_ENVIRONMENT`. The service fetches the JWKS from this host to
 * verify the UKYC wrapping-key `jwtChain`.
 *
 * @returns The Fractal encryption service base URL for this environment.
 */
function getFractalEncryptionBaseUrl(): string {
  const env = process.env.METAMASK_ENVIRONMENT;
  if (env === 'dev' || env === 'exp' || env === 'test' || env === 'e2e') {
    return AppConstants.FRACTAL_ENCRYPTION_URL.DEV;
  }
  if (env === 'production' || env === 'beta' || env === 'rc') {
    return AppConstants.FRACTAL_ENCRYPTION_URL.PRD;
  }
  return AppConstants.FRACTAL_ENCRYPTION_URL.UAT;
}

/**
 * Initialize the KycService.
 *
 * The service is a stateless HTTP client for the Universal KYC backend. It
 * resolves its base URL from `KYC_API_URL` (with an environment fallback) and
 * obtains the wallet bearer token / geolocation through delegated messenger
 * actions.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized KycService.
 */
export const kycServiceInit: MessengerClientInitFunction<
  KycService,
  KycServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new KycService({
    fetch,
    messenger: controllerMessenger,
    baseUrl: getKycApiBaseUrl(),
    fractalEncryptionBaseUrl: getFractalEncryptionBaseUrl(),
  });

  return { controller };
};
