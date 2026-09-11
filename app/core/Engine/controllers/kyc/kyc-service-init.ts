import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';

/** UAT hosts used when env vars are not inlined (e.g. local Metro, Jest). */
const DEFAULT_KYC_API_BASE_URL = 'https://kyc-api.uat-api.cx.metamask.io';
const DEFAULT_IDOS_ENCLAVE_BASE_URL =
  'https://enclave.staging.sandbox.fractal.id';
const DEFAULT_IDOS_RELAY_BASE_URL = 'https://relay.staging.idos.network';

/**
 * Initialize the KycService.
 *
 * Stateless HTTP client for the Universal KYC backend. Used by
 * {@link KycController} for vendor T&Cs, catalog consents, and the SumSub
 * session.
 *
 * Hosts come from `KYC_API_URL`, `IDOS_ENCLAVE_URL`, and `IDOS_RELAY_URL`
 * (`builds.yml`). When those env vars are missing, UAT is used so
 * `KycService` still has hosts during Engine init.
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
    idosEnclaveBaseUrl:
      process.env.IDOS_ENCLAVE_URL || DEFAULT_IDOS_ENCLAVE_BASE_URL,
    idosRelayBaseUrl: process.env.IDOS_RELAY_URL || DEFAULT_IDOS_RELAY_BASE_URL,
  });

  return { controller };
};
