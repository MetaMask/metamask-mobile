import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import type { KycControllerInitMessenger } from '../../messengers/kyc/kyc-controller-messenger';
import { reactNativeSumSubLauncher } from './reactNativeSumSubLauncher';
import { createRegisterMoneyAccountOnKycCompletion } from '../../../../components/UI/Ramp/Views/VirtualBankAccount/registerMoneyAccountOnKycCompletion';

/**
 * Initialize the KycController.
 *
 * The controller owns the end-to-end identity flow (terms, session, Check/Auth
 * frames, KYC-required check, and the SumSub hand-off). Platform-specific SDK
 * presentation is delegated to the injected {@link reactNativeSumSubLauncher}.
 *
 * Also subscribes the Money Account registration / autoramp orchestrator to
 * `KycController:statusChanged` so a `completed` status drives wallet
 * registration and autoramp creation without an in-flow screen having to stay
 * mounted.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger for the controller.
 * @param request.persistedState - Persisted state to hydrate from.
 * @param request.initMessenger - The init messenger for status event subscriptions.
 * @returns The initialized KycController.
 */
export const kycControllerInit: MessengerClientInitFunction<
  KycController,
  KycControllerMessenger,
  KycControllerInitMessenger
> = ({ controllerMessenger, persistedState, initMessenger }) => {
  const controller = new KycController({
    messenger: controllerMessenger,
    state: persistedState.KycController,
    sumsubLauncher: reactNativeSumSubLauncher,
  });

  initMessenger.subscribe(
    'KycController:statusChanged',
    createRegisterMoneyAccountOnKycCompletion(),
  );

  return { controller };
};
