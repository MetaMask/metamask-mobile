import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Hosts used when the env vars are not inlined (local Metro, Jest).
 * The KYC API falls back to UAT. The enclave and relay fall back to the
 * staging hosts the dev build uses.
 */
const DEFAULT_KYC_API_BASE_URL = 'https://kyc-api.uat-api.cx.metamask.io';
const DEFAULT_IDOS_ENCLAVE_BASE_URL =
  'https://enclave.tee.staging.idos.network';
const DEFAULT_IDOS_RELAY_BASE_URL = 'https://relay.staging.idos.network';

/**
 * Initialize the KycService.
 *
 * Stateless HTTP client for the Universal KYC backend. Used by
 * {@link KycController} for vendor T&Cs, catalog consents, and the SumSub
 * session.
 *
 * Hosts come from `KYC_API_URL`, `IDOS_ENCLAVE_URL`, and `IDOS_RELAY_URL`
 * (`builds.yml`, or `.js.env` locally). When those env vars are missing,
 * the KYC API falls back to UAT and the idOS hosts fall back to staging.
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
