import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { sumsubLauncher } from './sumSubLauncher';

/**
 * Initialize the KycController.
 *
 * The controller owns session creation, consent recording, status polling,
 * and the SumSub hand-off. Platform-specific SDK presentation is delegated to
 * the injected {@link sumsubLauncher}.
 *
 * Money-account wallet registration and autoramp creation after KYC approval
 * are owned by `RampsController.hydrateVbaOnboarding`. Do not also subscribe
 * to `KycController:statusChanged` for that activation work.
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
