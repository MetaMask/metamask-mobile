import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { isProduction } from '../../../../util/environment';

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
    baseUrl: 'http://192.168.1.188:3000',
  });

  return { controller };
};
