import {
  KycController,
  type KycControllerMessenger,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
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
 * `trackKycAnalytics` records SumSub launch outcomes and stored KYC status
 * changes. `started` and `retry_started` are UI moments and are tracked by
 * the screens that see them.
 *
 * Money-account wallet registration and autoramp creation after KYC approval
 * run in the VBA onboarding coordinator (`resolveVbaOnboarding`), not in
 * response to KycController state changes.
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
  // `trackKycAnalytics` lands with the @metamask/kyc-controller release that
  // adds it. The installed type does not include the option yet.
  const options = {
    messenger: controllerMessenger,
    state: persistedState.KycController,
    sumsubLauncher,
    trackKycAnalytics: {
      verificationOutcome: handleVerificationStatusChangedForMetrics,
      statusChanged: handleKycStatusChangedForMetrics,
    },
  };
  const controller = new KycController(options);

  return { controller };
};
