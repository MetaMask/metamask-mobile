import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import AppConstants from '../../../AppConstants';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Picks the host for the current build target when the matching env var is not
 * inlined (e.g. E2E repack). Always returns a real host: `KycService` throws
 * without a `baseUrl`, and it is constructed during Engine init.
 *
 * @param urls - Per-environment hosts.
 * @param metaMaskEnv - The value of `METAMASK_ENVIRONMENT`.
 * @returns The host for this environment.
 */
const getUrlForMetaMaskEnv = (
  urls: { DEV: string; UAT: string; PRD: string },
  metaMaskEnv: string | undefined,
): string => {
  switch (metaMaskEnv) {
    case 'dev':
    case 'test':
    case 'e2e':
    case 'local':
      return urls.DEV;
    case 'exp':
      return urls.UAT;
    case 'production':
    case 'beta':
    case 'rc':
    case 'pre-release':
    default:
      return urls.PRD;
  }
};

/**
 * Initialize the KycService.
 *
 * Stateless HTTP client for the Universal KYC backend. Used by
 * {@link KycController} for vendor T&Cs, catalog consents, and the SumSub
 * session.
 *
 * Hosts come from `KYC_API_URL` / `IDOS_ENCLAVE_URL` / `IDOS_RELAY_URL`
 * (builds.yml) and fall back to env-keyed defaults. The idOS hosts are separate
 * from the KYC API: they serve the JWKS that `startSumSub` verifies the UKYC
 * encryption schemas against, and the service throws when they are unset.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized KycService.
 */
export const kycServiceInit: MessengerClientInitFunction<
  KycService,
  KycServiceMessenger
> = ({ controllerMessenger }) => {
  const metaMaskEnv = process.env.METAMASK_ENVIRONMENT;

  const controller = new KycService({
    fetch,
    messenger: controllerMessenger,
    baseUrl:
      process.env.KYC_API_URL ||
      getUrlForMetaMaskEnv(AppConstants.KYC_API_URL, metaMaskEnv),
    idosEnclaveBaseUrl:
      process.env.IDOS_ENCLAVE_URL ||
      getUrlForMetaMaskEnv(AppConstants.IDOS_ENCLAVE_URL, metaMaskEnv),
    idosRelayBaseUrl:
      process.env.IDOS_RELAY_URL ||
      getUrlForMetaMaskEnv(AppConstants.IDOS_RELAY_URL, metaMaskEnv),
  });

  return { controller };
};
