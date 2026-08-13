import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { isProduction } from '../../../../util/environment';
import AppConstants from '../../../AppConstants';

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
 * Resolves the on-ramp / neobank-proxy host used for Money Account wallet
 * registration. Override with `NEOBANK_API_URL` when needed for local demos.
 *
 * @returns The neobank-proxy base URL for this environment.
 */
function getNeobankBaseUrl(): string {
  if (process.env.NEOBANK_API_URL) {
    return process.env.NEOBANK_API_URL;
  }

  const env = process.env.METAMASK_ENVIRONMENT;
  if (env === 'dev' || env === 'exp' || env === 'test' || env === 'e2e') {
    return 'https://on-ramp.dev-api.cx.metamask.io';
  }
  if (env === 'production' || env === 'beta' || env === 'rc') {
    return 'https://api.onramp.metamask.io';
  }
  return 'https://on-ramp.uat-api.cx.metamask.io';
}

/**
 * Initialize the KycService.
 *
 * The service is a stateless HTTP client for the Universal KYC backend. It
 * resolves its base URL from `env` and obtains the wallet bearer token /
 * geolocation through delegated messenger actions.
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
    env: isProduction() ? 'production' : 'development',
    messenger: controllerMessenger,
    baseUrl: process.env.KYC_API_URL,
    neobankBaseUrl: getNeobankBaseUrl(),
    fractalEncryptionBaseUrl: getFractalEncryptionBaseUrl(),
  });

  return { controller };
};
