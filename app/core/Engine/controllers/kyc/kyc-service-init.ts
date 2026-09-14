import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';

/** UAT host used when `KYC_API_URL` is not inlined (e.g. local Metro, Jest). */
const DEFAULT_KYC_API_BASE_URL = 'https://kyc-api.uat-api.cx.metamask.io';

/**
 * Initialize the KycService.
 *
 * Stateless HTTP client for the Universal KYC backend. Used here so
 * {@link KycController.loadDisclaimers} can fetch Iron/MoonPay vendor T&Cs.
 *
 * The base URL comes from `KYC_API_URL` (builds.yml). When that env var is
 * missing, UAT is used so `KycService` still has a host during Engine init.
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
    baseUrl: process.env.KYC_API_URL || DEFAULT_KYC_API_BASE_URL,
  });

  return { controller };
};
