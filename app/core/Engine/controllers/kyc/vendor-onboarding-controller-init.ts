import {
  VendorOnboardingController,
  type VendorOnboardingControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { createKalshiVendorRequestSigner } from '../../../../components/UI/KYC/Kalshi/kalshiVendorRequestSigner';
import { sumsubLauncher } from './sumSubLauncher';

/**
 * Initialize the VendorOnboardingController.
 *
 * The controller follows the onboarding step kyc-api decides for a vendor and
 * keeps only that step and the session id. Platform-specific parts are
 * injected: the SumSub SDK, and the signer for Kalshi calls the relay
 * forwards. The signer does not send those calls.
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
    kalshiRequestSigner: createKalshiVendorRequestSigner(),
  });

  return { controller };
};
