import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import type { KycControllerInitMessenger } from '../../messengers/kyc/kyc-controller-messenger';
import {
  handleKycStatusChangedForMetrics,
  handleVerificationStatusChangedForMetrics,
} from './event-handlers/analytics';
import { sumsubLauncher } from './sumSubLauncher';

/**
 * Initialize the KycController.
 *
 * The controller owns session creation, consent recording, status polling,
 * and the SumSub hand-off. Platform-specific SDK presentation is delegated to
 * the injected {@link sumsubLauncher}.
 *
 * SumSub launch outcomes (`KycController:verificationStatusChanged`) and KYC
 * status changes (`KycController:kycStatusChanged`) are mapped to analytics
 * here.
 *
 * Money-account wallet registration and autoramp creation after KYC approval
 * run in the VBA onboarding coordinator (`resolveVbaOnboarding`), not in
 * response to KycController state changes.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger for the controller.
 * @param request.persistedState - Persisted state to hydrate from.
 * @param request.initMessenger - The init messenger for event subscriptions.
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
    sumsubLauncher,
  });

  initMessenger.subscribe(
    'KycController:verificationStatusChanged',
    handleVerificationStatusChangedForMetrics,
  );
  initMessenger.subscribe(
    'KycController:kycStatusChanged',
    handleKycStatusChangedForMetrics,
  );

  return { controller };
};
