import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { saveOnboardingEvent as saveEvent } from '../../../../actions/onboarding';
import { ONBOARDING } from '../../../../constants/navigation';
import {
  AccountType,
  getSocialAccountType,
} from '../../../../constants/onboarding';
import {
  TraceName,
  endTrace,
  trace,
  TraceOperation,
  TraceContext,
  getTraceContext,
} from '../../../../util/trace';
import { useOnboardingLoadingStallTracker } from '../../../../util/onboarding/hooks/useOnboardingLoadingStallTracker';
import { ONBOARDING_LOADING_STALL_SCREEN } from '../../../../util/onboarding/onboardingLoadingStallTracking';

interface UsePasswordSetupTrackingInput {
  isLoading: boolean;
  provider?: string;
  previousScreen?: string;
}

/** Loading-stall tracking and the password-setup attempt trace for the screen. */
export const usePasswordSetupTracking = ({
  isLoading,
  provider,
  previousScreen,
}: UsePasswordSetupTrackingInput) => {
  const dispatch = useDispatch();
  const passwordSetupAttemptTraceCtx = useRef<TraceContext | null>(null);

  useOnboardingLoadingStallTracker({
    isLoading,
    screen: ONBOARDING_LOADING_STALL_SCREEN.CREATE_PASSWORD,
    properties: {
      wallet_setup_type: previousScreen === ONBOARDING ? 'new' : 'import',
      account_type: provider
        ? getSocialAccountType(provider, false)
        : AccountType.Metamask,
    },
    saveOnboardingEvent: (event) => {
      dispatch(saveEvent([event]));
    },
  });

  useEffect(() => {
    // perf_fix: trace-registry-v1 — fetch parent from trace registry instead of route params
    const journeyCtx = getTraceContext({
      name: TraceName.OnboardingJourneyOverall,
    });
    if (journeyCtx) {
      passwordSetupAttemptTraceCtx.current = trace({
        name: TraceName.OnboardingPasswordSetupAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: journeyCtx,
      });
    }

    return () => {
      if (passwordSetupAttemptTraceCtx.current) {
        endTrace({ name: TraceName.OnboardingPasswordSetupAttempt });
        passwordSetupAttemptTraceCtx.current = null;
      }
    };
  }, []);
};
