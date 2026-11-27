import {
  KycController,
  type KycControllerMessenger,
  type KycTraceCallback,
} from '@metamask/kyc-controller';
import type { MessengerClientInitFunction } from '../../types';
import {
  endTrace,
  getPerformanceTimestamp,
  trace,
  TraceName,
} from '../../../../util/trace';
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
  const traceProviderFlow: KycTraceCallback = (request, fn) => {
    const traceRequest = {
      name: TraceName.KycProviderFlow,
      data: request.data,
      id: request.id,
      startTime: request.startTime,
      tags: request.tags,
      op: request.op,
    };

    // The launch has already finished. Record it as its own transaction and
    // close it on the same performance clock as startTime.
    trace({ ...traceRequest, forceTransaction: true });
    endTrace({
      name: TraceName.KycProviderFlow,
      id: request.id,
      timestamp: getPerformanceTimestamp(),
    });
    fn?.();
  };
  const options = {
    messenger: controllerMessenger,
    state: persistedState.KycController,
    sumsubLauncher,
    trackKycAnalytics: {
      verificationOutcome: handleVerificationStatusChangedForMetrics,
      statusChanged: handleKycStatusChangedForMetrics,
    },
    trace: traceProviderFlow,
  };
  const controller = new KycController(options);

  return { controller };
};
