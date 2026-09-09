import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';

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
    baseUrl: process.env.KYC_API_URL,
  });

  return { controller };
};
