import {
  KycFlowController,
  type KycFlowControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { createKalshiAccountLinkAdapter } from '../../../../components/UI/KYC/Kalshi/kalshiAccountLinkAdapter';
import { sumsubLauncher } from './sumSubLauncher';

/**
 * Initialize the KycFlowController.
 *
 * The controller follows the onboarding step kyc-api decides for a vendor and
 * keeps only that step and the session id. Platform-specific parts are
 * injected: the SumSub SDK, and Kalshi's device-signed account link calls,
 * which run on the phone.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger for the controller.
 * @param request.persistedState - Persisted state to hydrate from.
 * @returns The initialized KycFlowController.
 */
export const kycFlowControllerInit: MessengerClientInitFunction<
  KycFlowController,
  KycFlowControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new KycFlowController({
    messenger: controllerMessenger,
    state: persistedState.KycFlowController,
    sumsubLauncher,
    accountLinkAdapters: { kalshi: createKalshiAccountLinkAdapter() },
  });

  return { controller };
};
