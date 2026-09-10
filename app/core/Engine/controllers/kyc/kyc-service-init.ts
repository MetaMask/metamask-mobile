import { KycService, type KycServiceMessenger } from '@metamask/kyc-controller';
import AppConstants from '../../../AppConstants';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Env-keyed KYC API host when `KYC_API_URL` is not inlined (e.g. E2E repack).
 * Mirrors ramps `getRampsEnvironment`: production-like builds hit PRD, `dev`
 * hits DEV, and every other / unknown env (including missing) hits UAT so
 * Engine init never constructs `KycService` without a host.
 */
const getDefaultKycApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): string => {
  switch (metaMaskEnv) {
    case 'production':
    case 'beta':
    case 'rc':
      return AppConstants.KYC_API_URL.PRD;
    case 'dev':
      return AppConstants.KYC_API_URL.DEV;
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return AppConstants.KYC_API_URL.UAT;
  }
};

/**
 * Initialize the KycService.
 *
 * Stateless HTTP client for the Universal KYC backend. Used here so
 * {@link KycController.loadDisclaimers} can fetch Iron/MoonPay vendor T&Cs.
 *
 * The base URL comes from `KYC_API_URL` (builds.yml) and falls back to an
 * env-keyed default, because `KycService` throws when constructed without one
 * and that would fail Engine init for every user, not just the KYC flow.
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
    baseUrl:
      process.env.KYC_API_URL ||
      getDefaultKycApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT),
  });

  return { controller };
};
