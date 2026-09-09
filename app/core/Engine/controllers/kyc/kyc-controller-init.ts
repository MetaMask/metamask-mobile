import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { kycSumSubLauncherStub } from './kycSumSubLauncherStub';

/**
 * Initialize the KycController for vendor T&C fetching on Get Pix Key.
 *
 * {@link KycController.loadDisclaimers} is the only controller surface used by
 * this ticket; SumSub / session / identity-flow wiring is out of scope.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger for the controller.
 * @param request.persistedState - Persisted state to hydrate from.
 * @returns The initialized KycController.
 */
export const kycControllerInit: MessengerClientInitFunction<
  KycController,
  KycControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new KycController({
    messenger: controllerMessenger,
    state: persistedState.KycController,
    // Required by the controller constructor; not used for disclaimer loading.
    sumsubLauncher: kycSumSubLauncherStub,
  });

  return { controller };
};
