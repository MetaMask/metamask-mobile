import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import { reactNativeSumSubLauncher } from './reactNativeSumSubLauncher';

/**
 * Initialize the KycController.
 *
 * The controller owns the end-to-end identity flow (terms, session, Check/Auth
 * frames, KYC-required check, and the SumSub hand-off). Platform-specific SDK
 * presentation is delegated to the injected {@link reactNativeSumSubLauncher}.
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
    sumsubLauncher: reactNativeSumSubLauncher,
  });

  return { controller };
};
