import {
  VendorOnboardingController,
  type VendorOnboardingControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { createKalshiAccountLinkAdapter } from '../../../../components/UI/KYC/Kalshi/kalshiAccountLinkAdapter';
import { sumsubLauncher } from './sumSubLauncher';

/**
 * Initialize the VendorOnboardingController.
 *
 * The controller follows the onboarding step kyc-api decides for a vendor and
 * keeps only that step and the session id. Platform-specific parts are
 * injected: the SumSub SDK, and Kalshi's device-signed account link calls,
 * which run on the phone.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger for the controller.
 * @param request.persistedState - Persisted state to hydrate from.
 * @returns The initialized VendorOnboardingController.
 */
export const vendorOnboardingControllerInit: MessengerClientInitFunction<
  VendorOnboardingController,
  VendorOnboardingControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new VendorOnboardingController({
    messenger: controllerMessenger,
    state: persistedState.VendorOnboardingController,
    sumsubLauncher,
    accountLinkAdapters: { kalshi: createKalshiAccountLinkAdapter() },
  });

  return { controller };
};
