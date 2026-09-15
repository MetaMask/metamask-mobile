import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { sumsubLauncher } from './sumSubLauncher';

/**
 * Initialize the KycController.
 *
 * The controller owns the identity flow (terms, session, KYC-required check,
 * and the SumSub hand-off). Platform-specific SDK presentation is delegated
 * to the injected {@link sumsubLauncher}.
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
    sumsubLauncher,
  });

  return { controller };
};
