import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';

const DEFAULT_KYC_API_BASE_URL = 'https://kyc-api.dev-api.cx.metamask.io';

/**
 * Resolve the Universal KYC API URL without allowing missing build-time
 * configuration to prevent the entire Engine from starting.
 *
 * @returns The KYC API base URL.
 */
function getKycApiBaseUrl(): string {
  return process.env.KYC_API_URL || DEFAULT_KYC_API_BASE_URL;
}

/**
 * Initialize the KycService.
 *
 * Stateless HTTP client for the Universal KYC backend. Used here so
 * {@link KycController.loadDisclaimers} can fetch Iron/MoonPay vendor T&Cs.
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
  });

  return { controller };
};
